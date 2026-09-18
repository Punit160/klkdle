/**
 * Verify R2 credentials and upload a tiny test object.
 * Usage (from Backend folder): node scripts/test-r2-upload.js
 */
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  getObjectStorageDiagnostics,
  uploadBufferToR2,
  isR2Configured,
} from "../Utils/objectStorage.js";

const backendDir = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(backendDir, "..", ".env") });

const main = async () => {
  console.log(JSON.stringify(getObjectStorageDiagnostics(), null, 2));

  if (!isR2Configured()) {
    console.error(
      "\nR2 is not configured. Set R2_ACCESS_KEY_ID and R2_SECRET_ACCESS_KEY in Backend/.env"
    );
    process.exit(1);
  }

  const key = `healthcheck/${Date.now()}-r2-test.txt`;
  const result = await uploadBufferToR2({
    buffer: Buffer.from("klkdle r2 ok"),
    objectKey: key,
    contentType: "text/plain",
  });

  console.log("\nUpload OK:", result);
  console.log("Check bucket klkdle for key:", key);
};

main().catch((err) => {
  console.error("\nR2 upload failed:", err.message);
  if (err.$metadata) console.error("AWS metadata:", err.$metadata);
  process.exit(1);
});
