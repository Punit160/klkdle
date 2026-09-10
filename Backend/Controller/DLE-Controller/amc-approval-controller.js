import prisma from "../../Config/Prisma.js";
import {
  AMC_DOC_APPROVAL,
  buildAmcApprovalUpdateData,
  serializeAmcApprovalFields,
} from "../../Utils/amcApproval.js";

const getUploadModel = (region) => {
  if (region === "up") {
    return prisma.upSslAmcUploadDocument;
  }

  return prisma.biharSslAmcUploadDocument;
};

export const updateAmcApprovalStatus =
  (region = "bihar") =>
  async (req, res) => {
    try {
      const { id, approval_status, approval_remarks, approval_by } = req.body;

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

      const model = getUploadModel(region);
      const existing = await model.findUnique({
        where: { id: BigInt(id) },
      });

      if (!existing) {
        return res.status(404).json({
          success: false,
          message: "AMC document not found.",
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
