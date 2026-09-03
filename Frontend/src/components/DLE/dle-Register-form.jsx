import React, { useState } from "react";
import localApi from "../../api/localApi";
import {
  FaPhoneAlt,
  FaHeart,
  FaPaperclip,
  FaUpload,
  FaMapMarkerAlt,
  FaUser,
  FaEnvelope,
  FaIdCard,
  FaFileAlt,
  FaCar,
  FaShieldAlt,
  FaUniversity,
  FaHome,
  FaTimes,
  FaCheckCircle,
} from "react-icons/fa";

import "../../styles/DLE/dle-Register-form.css";

const documentFields = [
  {
    id: "education",
    label: "Educational Doc.",
    required: true,
    icon: FaUniversity,
  },
  {
    id: "aadhaar",
    label: "Aadhaar / Voter ID",
    required: true,
    icon: FaIdCard,
  },
  {
    id: "pan",
    label: "PAN Card",
    required: true,
    icon: FaFileAlt,
  },
  {
    id: "driving",
    label: "Driving License",
    required: false,
    icon: FaCar,
  },
  {
    id: "police",
    label: "Police Verification",
    required: true,
    icon: FaShieldAlt,
  },
  {
    id: "cheque",
    label: "Cancelled Cheque",
    required: true,
    icon: FaUniversity,
  },
  {
    id: "addressProof",
    label: "Rent Agreement / Electricity Bill",
    required: true,
    icon: FaHome,
  },
];

const initialDocuments = {
  education: null,
  aadhaar: null,
  pan: null,
  driving: null,
  police: null,
  cheque: null,
  addressProof: null,
};

