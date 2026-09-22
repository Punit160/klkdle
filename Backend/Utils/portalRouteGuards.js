import { optionalProtect } from "../Middleware/authmiddleware.js";
import {
  loadPortalPermissions,
  requirePortalPermission,
} from "../Middleware/requirePortalPermission.js";

export const withPortalPermission = (permissionKey) => [
  optionalProtect,
  loadPortalPermissions,
  requirePortalPermission(permissionKey),
];
