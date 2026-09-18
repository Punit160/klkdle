# Object storage (Cloudflare R2)

KLK DLE stores **legacy** uploads on the app server (`UPLOADS_DIR` or `Backend/uploads`). **New modules** should store files in **Cloudflare R2** instead of the VM disk so deploys and `git pull` never delete user data.

## R2 bucket

| Setting | Value |
|--------|--------|
| Bucket name | `klkdle` |
| S3 API endpoint | `https://deccda3a875734729fe2a4c0effb7f63.r2.cloudflarestorage.com` |
| Public URL (browser) | `https://pub-21d2019fecbe4a96a88c93b2f091317a.r2.dev` |

### Bucket access vs “folders”

- **One bucket:** `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` should have **Object Read & Write on bucket `klkdle`** — not per-folder. R2 does not support folder-level API tokens.
- **Folders in the dashboard** (`biharsslamcdoc`, `upsslamcdoc`, etc.) are **labels for object keys**. The real path is the **object key**, e.g. `biharsslamcdoc/1734-file.pdf` inside bucket `klkdle`.
- You do **not** need to pre-create folders; the first upload creates that prefix. Pre-creating folders in Cloudflare is optional for your own organization.
- The app does **not** lock you to only those names: defaults below are conventions. Rename in `.env` if your bucket uses different prefix names (see optional `R2_PREFIX_*` vars).

Optional overrides (same bucket, different key prefix strings):

```env
# R2_PREFIX_BIHAR_AMC_DOC=biharsslamcdoc
# R2_PREFIX_BIHAR_AMC_INVOICE=biharsslamcinvoice
# R2_PREFIX_UP_AMC_DOC=upsslamcdoc
# R2_PREFIX_UP_AMC_INVOICE=upsslamcinvoice
```

Example object keys (bucket **`klkdle`**, folder = key prefix):

| Module | R2 key prefix | DB value example |
|--------|----------------|------------------|
| Bihar SSL AMC PDF/photos | `biharsslamcdoc/` | `r2:biharsslamcdoc/1734-….pdf` |
| Bihar SSL AMC invoice | `biharsslamcinvoice/` | `r2:biharsslamcinvoice/1734-….pdf` |
| UP SSL AMC PDF/photos | `upsslamcdoc/` | `r2:upsslamcdoc/1734-….pdf` |
| UP SSL AMC invoice | `upsslamcinvoice/` | `r2:upsslamcinvoice/1734-….pdf` |
| Bihar ULA (per survey) | `biharula/{ca_no}/` (flat) | `r2:biharula/1029384756/panel_one_img.jpg` |
| New modules (generic) | `{module}/{subfolder}/` | `r2:my-module/proof/….jpg` |

Full object path in R2: `klkdle` bucket → key `biharsslamcdoc/1734567890123-987654321.pdf` (same as `klkdle/biharsslamcdoc/…` in the dashboard).

## Environment variables (Backend)

Add to `Backend/.env` on live and local when testing R2:

```env
# One switch for every module that uses R2 (default 1). Set 0 only for all-local dev.
R2_UPLOADS_ENABLED=1

R2_BUCKET=klkdle
R2_ENDPOINT=https://deccda3a875734729fe2a4c0effb7f63.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=

# Public URL for browsers (custom domain on the bucket or R2 public access URL)
# Required for displaying r2:... values in the portal
R2_PUBLIC_BASE_URL=https://pub-21d2019fecbe4a96a88c93b2f091317a.r2.dev
```

Create R2 API tokens in Cloudflare dashboard (Object Read & Write on bucket `klkdle`). **Do not commit** access keys.

### Public access

- **S3 API (uploads):** `*.r2.cloudflarestorage.com`
- **Public Development URL (browser):** `https://pub-21d2019fecbe4a96a88c93b2f091317a.r2.dev`

Example: DB value `r2:biharsslamcdoc/file.pdf` →  
`https://pub-21d2019fecbe4a96a88c93b2f091317a.r2.dev/biharsslamcdoc/file.pdf`

Enable public access on bucket `klkdle` in Cloudflare so this URL serves objects. Override with a custom domain later via `R2_PUBLIC_BASE_URL`.

## What we store in the database

| Format | Meaning | Example |
|--------|---------|---------|
| `/uploads/...` | Legacy local file (existing modules) | `/uploads/light-amc/123.jpg` |
| `r2:{objectKey}` | R2 object (new modules) | `r2:attendance/proof/123.jpg` |
| `https://...` | Full public URL (optional) | Saved as-is |

