import prisma from "../../Config/Prisma.js";

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

      status: 0,
    },
  });

  return result;
};


export const findUserByEmail = async (email) => {
  const user = await prisma.user.findFirst({
    where: {
      email,
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
      status: 0,
    },

    orderBy: {
      created_at: "desc",
    },
  });

  return users;
};

export const getUsersByStatus = async (status) => {
  const users = await prisma.user.findMany({
    where: {
      status,
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


/* =========================================================
   UPDATE USER STATUS (Pending / Approved / Reject) + Remark
========================================================= */

export const updateUserStatus = async (id, status, remark) => {
  const result = await prisma.user.update({
    where: {
      id: BigInt(id),
    },

    data: {
      status: status,
      admin_remark: remark ?? null,
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
    },
  });

  return result;
};