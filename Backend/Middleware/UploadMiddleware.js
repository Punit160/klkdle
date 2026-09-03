import multer from "multer";
import path from "path";
import fs from "fs";

const storage = multer.diskStorage({
  destination: (req, file, cb) => {

    let uploadDir = "uploads";

    // =========================
    // BIHAR AMC
    // =========================

    const requestPath = `${req.originalUrl || ""} ${req.baseUrl || ""} ${req.path || ""}`;
    const isUpAmc = /\/up\/ssl-amc/i.test(requestPath);

    if (file.fieldname === "amc_document" || file.fieldname === "up_amc_document") {
      uploadDir = isUpAmc ? "uploads/up/ssl/amc/doc" : "uploads/bihar/ssl/amc/doc";
    }

    else if (file.fieldname === "invoice_document" || file.fieldname === "up_invoice_document") {
      uploadDir = isUpAmc ? "uploads/up/ssl/amc/invoice" : "uploads/bihar/ssl/amc/invoice";
    }

    // =========================
    // USER
    // =========================

    else if (file.fieldname === "profile_image") {
      uploadDir = "uploads/user/profile";
    }

    else if (file.fieldname === "aadhaar_voter_id") {
      uploadDir = "uploads/user/aadhaar";
    }

    else if (file.fieldname === "pan_card") {
      uploadDir = "uploads/user/pan";
    }

    else if (file.fieldname === "driving_license") {
      uploadDir = "uploads/user/driving-license";
    }

    else if (file.fieldname === "educational_document") {
      uploadDir = "uploads/user/documents";
    }

    else if (file.fieldname === "police_verification") {
      uploadDir = "uploads/user/police-verification";
    }

    else if (file.fieldname === "cancelled_cheque") {
      uploadDir = "uploads/user/cancelled-cheque";
    }

    else if (file.fieldname === "rent_agreement_electricity_bill") {
      uploadDir = "uploads/user/rent-agreement";
    }

    else if (file.fieldname === "image_1" || file.fieldname === "image_2") {
      uploadDir = "uploads/light-amc";
    }

    fs.mkdirSync(uploadDir, {
      recursive: true
    });

    cb(null, uploadDir);
  },

  filename: (req, file, cb) => {

    const extension = path.extname(file.originalname);

    const fileName =
      `${Date.now()}-${Math.round(Math.random() * 1e9)}${extension}`;

    cb(null, fileName);
  }
});

const fileFilter = (req, file, cb) => {

  const allowedTypes = [
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/jpg"
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        "Only PDF, JPG, JPEG and PNG files are allowed"
      )
    );
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024
  }
});

export default upload;