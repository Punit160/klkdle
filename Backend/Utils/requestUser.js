export const resolveRequestUserId = (req) => {
  const id = req.user?.id ?? req.query?.user_id ?? req.body?.user_id;
  if (id == null || id === "") return null;
  return String(id);
};

export const buildCreatedByDocumentWhere = (userId) => {
  if (!userId) return {};

  try {
    const uid = BigInt(userId);
    return {
      OR: [
        { created_by: String(userId) },
        { uploadDocuments: { some: { created_by: uid } } },
      ],
    };
  } catch {
    return { created_by: String(userId) };
  }
};

export const buildCreatedByUploadInclude = (userId) => {
  if (!userId) return true;

  try {
    return { where: { created_by: BigInt(userId) } };
  } catch {
    return { where: { created_by: BigInt(0) } };
  }
};

export const matchesCreatedByUser = (userId, ...values) => {
  if (!userId) return true;
  const target = String(userId);
  return values.some((value) => value != null && String(value) === target);
};