API responses should expose a resolved URL via `toPublicFileUrl(req, storedValue)` (backend) or `resolveUploadUrl(storedValue)` (frontend).

## Adding a new module (many folders over time)

You do **not** add a new env flag per module.

1. **Register the folder name** in `Backend/Utils/r2ObjectPrefixes.js` (add a key + default prefix string).
2. **Wire the route** with `objectUploadFields` + `persistModuleUpload` (see Bihar/UP AMC middleware).
3. **Save** `file.storedPath` in the DB as `r2:yourprefix/filename`.

Same bucket `klkdle`, same `R2_ACCESS_KEY_ID` / token — only the **object key prefix** changes per module.

Optional: override a prefix without code change via `R2_PREFIX_*` in `.env` (see table at top of this doc).

## New module upload pattern (Node)

```javascript
import { objectUploadFields } from "../../Middleware/objectUploadMiddleware.js";
import { persistModuleUpload } from "../../Utils/amcObjectStorage.js";
import { R2_PREFIX } from "../../Utils/r2ObjectPrefixes.js";

router.post(
  "/store",
  objectUploadFields([
    { name: "proof_document", maxCount: 1, prefix: R2_PREFIX.MY_MODULE },
  ]),
  async (req, res, next) => {
    /* persist files — or copy pattern from biharAmcUploadMiddleware.js */
    next();
  },
  myController
);
```

In the controller: `file.storedPath` → `r2:yourprefix/…`

## Frontend

Set in `Frontend/.env`:

```env
VITE_R2_PUBLIC_BASE_URL=https://pub-21d2019fecbe4a96a88c93b2f091317a.r2.dev
```

`resolveUploadUrl()` resolves:

- `https://...` unchanged
- `r2:...` → `VITE_R2_PUBLIC_BASE_URL/{key}`
- `/uploads/...` → app API base + path (unchanged)

## Bihar SSL AMC (R2 when configured)

`POST /api/bihar/amc/store` and `/update` use `biharAmcUpload` middleware:

- AMC files → **`biharsslamcdoc/`**
- Invoice → **`biharsslamcinvoice/`**

Uses global `R2_UPLOADS_ENABLED=1` and prefixes in `r2ObjectPrefixes.js`.

## UP SSL AMC (R2 when configured)

`POST /api/up/amc/create`, `/store`, and `/update` use `upAmcUpload` middleware:

- AMC files → **`upsslamcdoc/`**
- Invoice → **`upsslamcinvoice/`**

## Legacy modules (local disk)

These still use **local disk** and `UploadMiddleware.js` until migrated:
- User registration KYC files
- Profile image
- Light AMC photos

Migrating them to R2 is a separate backfill task (copy objects + update DB paths).

## Troubleshooting (AMC not appearing in R2)

1. **Check server config** (no secrets returned):

   ```http
   GET https://your-api-host/api/health/storage
   ```

   `r2.configured` must be `true` and `access_key_id_set` / `secret_access_key_set` must be `true`.

2. **On the live VM**, add to `Backend/.env` (then `pm2 restart`):

   ```env
   R2_ACCESS_KEY_ID=...
   R2_SECRET_ACCESS_KEY=...
   R2_BUCKET=klkdle
   R2_ENDPOINT=https://deccda3a875734729fe2a4c0effb7f63.r2.cloudflarestorage.com
   R2_UPLOADS_ENABLED=1
   ```

   PM2 must load env from `Backend/.env` (the app loads that file explicitly on startup).

3. **Test upload from server**:

   ```bash
   cd Backend && node scripts/test-r2-upload.js
   ```

4. **After a successful AMC submit**, DB `amc_document` should start with `r2:biharsslamcdoc/` or `r2:upsslamcdoc/`. If it still shows `/uploads/...`, R2 was not active for that request.

5. If upload returns **503** with a message about missing credentials, R2 keys are not loaded — fix env and restart.

## Live server checklist

1. Create R2 bucket `klkdle` and API token.
2. Set `R2_*` and `R2_PUBLIC_BASE_URL` in PM2 env / `Backend/.env`.
3. `R2_UPLOADS_ENABLED=1` (default) for all R2-backed routes.
4. Keep `UPLOADS_DIR=/var/www/klkdle-data/uploads` for legacy paths until migrated.
5. `npm install` in `Backend` (includes `@aws-sdk/client-s3`).

## Security notes

- Bucket credentials stay on the server only.
- Upload middleware limits: PDF/JPEG/PNG, 5 MB (same as legacy multer).
- Object keys are random filenames; folder prefix is chosen per module in code.
