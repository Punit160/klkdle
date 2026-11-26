import {
  countVlesForDle,
  createVleForDle,
  findUserById,
  findUserNamesByIds,
  listAllVles,
  listDlesForAssignment,
  listVlesForDle,
  moveVleToDle,
  serializeUserRecord,
  updateVleForDle,
} from "../../Model/DLE-Model/dle-user-model.js";
import { isDleUser, isUserMasterAdmin, USER_ROLE_VLE, VLE_TEAM_LIMIT } from "../../Utils/userRoles.js";

const httpError = (statusCode, message) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const loadActor = async (req) => {
  const actor = await findUserById(req.user?.id);
  if (!actor) throw httpError(401, "Authorization token required");
  if (isUserMasterAdmin(actor) || isDleUser(actor)) return actor;
  throw httpError(403, "You do not have access to add a VLE.");
};

const resolveAssignedDle = async (actor, body, { required }) => {
  if (!isUserMasterAdmin(actor)) return actor;
  const dleId = body?.dle_id || body?.parent_user_id;
  if (!dleId) {
    if (!required) return null;
    throw httpError(422, "Select the DLE this VLE belongs to.");
  }
  const dle = await findUserById(dleId);
  if (!dle || !isDleUser(dle)) {
    throw httpError(422, "Select a DLE for this VLE.");
  }
  return dle;
};

const withParentNames = async (rows) => {
  const names = await findUserNamesByIds(rows.map((row) => row.parent_user_id));
  return rows.map((row) => ({
    ...serializeUserRecord(row),
    parent_name: names.get(String(row.parent_user_id || "")) || "",
  }));
};

export const listMyVles = async (req, res) => {
  try {
    const actor = await loadActor(req);
    if (isUserMasterAdmin(actor)) {
      const [rows, dles] = await Promise.all([listAllVles(), listDlesForAssignment()]);
      return res.json({
        success: true,
        data: {
          admin: true,
          limit: VLE_TEAM_LIMIT,
          vles: await withParentNames(rows),
          dles,
        },
      });
    }

    const [rows, used] = await Promise.all([
      listVlesForDle(actor.id),
      countVlesForDle(actor.id),
    ]);
    return res.json({
      success: true,
      data: {
        admin: false,
        limit: VLE_TEAM_LIMIT,
        used,
        vles: rows.map((row) => serializeUserRecord(row)),
      },
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to load VLEs.",
    });
  }
};

export const createMyVle = async (req, res) => {
  try {
    const actor = await loadActor(req);
    const dle = await resolveAssignedDle(actor, req.body || {}, { required: true });
    const vle = await createVleForDle(dle, req.body || {});
    const teamLabel = isUserMasterAdmin(actor) ? `${dle.name}'s team` : "your team";
    return res.status(201).json({
      success: true,
      message: `VLE added to ${teamLabel}. They can log in with this email and password, and they use the same portal access as that DLE.`,
      data: {
        ...serializeUserRecord(vle),
        parent_name: dle.name,
      },
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to add VLE.",
    });
  }
};

export const updateMyVle = async (req, res) => {
  try {
    const actor = await loadActor(req);
    const admin = isUserMasterAdmin(actor);
    let movedTo = null;
    if (admin) {
      const existing = await findUserById(req.params.id);
      if (!existing || Number(existing.role) !== USER_ROLE_VLE) {
        throw httpError(404, "VLE not found.");
      }
      const nextDle = await resolveAssignedDle(actor, req.body || {}, { required: false });
      if (nextDle && String(nextDle.id) !== String(existing.parent_user_id)) {
        await moveVleToDle(existing, nextDle);
        movedTo = nextDle;
      }
    }

    const vle = await updateVleForDle(actor, req.params.id, req.body || {}, { anyTeam: admin });
    return res.json({
      success: true,
      message: movedTo ? `VLE moved to ${movedTo.name}'s team.` : "VLE updated.",
      data: {
        ...serializeUserRecord(vle),
        parent_name: movedTo?.name || "",
      },
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to update VLE.",
    });
  }
};
