import prisma from "../../Config/Prisma.js";
import {
  USER_ROLE_ADMIN,
  USER_ROLE_DEFAULT,
  USER_ROLE_DLE,
  USER_ROLE_VLE,
  VLE_TEAM_LIMIT,
} from "../../Utils/userRoles.js";

export const serializeUserRecord = (user) => {
  if (!user) return null;
  const { password, ...rest } = user;
  const out = { ...rest };
  if (out.id != null) out.id = out.id.toString();
  if (out.parent_user_id != null) out.parent_user_id = out.parent_user_id.toString();
  out.role = Number(out.role ?? USER_ROLE_DEFAULT);
  return out;
};

export const createUser = async (userData) => {
  const {
    company_id,
    state,
    district,
    block,
    panchayat,
    name,
    email,
    contact_no,
    emergency_contact_no,
    police_verification_validity,
    address,
    educational_document,
    aadhaar_voter_id,
    pan_card,
    driving_license,
    police_verification,
    cancelled_cheque,
    rent_agreement_electricity_bill,
  } = userData;

  const result = await prisma.user.create({
    data: {
      company_id: company_id ?? null,
      state: state ?? null,
      district: district ?? null,
      block: block ?? null,
      panchayat: panchayat ?? null,
      name: name ?? null,
      email: email ?? null,
      contact_no: contact_no ?? null,
      emergency_contact_no: emergency_contact_no ?? null,
      police_verification_validity:
        police_verification_validity ?? null,
      address: address ?? null,

      educational_document:
        educational_document ?? null,

      aadhaar_voter_id:
        aadhaar_voter_id ?? null,

      pan_card:
        pan_card ?? null,

      driving_license:
        driving_license ?? null,

      police_verification:
        police_verification ?? null,

      cancelled_cheque:
        cancelled_cheque ?? null,

      rent_agreement_electricity_bill:
        rent_agreement_electricity_bill ?? null,

      role: 2,
      status: 0,
    },
  });

  return result;
};


/** Users approved before approval_status existed: status=1 + password, approval_status still 0 */
export const syncLegacyApprovedUser = async (user) => {
  const approvalStatus = Number(user?.approval_status ?? 0);

  if (user?.status !== 1 || approvalStatus !== 0 || !user?.password) {
    return user;
  }

  return prisma.user.update({
    where: { id: user.id },
    data: {
      approval_status: 1,
      updated_at: new Date(),
    },
  });
};

export const syncAllLegacyApprovedUsers = async () => {
  const result = await prisma.user.updateMany({
    where: {
      status: 1,
      approval_status: 0,
      password: { not: null },
    },
    data: {
      approval_status: 1,
    },
  });

  return result.count;
};

export const findUserByEmail = async (email) => {
  const normalized = String(email || "").trim().toLowerCase();
  if (!normalized) return null;

  const user = await prisma.user.findFirst({
    where: {
      email: normalized,
    },
  });

  return user;
};


export const findUserById = async (id) => {
  const user = await prisma.user.findUnique({
    where: {
      id: BigInt(id),
    },
  });

  return user;
};


export const updateUserProfileImage = async (id, profileImage) => {
  const result = await prisma.user.update({
    where: {
      id: BigInt(id),
    },
    data: {
      profile_image: profileImage ?? null,
      updated_at: new Date(),
    },
  });

  return result;
};

export const updateUser = async (id, userData) => {
  const {
    company_id,
    state,
    district,
    block,
    panchayat,
    name,
    email,
    contact_no,
    emergency_contact_no,
    police_verification_validity,
    address,
  } = userData;

  const result = await prisma.user.update({
    where: {
      id: BigInt(id),
    },

    data: {
      company_id: company_id ?? null,
      state: state ?? null,
      district: district ?? null,
      block: block ?? null,
      panchayat: panchayat ?? null,
      name: name ?? null,
      email: email ?? null,
      contact_no: contact_no ?? null,
      emergency_contact_no:
        emergency_contact_no ?? null,
      police_verification_validity:
        police_verification_validity ?? null,
      address: address ?? null,
    },
  });

  return result;
};


/* =========================================================
   CHANGE PASSWORD
   Plain password will be stored
========================================================= */

export const updateUserPassword = async (
  id,
  password
) => {
  const result = await prisma.user.update({
    where: {
      id: BigInt(id),
    },

    data: {
      password: password,
    },
  });

  return result;
};


