import {
  AMC_DOC_APPROVAL,
  buildAmcApprovalUpdateData,
  serializeAmcApprovalFields,
} from "../../Utils/amcApproval.js";
import { resolvePortalCompanyId } from "../../Utils/portalCompany.js";
import { toPublicFileUrl } from "../../Utils/publicUrl.js";
import { lightAmcRegionOf, lightAmcTable, serializeLightAmc } from "../../Model/DLE-Model/light-amc-model.js";
import {
  applyListPaginationToFindMany,
  buildListResponseMeta,
  resolveListPagination,
} from "../../Utils/portalListQuery.js";

const stateForRegion = (region) => {
  if (region === "up") return "Uttar Pradesh";
  return "Bihar";
};

const resolveLightAmcApprovalRegion = (req) => {
  if (req.lightAmcRegion === "up" || req.lightAmcRegion === "bihar") {
    return req.lightAmcRegion;
  }
  return (
    lightAmcRegionOf(req.query.region) ||
    lightAmcRegionOf(req.body?.region) ||
    lightAmcRegionOf(req.query.state) ||
    lightAmcRegionOf(req.body?.state) ||
    null
  );
};

const serializeLightAmcForApproval = (req, region, row) => {
  const base = serializeLightAmc(row);
  if (!base) return null;

  return {
    ...base,
    region,
    ...serializeAmcApprovalFields(row),
    image_1_url: toPublicFileUrl(req, row.image_1),
    image_2_url: toPublicFileUrl(req, row.image_2),
    image_3_url: toPublicFileUrl(req, row.image_3),
  };
};

export const getLightAmcsForApproval = async (req, res) => {
  try {
    const region = resolveLightAmcApprovalRegion(req);
    if (!region) {
      return res.status(422).json({
        success: false,
        message: "region is required (bihar or up).",
      });
    }

    const companyId = resolvePortalCompanyId(req);
    if (!companyId) {
      return res.status(422).json({
        success: false,
        message: "company_id is required.",
      });
    }

    const approvalStatusParam = req.query.approval_status;
    const scope = String(req.query.scope || "all").toLowerCase();
    const district = req.query.district?.trim();
    const block = req.query.block?.trim();
    const panchayat = req.query.panchayat?.trim();

    const pagination = resolveListPagination(req);

    const where = {
      company_id: companyId,
      state: stateForRegion(region),
    };

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
      where.user_id = userId;
    }

    if (district) where.district = district;
    if (block) where.block = block;
    if (panchayat) where.panchayat = panchayat;

    const table = lightAmcTable(region);
    const [total, rows] = await Promise.all([
      table.count({ where }),
      table.findMany(
        applyListPaginationToFindMany(
          {
            where,
            orderBy: [{ created_at: "desc" }, { id: "desc" }],
          },
          pagination
        )
      ),
    ]);

    return res.status(200).json({
      success: true,
      message: "Light AMC records for approval fetched successfully.",
      meta: buildListResponseMeta(req, pagination, total, {
        region,
        approval_status_filter:
          approvalStatusParam == null || approvalStatusParam === ""
            ? "all"
            : approvalStatusParam,
        scope,
      }),
      data: rows.map((row) => serializeLightAmcForApproval(req, region, row)),
    });
  } catch (error) {
    console.error("GET LIGHT AMC APPROVAL LIST ERROR:", error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to fetch Light AMC records for approval.",
    });
  }
};

export const updateLightAmcApprovalStatus = async (req, res) => {
  try {
    const region = resolveLightAmcApprovalRegion(req);
    if (!region) {
      return res.status(422).json({
        success: false,
        message: "region is required (bihar or up).",
      });
    }

    const { id, approval_status, approval_remarks, approval_by } = req.body;
    const companyId = resolvePortalCompanyId(req);

    if (!companyId) {
      return res.status(422).json({
        success: false,
        message: "company_id is required.",
      });
    }

    if (!id) {
      return res.status(422).json({
        success: false,
        message: "Record id is required.",
      });
    }

    if (
      Number(approval_status) === AMC_DOC_APPROVAL.REJECTED &&
      !approval_remarks?.trim()
    ) {
      return res.status(422).json({
        success: false,
        message: "Approval remarks are required when rejecting a record.",
      });
    }

    const table = lightAmcTable(region);
    const existing = await table.findUnique({
      where: { id: BigInt(id) },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Light AMC record not found.",
      });
    }

    if (String(existing.company_id || "").trim() !== companyId) {
      return res.status(403).json({
        success: false,
        message: "Record does not belong to this company.",
      });
    }

    if (String(existing.state || "").trim() !== stateForRegion(region)) {
      return res.status(403).json({
        success: false,
        message: "Record does not belong to this region.",
      });
    }

    const updateData = buildAmcApprovalUpdateData({
      approval_status,
      approval_remarks,
      approval_by,
    });

    const updated = await table.update({
      where: { id: BigInt(id) },
      data: updateData,
    });

    return res.status(200).json({
      success: true,
      message: "Light AMC approval updated successfully.",
      data: {
        id: updated.id?.toString?.() ?? String(updated.id),
        region,
        ...serializeAmcApprovalFields(updated),
      },
    });
  } catch (error) {
    console.error("UPDATE LIGHT AMC APPROVAL ERROR:", error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to update Light AMC approval.",
    });
  }
};
