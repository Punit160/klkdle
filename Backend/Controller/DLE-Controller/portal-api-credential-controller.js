import {
  createPortalApiCredential,
  deletePortalApiCredential,
  listPortalApiCredentialsByCompany,
  rotatePortalApiCredentialSecret,
  updatePortalApiCredential,
} from "../../Model/DLE-Model/portal-api-credential-model.js";
import { resolvePortalAccessActor } from "./portal-rbac-controller.js";

export const listPortalApiCredentialsController = async (req, res) => {
  try {
    const { companyId } = await resolvePortalAccessActor(req, { allowApiCredentials: true });
    const data = await listPortalApiCredentialsByCompany(companyId);
    return res.json({ success: true, data });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to list API credentials.",
    });
  }
};

export const createPortalApiCredentialController = async (req, res) => {
  try {
    const { companyId } = await resolvePortalAccessActor(req, { allowApiCredentials: true });
    const { label, secret, scopes } = req.body;

    if (!secret || String(secret).trim().length < 8) {
      return res.status(422).json({
        success: false,
        message: "API secret (password) is required and must be at least 8 characters.",
      });
    }

    const created = await createPortalApiCredential({
      companyId,
      label,
      secret: String(secret).trim(),
      scopes,
    });

    return res.status(201).json({
      success: true,
      message: "API credential created. Copy the secret now — it will not be shown again.",
      data: created,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to create API credential.",
    });
  }
};

export const updatePortalApiCredentialController = async (req, res) => {
  try {
    const { companyId } = await resolvePortalAccessActor(req, { allowApiCredentials: true });
    const updated = await updatePortalApiCredential(req.params.id, companyId, req.body);
    if (!updated) {
      return res.status(404).json({ success: false, message: "Credential not found." });
    }
    return res.json({ success: true, message: "Credential updated.", data: updated });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to update credential.",
    });
  }
};

export const rotatePortalApiCredentialSecretController = async (req, res) => {
  try {
    const { companyId } = await resolvePortalAccessActor(req, { allowApiCredentials: true });
    const { secret } = req.body;
    if (!secret || String(secret).trim().length < 8) {
      return res.status(422).json({
        success: false,
        message: "New secret must be at least 8 characters.",
      });
    }
    const result = await rotatePortalApiCredentialSecret(
      req.params.id,
      companyId,
      String(secret).trim()
    );
    if (!result) {
      return res.status(404).json({ success: false, message: "Credential not found." });
    }
    return res.json({
      success: true,
      message: "Secret updated. Share the new password with the external portal.",
      data: result,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to rotate secret.",
    });
  }
};

export const deletePortalApiCredentialController = async (req, res) => {
  try {
    const { companyId } = await resolvePortalAccessActor(req, { allowApiCredentials: true });
    const ok = await deletePortalApiCredential(req.params.id, companyId);
    if (!ok) {
      return res.status(404).json({ success: false, message: "Credential not found." });
    }
    return res.json({ success: true, message: "Credential deleted." });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to delete credential.",
    });
  }
};
