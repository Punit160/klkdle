export const AMC_DOC_APPROVAL = {
  PENDING: 0,
  APPROVED: 1,
  REJECTED: 2,
};

export const serializeAmcApprovalFields = (upload = {}) => ({
  approval_status: upload.approval_status ?? AMC_DOC_APPROVAL.PENDING,
  approval_date: upload.approval_date ?? null,
  approval_remarks: upload.approval_remarks ?? null,
  approval_by: upload.approval_by ?? null,
});

export const buildAmcApprovalUpdateData = ({
  approval_status,
  approval_remarks,
  approval_by,
}) => {
  const status = Number(approval_status);

  if (
    ![
      AMC_DOC_APPROVAL.PENDING,
      AMC_DOC_APPROVAL.APPROVED,
      AMC_DOC_APPROVAL.REJECTED,
    ].includes(status)
  ) {
    const error = new Error(
      "Invalid approval_status. Use 0 (pending), 1 (approved), or 2 (rejected)."
    );
    error.statusCode = 422;
    throw error;
  }

  const data = {
    approval_status: status,
    approval_remarks: approval_remarks?.trim() || null,
    approval_by: approval_by ? String(approval_by).trim() : null,
    updated_at: new Date(),
  };

  if (
    status === AMC_DOC_APPROVAL.APPROVED ||
    status === AMC_DOC_APPROVAL.REJECTED
  ) {
    data.approval_date = new Date();
  } else {
    data.approval_date = null;
  }

  return data;
};