/* =========================================================
   GET USERS BY STATUS
   status -> 0: Pending, 1: Approved, 2: Rejected
========================================================= */

export const getPendingUsers = async () => {
  const users = await prisma.user.findMany({
    where: {
      approval_status: 0,
      status: 0,
    },

    orderBy: {
      created_at: "desc",
    },
  });

  return users;
};

export const getUsersByStatus = async (status) => {
  const statusNum = Number(status);

  const users = await prisma.user.findMany({
    where: {
      approval_status: statusNum,
    },

    orderBy: {
      created_at: "desc",
    },
  });

  return users;
};

export const getAllUsers = async () => {
  const users = await prisma.user.findMany({
    orderBy: {
      created_at: "desc",
    },
  });

  return users;
};

export const findUsersByCompanyId = async (companyId, { search } = {}) => {
  const cid = String(companyId || "").trim();
  if (!cid) return [];

  const where = {
    role: USER_ROLE_DLE,
    approval_status: 1,
    OR: [{ company_id: cid }, { company_id: null }, { company_id: "" }],
  };
  const q = String(search || "").trim();
  if (q) {
    where.AND = [
      {
        OR: [
          { name: { contains: q } },
          { email: { contains: q } },
          { contact_no: { contains: q } },
        ],
      },
    ];
  }

  return prisma.user.findMany({
    where,
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      email: true,
      contact_no: true,
      company_id: true,
      state: true,
      status: true,
      approval_status: true,
    },
  });
};


/* =========================================================
   UPDATE USER STATUS (Pending / Approved / Reject) + Remark
========================================================= */

export const updateUserStatus = async (id, status, remark) => {
  const statusNum = Number(status);
  const result = await prisma.user.update({
    where: {
      id: BigInt(id),
    },

    data: {
      status: statusNum === 1 ? 1 : 0,
      approval_status: statusNum,
      admin_remark: remark ?? null,
      approval_remarks: remark ?? null,
      updated_at: new Date(),
    },
  });

  return result;
};


/* =========================================================
   APPROVE USER
   Plain password will be stored
========================================================= */

export const approveUser = async (
  id,
  password
) => {
  const result = await prisma.user.update({
    where: {
      id: BigInt(id),
    },

    data: {
      password: password,
      status: 1,
      approval_status: 1,
      updated_at: new Date(),
    },
  });

  return result;
};

export const listUsersForMaster = async ({
  page = 1,
  limit = 25,
  search,
  company_id,
  approval_status,
  state,
  role,
} = {}) => {
  const where = {};
  const q = String(search || "").trim();
  if (q) {
    where.OR = [
      { name: { contains: q } },
      { email: { contains: q } },
      { contact_no: { contains: q } },
      { company_id: { contains: q } },
    ];
  }
  if (company_id) where.company_id = String(company_id).trim();
  const stateFilter = String(state || "").trim();
  if (stateFilter) {
    where.state = stateFilter;
  }
  if (approval_status !== undefined && approval_status !== "" && approval_status != null) {
    where.approval_status = Number(approval_status);
  }
  const take = Math.min(Math.max(Number(limit) || 25, 1), 100);
  const pageNum = Math.max(Number(page) || 1, 1);

  // Admins (role=1) are SQL-only — never shown in user master.
  if (role !== undefined && role !== "" && role != null && Number(role) === USER_ROLE_ADMIN) {
    return { total: 0, rows: [], page: pageNum, limit: take };
  }
  if (role !== undefined && role !== "" && role != null) {
    where.role = Number(role);
  } else {
    where.role = { not: USER_ROLE_ADMIN };
  }
  const skip = (pageNum - 1) * take;

  const [total, rows] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip,
      take,
    }),
  ]);

  return { total, rows, page: pageNum, limit: take };
};

