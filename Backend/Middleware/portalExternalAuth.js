import { findActivePortalApiCredentialByKey } from "../Model/DLE-Model/portal-api-credential-model.js";

import { comparePassword } from "../Utils/password.js";

import {

  hasBearerAuth,

  readPortalApiCredentialsFromRequest,

  resolveCompanyId,

} from "../Utils/portalCompany.js";

import { credentialAllowsScope } from "../Utils/portalApiCatalog.js";
import { requirePortalPermission } from "./requirePortalPermission.js";



const legacyCompanyIdAllowed = () => process.env.PORTAL_LEGACY_COMPANY_ID === "true";



/**

 * External portal: API key + secret → company_id + scopes.

 * Optional legacy: company_id query only when PORTAL_LEGACY_COMPANY_ID=true.

 */

export const portalExternalAuth = async (req, res, next) => {

  try {

    if (hasBearerAuth(req)) {

      req.portalAuthMode = "jwt";

      return next();

    }



    const { apiKey, apiSecret } = readPortalApiCredentialsFromRequest(req);



    if (apiKey && apiSecret) {

      const record = await findActivePortalApiCredentialByKey(apiKey);

      if (!record) {

        return res.status(401).json({

          success: false,

          message: "Invalid portal API key.",

        });

      }



      const valid = await comparePassword(apiSecret, record.secret_hash);

      if (!valid) {

        return res.status(401).json({

          success: false,

          message: "Invalid portal API secret.",

        });

      }



      req.portalAuthMode = "api_key";

      req.portalCompanyId = String(record.company_id).trim();

      req.portalApiScopes = Array.isArray(record.scopes) ? record.scopes : [];

      req.portalApiCredentialId = record.id?.toString?.() ?? String(record.id);

      return next();

    }



    if (legacyCompanyIdAllowed()) {

      const companyId = resolveCompanyId(req);

      if (companyId) {

        req.portalAuthMode = "legacy_company_id";

        req.portalCompanyId = companyId;

        req.portalApiScopes = ["all"];

        return next();

      }

    }



    return res.status(401).json({

      success: false,

      message:

        "Portal API key and secret are required (headers X-Portal-Api-Key and X-Portal-Api-Secret).",

    });

  } catch (error) {

    console.error("PORTAL EXTERNAL AUTH ERROR:", error);

    return res.status(500).json({

      success: false,

      message: error.message || "Portal authentication failed.",

    });

  }

};



export const requirePortalApiScope = (scope) => (req, res, next) => {

  if (req.portalAuthMode === "jwt") {

    return next();

  }



  const scopes = req.portalApiScopes || [];

  if (!credentialAllowsScope(scopes, scope)) {

    return res.status(403).json({

      success: false,

      message: `This API credential does not allow "${scope}" access.`,

    });

  }



  return next();

};



/** Approve endpoints — external portal credentials only (not DLE JWT roles). */

export const requireExternalApproveApi = (req, res, next) => {

  if (req.portalAuthMode === "jwt") {

    return res.status(403).json({

      success: false,

      message: "Approval is done via the external portal using API key and secret.",

    });

  }



  return requirePortalApiScope("approve")(req, res, next);

};



export const requirePortalJwtOrApiScope = (jwtPermissionKey, apiScope = "read") => [

  portalExternalAuth,

  (req, res, next) => {

    if (req.portalAuthMode === "jwt") {

      return requirePortalPermission(jwtPermissionKey)(req, res, next);

    }

    return requirePortalApiScope(apiScope)(req, res, next);

  },

];