const DLERegistrationForm = () => {
  const [documents, setDocuments] = useState(initialDocuments);
  const [formData, setFormData] = useState({
    employeeName: "",
    email: "",
    contactNo: "",
    emergencyNo: "",
    state: "",
    district: "",
    block: "",
    panchayat: "",
    policeValidity: "",
    address: "",
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleFileChange = (id, file) => {
    if (!file) return;

    setDocuments((prev) => ({
      ...prev,
      [id]: file,
    }));
  };

  const handleRemoveFile = (id) => {
    setDocuments((prev) => ({
      ...prev,
      [id]: null,
    }));
  };

  const uploadedCount = Object.values(documents).filter(Boolean).length;

  const requiredDocuments = documentFields.filter(
    (document) => document.required
  );

  const requiredUploadedCount = requiredDocuments.filter(
    (document) => documents[document.id]
  ).length;

const handleSubmit = async (e) => {
  e.preventDefault();

  if (requiredUploadedCount !== requiredDocuments.length) {
    alert("Please upload all required documents.");
    return;
  }

  try {
    const data = new FormData();

    data.append("name", formData.employeeName);
    data.append("email", formData.email);
    data.append("contact_no", formData.contactNo);
    data.append("emergency_contact_no", formData.emergencyNo);

    data.append("state", formData.state);
    data.append("district", formData.district);
    data.append("block", formData.block);
    data.append("panchayat", formData.panchayat);
    data.append(
      "police_verification_validity",
      formData.policeValidity
    );
    data.append("address", formData.address);

    if (documents.education) {
      data.append(
        "educational_document",
        documents.education
      );
    }

    if (documents.aadhaar) {
      data.append(
        "aadhaar_voter_id",
        documents.aadhaar
      );
    }

    if (documents.pan) {
      data.append(
        "pan_card",
        documents.pan
      );
    }

    if (documents.driving) {
      data.append(
        "driving_license",
        documents.driving
      );
    }

    if (documents.police) {
      data.append(
        "police_verification",
        documents.police
      );
    }

    if (documents.cheque) {
      data.append(
        "cancelled_cheque",
        documents.cheque
      );
    }

    if (documents.addressProof) {
      data.append(
        "rent_agreement_electricity_bill",
        documents.addressProof
      );
    }

    const response = await localApi.post(
      "/api/auth/register",
      data
    );

    if (response.data.success) {
      alert(response.data.message);

      handleCancel();
    }
  } catch (error) {
    console.error("Registration Error:", error);

    alert(
      error.response?.data?.message ||
      "Registration failed. Please try again."
    );
  }
};

  const handleCancel = () => {
    setFormData({
      employeeName: "",
      email: "",
      contactNo: "",
      emergencyNo: "",
      state: "",
      district: "",
      block: "",
      panchayat: "",
      policeValidity: "",
      address: "",
    });

    setDocuments(initialDocuments);
  };

  return (
    <div className="dle-page">
      <div className="dle-registration-card">
        <div className="dle-header">
          <div className="dle-brand">
           <div className="dle-logo">
  <img src="/images/logo-full.png" alt="KLK Ventures" />
</div>

            <div className="dle-header-content">
              <span className="dle-company-name">
                KLK VENTURES PVT LTD
              </span>

              <h1>DLE Registration Form</h1>

              <p>DLE पंजीकरण</p>
            </div>
          </div>

          <div className="dle-header-decoration">
            <span></span>
            <span></span>
            <span></span>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="dle-top-sections">
            <section className="dle-section contact-section">
              <div className="dle-section-heading">
                <div className="dle-section-icon">
                  <FaPhoneAlt />
                </div>

                <div>
                  <h2>Contact Details</h2>
                  <span>संपर्क विवरण</span>
                </div>
              </div>

              <div className="dle-form-grid">
                <div className="dle-field">
                  <label>
                    Employee Name <span>*</span>
                  </label>

                  <div className="dle-input-wrapper">
                    <FaUser />
                    <input
                      type="text"
                      name="employeeName"
                      value={formData.employeeName}
                      onChange={handleInputChange}
                      placeholder="Enter full name"
                    />
                  </div>
                </div>

                <div className="dle-field">
                  <label>
                    Email ID <span>*</span>
                  </label>

                  <div className="dle-input-wrapper">
                    <FaEnvelope />
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="name@example.com"
                    />
                  </div>
                </div>

                <div className="dle-field">
                  <label>
                    Contact No. <span>*</span>
                  </label>

                  <div className="dle-input-wrapper">
                    <FaPhoneAlt />
                    <input
                      type="tel"
                      name="contactNo"
                      value={formData.contactNo}
                      onChange={handleInputChange}
                      placeholder="Enter mobile number"
                    />
                  </div>
                </div>

                <div className="dle-field">
                  <label>
                    Emergency No. <span>*</span>
                  </label>

                  <div className="dle-input-wrapper">
                    <FaPhoneAlt />
                    <input
                      type="tel"
                      name="emergencyNo"
                      value={formData.emergencyNo}
                      onChange={handleInputChange}
                      placeholder="Emergency contact number"
                    />
                  </div>
                </div>
              </div>
            </section>

            <section className="dle-section residential-section">
              <div className="dle-section-heading">
                <div className="dle-section-icon">
                  <FaHeart />
                </div>

                <div>
                  <h2>Residential Reference</h2>
                  <span>आवासीय संदर्भ</span>
                </div>
              </div>

              <div className="dle-form-grid residential-grid">
                <div className="dle-field">
                  <label>
                    State <span>*</span>
                  </label>

                  <div className="dle-input-wrapper select-wrapper">
                    <FaMapMarkerAlt />

                    <select
                      name="state"
                      value={formData.state}
                      onChange={handleInputChange}
                    >
                      <option value="">Select State</option>
                      <option value="Bihar">Bihar</option>
                      <option value="Uttar Pradesh">Uttar Pradesh</option>
                      <option value="Jharkhand">Jharkhand</option>
                      <option value="Delhi">Delhi</option>
                      <option value="Haryana">Haryana</option>
                    </select>
                  </div>
                </div>

                <div className="dle-field">
                  <label>
                    District <span>*</span>
                  </label>

                  <div className="dle-input-wrapper">
                    <FaMapMarkerAlt />

                    <input
                      type="text"
                      name="district"
                      value={formData.district}
                      onChange={handleInputChange}
                      placeholder="Enter district"
                    />
                  </div>
                </div>

                <div className="dle-field">
                  <label>
                    Block <span>*</span>
                  </label>

                  <div className="dle-input-wrapper">
                    <FaMapMarkerAlt />

                    <input
                      type="text"
                      name="block"
                      value={formData.block}
                      onChange={handleInputChange}
                      placeholder="Enter block"
                    />
                  </div>
                </div>

                <div className="dle-field">
                  <label>
                    Panchayat <span>*</span>
                  </label>

                  <div className="dle-input-wrapper">
                    <FaMapMarkerAlt />

                    <input
                      type="text"
                      name="panchayat"
                      value={formData.panchayat}
                      onChange={handleInputChange}
                      placeholder="Enter panchayat"
                    />
                  </div>
                </div>

                <div className="dle-field">
                  <label>
                    Police Verif. Validity <span>*</span>
                  </label>

                  <div className="dle-input-wrapper">
                    <FaShieldAlt />

                    <input
                      type="text"
                      name="policeValidity"
                      value={formData.policeValidity}
                      onChange={handleInputChange}
                      placeholder="Minimum 1 year"
                    />
                  </div>
                </div>

                <div className="dle-field">
                  <label>
                    Address as per Doc. <span>*</span>
                  </label>

                  <div className="dle-input-wrapper">
                    <FaHome />

                    <input
                      type="text"
                      name="address"
                      value={formData.address}
                      onChange={handleInputChange}
                      placeholder="Complete address"
                    />
                  </div>
                </div>
              </div>
            </section>
          </div>

          <section className="dle-documents-section">
            <div className="dle-section-heading documents-heading">
              <div className="dle-section-icon">
                <FaPaperclip />
              </div>

              <div>
                <h2>Upload Documents</h2>
                <span>दस्तावेज़ अपलोड करें</span>
              </div>
            </div>

            <div className="dle-documents-grid">
              {documentFields.map((document) => {
                const Icon = document.icon;
                const file = documents[document.id];

                return (
                  <div
                    className={`dle-upload-card ${
                      document.id === "addressProof"
                        ? "full-width-upload"
                        : ""
                    }`}
                    key={document.id}
                  >
                    <div className="dle-upload-title">
                      <div>
                        <Icon />
                        <span>{document.label}</span>
                      </div>

                      {document.required ? (
                        <span className="required-text">*</span>
                      ) : (
                        <span className="optional-text">(Opt.)</span>
                      )}
                    </div>

                    <label
                      className={`dle-upload-box ${
                        file ? "file-uploaded" : ""
                      }`}
                    >
                      <input
                        type="file"
                        accept=".jpg,.jpeg,.png,.pdf"
                        onChange={(e) =>
                          handleFileChange(
                            document.id,
                            e.target.files[0]
                          )
                        }
                      />

                      {file ? (
                        <div className="uploaded-file-content">
                          <FaCheckCircle className="uploaded-icon" />

                          <div className="uploaded-file-info">
                            <strong>{file.name}</strong>
                            <small>
                              {(file.size / 1024).toFixed(1)} KB
                            </small>
                          </div>

                          <button
                            type="button"
                            className="remove-file-btn"
                            onClick={(e) => {
                              e.preventDefault();
                              handleRemoveFile(document.id);
                            }}
                          >
                            <FaTimes />
                          </button>
                        </div>
                      ) : (
                        <div className="upload-placeholder">
                          <div className="upload-icon-circle">
                            <FaUpload />
                          </div>

                          <strong>Click to upload</strong>
                          <span>or drag & drop</span>
                          <small>PDF, JPG, PNG up to 5MB</small>
                        </div>
                      )}
                    </label>
                  </div>
                );
              })}
            </div>
          </section>

          <div className="dle-footer">
            <div className="upload-progress">
              <div className="progress-info">
                <span
                  className={
                    uploadedCount === documentFields.length
                      ? "progress-complete"
                      : ""
                  }
                >
                  {uploadedCount === documentFields.length ? (
                    <FaCheckCircle />
                  ) : (
                    <span className="progress-dot"></span>
                  )}

                  {uploadedCount} of {documentFields.length} documents
                  uploaded
                </span>

                <strong>
                  {Math.round(
                    (uploadedCount / documentFields.length) * 100
                  )}
                  %
                </strong>
              </div>

              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{
                    width: `${
                      (uploadedCount / documentFields.length) * 100
                    }%`,
                  }}
                ></div>
              </div>
            </div>

            <div className="dle-actions">
              <button
                type="button"
                className="dle-cancel-btn"
                onClick={handleCancel}
              >
                <FaTimes />
                Cancel
              </button>

              <button type="submit" className="dle-submit-btn">
                Submit
                <span>/ जमा करें</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DLERegistrationForm;