const pickUserMasterFields = (body) => {
  const data = {};
  const assign = (key, transform = (v) => v) => {
    if (body[key] !== undefined) data[key] = transform(body[key]);
  };

  assign("company_id", (v) => (v === "" ? null : String(v).trim()));
  assign("state", (v) => (v === "" ? null : String(v).trim()));
  assign("district", (v) => (v === "" ? null : String(v).trim()));
  assign("block", (v) => (v === "" ? null : String(v).trim()));
  assign("panchayat", (v) => (v === "" ? null : String(v).trim()));
  assign("name", (v) => String(v || "").trim());
  assign("email", (v) => String(v || "").trim().toLowerCase());
  assign("contact_no", (v) => (v === "" ? null : String(v).trim()));
  assign("emergency_contact_no", (v) => (v === "" ? null : String(v).trim()));
  assign("police_verification_validity", (v) => (v === "" ? null : String(v).trim()));
  assign("address", (v) => (v === "" ? null : String(v).trim()));
  assign("educational_document", (v) => (v === "" ? null : v));
  assign("aadhaar_voter_id", (v) => (v === "" ? null : v));
  assign("pan_card", (v) => (v === "" ? null : v));
  assign("driving_license", (v) => (v === "" ? null : v));
  assign("police_verification", (v) => (v === "" ? null : v));
  assign("cancelled_cheque", (v) => (v === "" ? null : v));
  assign("rent_agreement_electricity_bill", (v) => (v === "" ? null : v));
  assign("profile_image", (v) => (v === "" ? null : v));
  assign("role", (v) => Number(v));
  assign("status", (v) => Number(v));
  assign("approval_status", (v) => Number(v));
  assign("approval_remarks", (v) => (v === "" ? null : String(v).trim()));
  assign("admin_remark", (v) => (v === "" ? null : String(v).trim()));

  return data;
};

export const adminCreateUser = async (body) => {
  const data = pickUserMasterFields(body);
  if (!data.name || !data.email) {
    const error = new Error("Name and email are required.");
    error.statusCode = 422;
    throw error;
  }

  const existing = await findUserByEmail(data.email);
  if (existing) {
    const error = new Error("Email already registered.");
    error.statusCode = 409;
    throw error;
  }

  data.role = USER_ROLE_DEFAULT;
  if (data.status == null || Number.isNaN(data.status)) data.status = 0;
  if (data.approval_status == null || Number.isNaN(data.approval_status)) {
    data.approval_status = 0;
  }

  const password = body.password ? String(body.password).trim() : null;

  return prisma.user.create({
    data: {
      ...data,
      password: password || null,
    },
  });
};

export const adminUpdateUser = async (id, body) => {
  const existing = await findUserById(id);
  if (!existing) {
    const error = new Error("User not found.");
    error.statusCode = 404;
    throw error;
  }
  if (Number(existing.role) === USER_ROLE_ADMIN) {
    const error = new Error("Admin users cannot be edited from user master.");
    error.statusCode = 403;
    throw error;
  }

  const data = pickUserMasterFields(body);
  delete data.role;
  delete data.company_id;
  if (data.email) {
    const existing = await findUserByEmail(data.email);
    if (existing && String(existing.id) !== String(id)) {
      const error = new Error("Email already used by another user.");
      error.statusCode = 409;
      throw error;
    }
  }

  if (body.password !== undefined && String(body.password).trim()) {
    data.password = String(body.password).trim();
  }

  data.updated_at = new Date();

  return prisma.user.update({
    where: { id: BigInt(id) },
    data,
  });
};

const vleTeamWhere = (parentId) => ({
  parent_user_id: BigInt(parentId),
  role: USER_ROLE_VLE,
});

export const countVlesForDle = async (parentId) =>
  prisma.user.count({
    where: {
      ...vleTeamWhere(parentId),
      approval_status: { not: 2 },
    },
  });

export const listVlesForDle = async (parentId) =>
  prisma.user.findMany({
    where: vleTeamWhere(parentId),
    orderBy: { id: "desc" },
  });

export const listAllVles = async () =>
  prisma.user.findMany({
    where: { role: USER_ROLE_VLE },
    orderBy: { id: "desc" },
  });

export const listDlesForAssignment = async () => {
  const [dles, counts] = await Promise.all([
    prisma.user.findMany({
      where: { role: USER_ROLE_DLE },
      select: { id: true, name: true, email: true, approval_status: true },
      orderBy: { name: "asc" },
    }),
    prisma.user.groupBy({
      by: ["parent_user_id"],
      where: {
        role: USER_ROLE_VLE,
        approval_status: { not: 2 },
        parent_user_id: { not: null },
      },
      _count: { _all: true },
    }),
  ]);
  const usedByParent = new Map(
    counts
      .filter((row) => row.parent_user_id != null)
      .map((row) => [row.parent_user_id.toString(), row._count._all])
  );
  return dles.map((dle) => ({
    id: dle.id.toString(),
    name: dle.name,
    email: dle.email,
    approval_status: Number(dle.approval_status ?? 0),
    used: usedByParent.get(dle.id.toString()) || 0,
    limit: VLE_TEAM_LIMIT,
  }));
};

