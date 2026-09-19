import prisma from "../../Config/Prisma.js";
import {
  AMC_DOC_APPROVAL,
  buildAmcApprovalUpdateData,
  serializeAmcApprovalFields,
} from "../../Utils/amcApproval.js";
import { toPublicFileUrl } from "../../Utils/publicUrl.js";
import { resolveCompanyId } from "../../Utils/portalCompany.js";

const REGION_CONFIG = {
  bihar: {
    uploadModel: () => prisma.biharSslAmcUploadDocument,
    parentRelation: "biharSslAmc",
    parentIdField: "bihar_ssl_amc_id",
  },
  up: {
    uploadModel: () => prisma.upSslAmcUploadDocument,
    parentRelation: "upSslAmc",
    parentIdField: "up_ssl_amc_id",
  },
};

const getRegionConfig = (region) => {
  const key = region === "up" ? "up" : "bihar";
  return REGION_CONFIG[key];
};

const parseJsonArray = (value) => {
  if (value == null || value === "") return [];
  if (Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [String(parsed)];
  } catch {
    return String(value)
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean);
  }
};

const serializeUploadForApproval = (req, region, upload, parent) => {
  const config = getRegionConfig(region);
  const row = {
    id: upload.id?.toString?.() ?? String(upload.id),
    region,
    company_id: upload.company_id,
    [config.parentIdField]: upload[config.parentIdField]?.toString?.() ?? null,
    state: parent?.state ?? null,
    district: parent?.district ?? null,
    block: parent?.block ?? null,
    panchayat: parent?.panchayat ?? null,
    ssl_id: parseJsonArray(upload.ssl_id),
    start_month_year: upload.start_month_year,
    end_month_year: upload.end_month_year ?? null,
    remarks: upload.remarks ?? null,
    amc_document: upload.amc_document ?? null,
    amc_doc_status: upload.amc_doc_status ?? 0,
    invoice_document: upload.invoice_document ?? null,
    invoice_status: upload.invoice_status ?? 0,
    validation_status: upload.validation_status ?? "pending",
    ...serializeAmcApprovalFields(upload),
    created_by: upload.created_by?.toString?.() ?? null,
    created_at: upload.created_at ?? null,
    updated_at: upload.updated_at ?? null,
    amc_document_url: toPublicFileUrl(req, upload.amc_document),
    invoice_document_url: toPublicFileUrl(req, upload.invoice_document),
  };

  if (region === "bihar") {
    row.pole_no = parseJsonArray(upload.pole_no);
    row.pending_ssl_id = parseJsonArray(upload.pending_ssl_id);
    row.pending_pole_no = parseJsonArray(upload.pending_pole_no);
  } else {
    row.unique_id = parseJsonArray(upload.unique_id);
  }

  return row;
};

export const getAmcDocumentsForApproval =
  (region = "bihar") =>
  async (req, res) => {
    try {
      const config = getRegionConfig(region);
      const model = config.uploadModel();

      const approvalStatusParam = req.query.approval_status;
      const scope = String(req.query.scope || "all").toLowerCase();
      const companyId = resolveCompanyId(req);
      const district = req.query.district?.trim();
      const block = req.query.block?.trim();
      const panchayat = req.query.panchayat?.trim();

      if (!companyId) {
        return res.status(422).json({
          success: false,
          message: "company_id is required.",
        });
      }

      const page = Math.max(1, Number(req.query.page) || 1);
      const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
      const skip = (page - 1) * limit;

      const where = { company_id: companyId };

      if (
        approvalStatusParam != null &&
        approvalStatusParam !== "" &&
        String(approvalStatusParam).toLowerCase() !== "all"
      ) {
        where.approval_status = Number(approvalStatusParam);
      }

      if (scope === "mine") {
        const userId = String(req.query.user_id ?? "").trim();
        if (!userId || !/^\d+$/.test(userId)) {
          return res.status(422).json({
            success: false,
            message: "user_id is required when scope=mine.",
          });
        }
        where.created_by = BigInt(userId);
      }

      const parentWhere = {};
      if (district) parentWhere.district = district;
      if (block) parentWhere.block = block;
      if (panchayat) parentWhere.panchayat = panchayat;

      if (Object.keys(parentWhere).length > 0) {
        where[config.parentRelation] = { is: parentWhere };
      }

      const include = { [config.parentRelation]: true };

      const [total, uploads] = await Promise.all([
        model.count({ where }),
        model.findMany({
          where,
          include,
          orderBy: [{ created_at: "desc" }, { id: "desc" }],
          skip,
          take: limit,
        }),
      ]);

      const data = uploads.map((upload) => {
        const parent = upload[config.parentRelation];
        return serializeUploadForApproval(req, region, upload, parent);
      });

      return res.status(200).json({
        success: true,
        message: "AMC documents for approval fetched successfully.",
        meta: {
          region,
          page,
          limit,
          total,
          total_pages: Math.ceil(total / limit) || 0,
          approval_status_filter:
            approvalStatusParam == null || approvalStatusParam === ""
              ? "all"
              : approvalStatusParam,
          scope,
        },
        data,
      });
    } catch (error) {
      console.error(`GET ${region.toUpperCase()} AMC APPROVAL LIST ERROR:`, error);

      return res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || "Failed to fetch AMC documents for approval.",
      });
    }
  };

export const updateAmcApprovalStatus =
  (region = "bihar") =>
  async (req, res) => {
    try {
      const { id, approval_status, approval_remarks, approval_by } = req.body;
      const companyId = resolveCompanyId(req);

      if (!companyId) {
        return res.status(422).json({
          success: false,
          message: "company_id is required.",
        });
      }

      if (!id) {
        return res.status(422).json({
          success: false,
          message: "Document id is required.",
        });
      }

      if (
        Number(approval_status) === AMC_DOC_APPROVAL.REJECTED &&
        !approval_remarks?.trim()
      ) {
        return res.status(422).json({
          success: false,
          message: "Approval remarks are required when rejecting a document.",
        });
      }

      const model = getRegionConfig(region).uploadModel();
      const existing = await model.findUnique({
        where: { id: BigInt(id) },
      });

      if (!existing) {
        return res.status(404).json({
          success: false,
          message: "AMC document not found.",
        });
      }

      if (String(existing.company_id || "").trim() !== companyId) {
        return res.status(403).json({
          success: false,
          message: "Document does not belong to this company.",
        });
      }

      const updateData = buildAmcApprovalUpdateData({
        approval_status,
        approval_remarks,
        approval_by,
      });

      const updated = await model.update({
        where: { id: BigInt(id) },
        data: updateData,
      });

      return res.status(200).json({
        success: true,
        message: "AMC document approval updated successfully.",
        data: {
          id: updated.id?.toString?.() ?? String(updated.id),
          region,
          ...serializeAmcApprovalFields(updated),
        },
      });
    } catch (error) {
      console.error(`UPDATE ${region.toUpperCase()} AMC APPROVAL ERROR:`, error);

      return res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || "Failed to update AMC document approval.",
      });
    }
  };