export const moveVleToDle = async (vle, dle) => {
  if (String(vle.parent_user_id) === String(dle.id)) return vle;
  const used = await countVlesForDle(dle.id);
  if (used >= VLE_TEAM_LIMIT) {
    fail(422, "This DLE already has 5 VLEs.");
  }
  return prisma.user.update({
    where: { id: vle.id },
    data: {
      parent_user_id: dle.id,
      company_id: dle.company_id ?? null,
      state: dle.state ?? null,
      district: dle.district ?? null,
      block: dle.block ?? null,
      panchayat: dle.panchayat ?? null,
      updated_at: new Date(),
    },
  });
};

export const findUserNamesByIds = async (ids) => {
  const unique = [
    ...new Set(
      (ids || [])
        .filter((id) => id != null && String(id).trim() !== "")
        .map((id) => String(id))
    ),
  ];
  if (!unique.length) return new Map();
  const rows = await prisma.user.findMany({
    where: { id: { in: unique.map((id) => BigInt(id)) } },
    select: { id: true, name: true },
  });
  return new Map(rows.map((row) => [row.id.toString(), row.name]));
};

const fail = (statusCode, message) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  throw error;
};

export const createVleForDle = async (dle, body) => {
  const name = String(body.name || "").trim();
  const email = String(body.email || "").trim().toLowerCase();
  const contactNo = String(body.contact_no || "").trim();
  const password = String(body.password || "").trim();

  if (!name || !email || !contactNo || !password) {
    fail(422, "Name, email, contact number, and password are required.");
  }
  if (contactNo.length > 20) {
    fail(422, "Contact number must be 20 characters or fewer.");
  }

  const existing = await findUserByEmail(email);
  if (existing) fail(409, "Email already registered.");

  const parentId = dle.id;
  const used = await countVlesForDle(parentId);
  if (used >= VLE_TEAM_LIMIT) {
    fail(422, "A DLE can add up to 5 VLEs.");
  }

  return prisma.$transaction(async (tx) => {
    const current = await tx.user.count({
      where: {
        ...vleTeamWhere(parentId),
        approval_status: { not: 2 },
      },
    });
    if (current >= VLE_TEAM_LIMIT) {
      fail(422, "A DLE can add up to 5 VLEs.");
    }

    return tx.user.create({
      data: {
        name,
        email,
        contact_no: contactNo,
        password,
        company_id: dle.company_id ?? null,
        state: dle.state ?? null,
        district: dle.district ?? null,
        block: dle.block ?? null,
        panchayat: dle.panchayat ?? null,
        role: USER_ROLE_VLE,
        parent_user_id: parentId,
        status: 1,
        approval_status: 1,
      },
    });
  });
};

export const updateVleForDle = async (dle, vleId, body, { anyTeam = false } = {}) => {
  const existing = await findUserById(vleId);
  if (!existing || Number(existing.role) !== USER_ROLE_VLE) {
    fail(404, "VLE not found.");
  }
  if (!anyTeam && String(existing.parent_user_id) !== String(dle.id)) {
    fail(404, "VLE not found on your team.");
  }

  const data = { updated_at: new Date() };
  if (body.name !== undefined) {
    const name = String(body.name || "").trim();
    if (!name) fail(422, "Name is required.");
    data.name = name;
  }
  if (body.email !== undefined) {
    const email = String(body.email || "").trim().toLowerCase();
    if (!email) fail(422, "Email is required.");
    const taken = await findUserByEmail(email);
    if (taken && String(taken.id) !== String(existing.id)) {
      fail(409, "Email already registered.");
    }
    data.email = email;
  }
  if (body.contact_no !== undefined) {
    const contactNo = String(body.contact_no || "").trim();
    if (!contactNo) fail(422, "Contact number is required.");
    if (contactNo.length > 20) {
      fail(422, "Contact number must be 20 characters or fewer.");
    }
    data.contact_no = contactNo;
  }
  if (body.password !== undefined && String(body.password).trim()) {
    data.password = String(body.password).trim();
  }

  return prisma.user.update({
    where: { id: existing.id },
    data,
  });
};