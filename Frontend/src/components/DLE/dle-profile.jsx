import React, { useEffect, useState } from "react";
import localApi, { LOCAL_API_BASE } from "../../api/localApi";
import HorizontalProgress from "@/components/shared/HorizontalProgress";

import EmployeeIdCard from "./dle-id-card";
import EmployeeCertificate from "./dle-cerficate";
import "../../styles/DLE/dle-profile.css";

import {
  FiPhone,
  FiHeart,
  FiFileText,
  FiCreditCard,
  FiShield,
  FiHome,
  FiEye,
  FiDownload,
  FiCheckCircle,
  FiAlertCircle,
  FiMapPin,
  FiMail,
  FiUser,
  FiBriefcase,
  FiLock,
} from "react-icons/fi";

import {
  FaUniversity,
  FaCar,
  FaRegIdCard,
} from "react-icons/fa";

const API_URL = LOCAL_API_BASE;


const documentList = [
  {
    key: "educational_document",
    title: "Educational Document",
    required: true,
    icon: <FiFileText />,
  },
  {
    key: "aadhaar_voter_id",
    title: "Aadhaar / Voter ID",
    required: true,
    icon: <FaRegIdCard />,
  },
  {
    key: "pan_card",
    title: "PAN Card",
    required: true,
    icon: <FiCreditCard />,
  },
  {
    key: "driving_license",
    title: "Driving License",
    required: false,
    icon: <FaCar />,
  },
  {
    key: "police_verification",
    title: "Police Verification",
    required: true,
    icon: <FiShield />,
  },
  {
    key: "cancelled_cheque",
    title: "Cancelled Cheque",
    required: true,
    icon: <FaUniversity />,
  },
  {
    key: "rent_agreement_electricity_bill",
    title: "Rent Agreement / Electricity Bill",
    required: true,
    icon: <FiHome />,
  },
];

const getUser = () => {
  try {
    return JSON.parse(localStorage.getItem("dleUser") || "{}");
  } catch {
    return {};
  }
};

/**
 * A single "label + value" row inside a details grid.
 * When `editing` is true it renders an input/textarea instead of
 * static text, wired to the same classes the CSS already defines
 * for .detail-item / .detail-label / .detail-value so it always
 * matches the rest of the profile design.
 */
function InfoItem({
  label,
  value,
  icon,
  editing = false,
  name,
  type = "text",
  onChange,
  textarea = false,
  fullWidth = false,
}) {
  return (
    <div
      className={`detail-item${fullWidth ? " detail-full" : ""}${editing ? " is-editing" : ""
        }`}
    >
      <div className="detail-label">
        {icon}
        <span>{label}</span>
      </div>

      {editing ? (
        textarea ? (
          <textarea
            name={name}
            value={value || ""}
            onChange={onChange}
            className="detail-textarea"
          />
        ) : (
          <input
            type={type}
            name={name}
            value={value || ""}
            onChange={onChange}
            className="detail-input"
          />
        )
      ) : (
        <span
          className={`detail-value${fullWidth ? " address-value" : ""
            }`}
        >
          {value || "—"}
        </span>
      )}
    </div>
  );
}

function DocumentCard({ document: doc, user }) {
  const fileName = user[doc.key];

  const fileUrl = fileName
    ? (/^https?:\/\//i.test(fileName)
      ? fileName
      : `${API_URL}${fileName.startsWith("/") ? fileName : `/uploads/${fileName}`}`)
    : "";

  const handleView = () => {
    if (!fileUrl) return;
    window.open(fileUrl, "_blank", "noopener,noreferrer");
  };

  const handleDownload = () => {
    if (!fileUrl) return;

    const link = window.document.createElement("a");
    link.href = fileUrl;
    link.download = fileName;

    window.document.body.appendChild(link);
    link.click();
    window.document.body.removeChild(link);
  };

  return (
    <div className="document-card">
      <div className="document-icon">
        {doc.icon}
      </div>

      <div className="document-content">
        <div className="document-title-row">
          <h4>{doc.title}</h4>

          {doc.required && (
            <span className="required-badge">
              Required
            </span>
          )}
        </div>

        {fileName ? (
          <>
            <p className="document-name">
              {fileName}
            </p>

            <span className="uploaded-status">
              <FiCheckCircle />
              Uploaded
            </span>
          </>
        ) : (
          <span className="not-uploaded-status">
            <FiAlertCircle />
            Not Uploaded
          </span>
        )}
      </div>

      {fileName && (
        <div className="document-actions">
          <button
            className="document-action view"
            onClick={handleView}
          >
            <FiEye />
            <span>View</span>
          </button>

          <button
            className="document-action download"
            onClick={handleDownload}
          >
            <FiDownload />
            <span>Download</span>
          </button>
        </div>
      )}
    </div>
  );
}



export default function EmployeeRegistration() {
  const [employeeData, setEmployeeData] = useState(
    getUser()
  );

  const [formData, setFormData] = useState(
    getUser()
  );

  const [showIdCard, setShowIdCard] = useState(false);
  const [showCertificate, setShowCertificate] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");


  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const requiredDocuments = documentList.filter(
    (doc) => doc.required
  );

  const uploadedRequiredDocuments =
    requiredDocuments.filter(
      (doc) => employeeData[doc.key]
    ).length;

  const totalDocuments = documentList.length;

  const uploadedDocuments = documentList.filter(
    (doc) => employeeData[doc.key]
  ).length;

  const completion = requiredDocuments.length
    ? Math.round(
      (uploadedRequiredDocuments /
        requiredDocuments.length) *
      100
    )
    : 0;

  useEffect(() => {
    const user = getUser();

    if (!user?.id) {
      setLoading(false);
      return;
    }

    localApi
      .get(`/api/auth/profile`, { params: { userId: user.id } })
      .then(({ data }) => {
        if (data.success) {
          setEmployeeData(data.user);
          setFormData(data.user);

          localStorage.setItem(
            "dleUser",
            JSON.stringify(data.user)
          );
        }
      })
      .catch((error) => {
        console.error(
          "PROFILE FETCH ERROR:",
          error
        );
      })
      .finally(() => {
        setLoading(false);
      });

  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };



  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      alert("Please fill all password fields");
      return;
    }

    if (newPassword !== confirmPassword) {
      alert("New password and confirm password do not match");
      return;
    }

    if (newPassword.length < 8) {
      alert("New password must be at least 8 characters");
      return;
    }

    try {
      setChangingPassword(true);

      const response = await localApi.patch(
        `/api/auth/change-password`,
        {
          userId: employeeData.id,
          currentPassword,
          newPassword,
          confirmPassword,
        }
      );

      if (response.data.success) {
        alert("Password changed successfully");

        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");

        setActiveTab("overview");
      }
    } catch (error) {
      console.error("CHANGE PASSWORD ERROR:", error);

      alert(
        error.response?.data?.message ||
        "Failed to change password"
      );
    } finally {
      setChangingPassword(false);
    }
  };

  // Helper: value shown in a field — the draft value while
  // editing, the saved value otherwise.
  const fieldValue = (key) =>
    editing ? formData[key] : employeeData[key];

  if (loading) {
    return (
      <div className="employee-page">
        <div className="loading-state">
          Loading profile...
        </div>
      </div>
    );
  }

  return (
    <div className="dle-profile-page">

      {/* =====================================================
        LEFT PROFILE SIDEBAR
    ====================================================== */}
      <aside className="profile-sidebar">

        <div className="profile-user-card">

          {/* Avatar */}
          <div className="profile-avatar-wrapper">
            <div className="profile-avatar">
              {employeeData?.name
                ? employeeData.name
                  .split(" ")
                  .map((word) => word[0])
                  .slice(0, 2)
                  .join("")
                  .toUpperCase()
                : "DL"}
            </div>

            <span
              className={`profile-online-dot ${employeeData?.status === 1
                  ? "approved"
                  : "pending"
                }`}
            />
          </div>

          {/* Name */}
          <h2 className="profile-user-name">
            {employeeData?.name || "Employee"}
          </h2>

          <p className="profile-user-role">
            DLE Registered Employee
          </p>

          {/* Status */}
          <span
            className={`profile-status-badge ${employeeData?.status === 1
                ? "approved"
                : "pending"
              }`}
          >
            <span className="status-indicator" />

            {employeeData?.status === 1
              ? "Approved Profile"
              : "Pending Approval"}
          </span>


          {/* Stats */}
          <div className="profile-stats">

            <div className="profile-stat">
              <strong>
                {uploadedDocuments}
              </strong>

              <span>
                Documents
              </span>
            </div>

            <div className="profile-stat">
              <strong>
                {completion}%
              </strong>

              <span>
                Complete
              </span>
            </div>



          </div>


          {/* Contact Information */}
          <div className="sidebar-contact-list">

            <div className="sidebar-contact-item">

              <div className="sidebar-contact-icon">
                <FiMapPin />
              </div>

              <div>
                <span>
                  Location
                </span>

                <strong>
                  {employeeData?.district || "—"}
                  {employeeData?.state
                    ? `, ${employeeData.state}`
                    : ""}
                </strong>
              </div>

            </div>


            <div className="sidebar-contact-item">

              <div className="sidebar-contact-icon">
                <FiPhone />
              </div>

              <div>
                <span>
                  Phone
                </span>

                <strong>
                  {employeeData?.contact_no || "—"}
                </strong>
              </div>

            </div>


            <div className="sidebar-contact-item">

              <div className="sidebar-contact-icon">
                <FiMail />
              </div>

              <div>
                <span>
                  Email
                </span>

                <strong>
                  {employeeData?.email || "—"}
                </strong>
              </div>

            </div>

          </div>





        </div>

      </aside>


      {/* =====================================================
        RIGHT MAIN PROFILE
    ====================================================== */}
      <main className="profile-main">


        {/* ===================================================
          3 MAIN TABS
      ==================================================== */}
        <div className="profile-tabs lga-tabs">

          {/* OVERVIEW */}
          <button
            type="button"
            className={`profile-tab ${activeTab === "overview"
                ? "active"
                : ""
              }`}
            onClick={() => setActiveTab("overview")}
          >
            {/* <FiUser /> */}
            <span>
              Overview
            </span>
          </button>




          {/* DOCUMENT VERIFICATION */}
          <button
            type="button"
            className={`profile-tab ${activeTab === "verification"
                ? "active"
                : ""
              }`}
            onClick={() =>
              setActiveTab("verification")
            }
          >
            {/* <FiShield /> */}
            <span>
              Document Verification
            </span>
          </button>


          {/* OFFICIAL DOCUMENTS */}
          <button
            type="button"
            className={`profile-tab ${activeTab === "official"
                ? "active"
                : ""
              }`}
            onClick={() =>
              setActiveTab("official")
            }
          >
            {/* <FiFileText /> */}
            <span>
              Official Documents
            </span>
          </button>


          <button
            type="button"
            className={`profile-tab ${activeTab === "change-password"
                ? "active"
                : ""
              }`}
            onClick={() =>
              setActiveTab("change-password")
            }
          >
            {/* <FiLock /> */}
            <span>
              Change Password
            </span>
          </button>

        </div>


        {/* ===================================================
          TAB CONTENT
      ==================================================== */}
        <div className="lga-tab-content">


          {/* =================================================
            1. OVERVIEW
        ================================================== */}
          {activeTab === "overview" && (
            <div className="overview-tab">


              {/* =============================================
                PROFILE ABOUT
            ============================================== */}
              <section className="profile-content-card">

                <div className="section-title-row">

                  <div>

                    <span className="section-eyebrow">
                      PROFILE ABOUT
                    </span>

                    <h2>
                      Employee Registration Profile
                    </h2>

                  </div>




                </div>


                <p className="profile-about-text">
                  This profile contains the registered
                  employee information submitted for DLE
                  verification. Personal information,
                  residential details and submitted
                  documents are displayed below.
                </p>

                {/* ---- Registration progress ---- */}
                <div className=" mt-3 mb-3">
                  <div className="mb-2 d-flex align-items-center justify-content-between">
                    <span className="fw-semibold fs-13">Registration Completion</span>
                    <span className="badge bg-soft-primary text-primary">{completion}%</span>
                  </div>
                  <HorizontalProgress progress={completion} barColor="bg-primary" />
                </div>

              </section>



              <section className="profile-content-card">

                <div className="section-title-row">

                  <div>

                    <span className="section-eyebrow">
                      REGISTRATION DETAILS
                    </span>

                    <h2>
                      Employee Information
                    </h2>

                  </div>

                </div>


                <div className="profile-details-grid">

                  {/* NAME */}
                  <InfoItem
                    label="Full Name"
                    value={fieldValue("name")}
                    icon={<FiUser />}
                    editing={editing}
                    name="name"
                    onChange={handleChange}
                  />


                  {/* EMAIL */}
                  <InfoItem
                    label="Email Address"
                    value={fieldValue("email")}
                    icon={<FiMail />}
                    editing={editing}
                    name="email"
                    type="email"
                    onChange={handleChange}
                  />


                  {/* COMPANY */}
                  <InfoItem
                    label="Company ID"
                    value={fieldValue("company_id")}
                    icon={<FiBriefcase />}
                    editing={editing}
                    name="company_id"
                    onChange={handleChange}
                  />


                  {/* MOBILE */}
                  <InfoItem
                    label="Mobile Number"
                    value={fieldValue("contact_no")}
                    icon={<FiPhone />}
                    editing={editing}
                    name="contact_no"
                    type="tel"
                    onChange={handleChange}
                  />


                  {/* EMERGENCY */}
                  <InfoItem
                    label="Emergency Contact"
                    value={fieldValue("emergency_contact_no")}
                    icon={<FiPhone />}
                    editing={editing}
                    name="emergency_contact_no"
                    type="tel"
                    onChange={handleChange}
                  />


                  {/* STATUS — read only, derived from server data */}
                  <InfoItem
                    label="Account Status"
                    value={
                      employeeData?.status === 1
                        ? "Approved"
                        : "Pending Approval"
                    }
                    icon={<FiCheckCircle />}
                  />

                </div>

              </section>


              {/* =============================================
                RESIDENTIAL REFERENCE
            ============================================== */}
              <section className="profile-content-card">

                <div className="section-title-row">

                  <div>

                    <span className="section-eyebrow">
                      RESIDENTIAL REFERENCE
                    </span>

                    <h2>
                      Address & Location
                    </h2>

                  </div>

                </div>


                <div className="profile-details-grid">

                  {/* STATE */}
                  <InfoItem
                    label="State"
                    value={fieldValue("state")}
                    icon={<FiMapPin />}
                    editing={editing}
                    name="state"
                    onChange={handleChange}
                  />


                  {/* DISTRICT */}
                  <InfoItem
                    label="District"
                    value={fieldValue("district")}
                    icon={<FiMapPin />}
                    editing={editing}
                    name="district"
                    onChange={handleChange}
                  />


                  {/* BLOCK */}
                  <InfoItem
                    label="Block"
                    value={fieldValue("block")}
                    icon={<FiMapPin />}
                    editing={editing}
                    name="block"
                    onChange={handleChange}
                  />


                  {/* PANCHAYAT */}
                  <InfoItem
                    label="Panchayat"
                    value={fieldValue("panchayat")}
                    icon={<FiMapPin />}
                    editing={editing}
                    name="panchayat"
                    onChange={handleChange}
                  />


                  {/* POLICE VERIFICATION */}
                  <InfoItem
                    label="Police Verification Validity"
                    value={fieldValue(
                      "police_verification_validity"
                    )}
                    icon={<FiShield />}
                    editing={editing}
                    name="police_verification_validity"
                    onChange={handleChange}
                  />


                  {/* ADDRESS */}
                  <InfoItem
                    label="Address as per Document"
                    value={fieldValue("address")}
                    icon={<FiHome />}
                    editing={editing}
                    name="address"
                    onChange={handleChange}
                    textarea
                    fullWidth
                  />

                </div>

              </section>






            </div>
          )}


          {/* =================================================
            2. DOCUMENT VERIFICATION
        ================================================== */}
          {activeTab === "verification" && (
            <section className="profile-content-card">

              <div className="section-title-row">

                <div>

                  <span className="section-eyebrow">
                    DOCUMENT VERIFICATION
                  </span>

                  <h2>
                    Uploaded Documents
                  </h2>

                  <p className="section-description">
                    All documents submitted by the employee
                  </p>

                </div>


                <div className="document-total">

                  <strong>
                    {uploadedDocuments}/
                    {totalDocuments}
                  </strong>

                  <span>
                    Documents
                  </span>

                </div>

              </div>


              <div className="documents-grid">

                {documentList.map((document) => (

                  <DocumentCard
                    key={document.key}
                    document={document}
                    user={employeeData}
                  />

                ))}

              </div>

            </section>
          )}


          {/* =================================================
            3. OFFICIAL DOCUMENTS
        ================================================== */}
          {activeTab === "official" && (
            <section className="profile-content-card">

              <div className="section-title-row">

                <div>

                  <span className="section-eyebrow">
                    OFFICIAL DOCUMENTS
                  </span>

                  <h2>
                    DLE Official Documents
                  </h2>

                  <p className="section-description">
                    Official documents generated for the
                    registered employee
                  </p>

                </div>


                <div className="document-total">

                  <strong>
                    2
                  </strong>

                  <span>
                    Available
                  </span>

                </div>

              </div>


              <div className="documents-grid">


                {/* =========================================
                  DLE ID CARD
              ========================================== */}
                <div className="document-card">

                  <div className="document-icon">
                    <FaRegIdCard />
                  </div>


                  <div className="document-content">

                    <div className="document-title-row">

                      <h4>
                        DLE Identity Card
                      </h4>

                    </div>


                    <p className="document-name">
                      Official employee identity card
                    </p>


                    <span className="uploaded-status">

                      <FiCheckCircle />

                      Available

                    </span>

                  </div>


                  <div className="document-actions">

                    <button
                      type="button"
                      className="document-action view"
                      onClick={() =>
                        setShowIdCard(true)
                      }
                    >
                      <FiEye />
                      <span>
                        View
                      </span>
                    </button>


                    <button
                      type="button"
                      className="document-action download"
                      onClick={() =>
                        setShowIdCard(true)
                      }
                    >
                      <FiDownload />
                      <span>
                        Download
                      </span>
                    </button>

                  </div>

                </div>


                {/* =========================================
                  DLE CERTIFICATE
              ========================================== */}
                <div className="document-card">

                  <div className="document-icon">
                    <FiFileText />
                  </div>


                  <div className="document-content">

                    <div className="document-title-row">

                      <h4>
                        DLE Certificate
                      </h4>

                    </div>


                    <p className="document-name">
                      Official DLE registration certificate
                    </p>


                    <span className="uploaded-status">

                      <FiCheckCircle />

                      Available

                    </span>

                  </div>


                  <div className="document-actions">

                    {/* <button
                      type="button"
                      className="document-action view"
                      onClick={() =>
                        setShowCertificate(true)
                      }
                    >
                      <FiEye />
                      <span>
                        View
                      </span>
                    </button> */}


                    {/* <button
                      type="button"
                      className="document-action download"
                      onClick={() =>
                        setShowCertificate(true)
                      }
                    >
                      <FiDownload />
                      <span>
                        Download
                      </span>
                    </button> */}

                  </div>

                </div>

              </div>

            </section>
          )}

        </div>




        {/* ===================================================
          ID CARD MODAL
      ==================================================== */}
        {showIdCard && (

          <div
            className="document-modal-overlay"
            onClick={() =>
              setShowIdCard(false)
            }
          >

            <div
              className="document-modal"
              onClick={(e) =>
                e.stopPropagation()
              }
            >

              <button
                type="button"
                className="document-modal-close"
                onClick={() =>
                  setShowIdCard(false)
                }
              >
                ×
              </button>


              <EmployeeIdCard
                employeeData={employeeData}
              />

            </div>

          </div>

        )}

        {/* =================================================
    CHANGE PASSWORD
================================================== */}
        {activeTab === "change-password" && (
          <section className="profile-content-card">

            <div className="section-title-row">
              <div>
                <span className="section-eyebrow">
                  ACCOUNT SECURITY
                </span>

                <h2>
                  Change Password
                </h2>

                <p className="section-description">
                  Update your account password securely.
                </p>
              </div>
            </div>

            <div className="change-password-wrapper">

              <div className="password-form">

                {/* CURRENT PASSWORD */}
                <div className="password-field">
                  <label>
                    Current Password
                  </label>

                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) =>
                      setCurrentPassword(e.target.value)
                    }
                    placeholder="Enter current password"
                  />
                </div>

                {/* NEW PASSWORD */}
                <div className="password-field">
                  <label>
                    New Password
                  </label>

                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) =>
                      setNewPassword(e.target.value)
                    }
                    placeholder="Enter new password"
                  />
                </div>

                {/* CONFIRM PASSWORD */}
                <div className="password-field">
                  <label>
                    Confirm New Password
                  </label>

                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) =>
                      setConfirmPassword(e.target.value)
                    }
                    placeholder="Confirm new password"
                  />
                </div>

                <button
                  type="button"
                  className="primary-profile-btn change-password-btn"
                  onClick={handleChangePassword}
                  disabled={changingPassword}
                >
                  <FiLock />

                  {changingPassword
                    ? "Changing Password..."
                    : "Change Password"}
                </button>

              </div>

            </div>

          </section>
        )}


        {/* ===================================================
          CERTIFICATE MODAL
      ==================================================== */}
        {showCertificate && (

          <div
            className="document-modal-overlay"
            onClick={() =>
              setShowCertificate(false)
            }
          >

            <div
              className="document-modal certificate-modal"
              onClick={(e) =>
                e.stopPropagation()
              }
            >

              <button
                type="button"
                className="document-modal-close"
                onClick={() =>
                  setShowCertificate(false)
                }
              >
                ×
              </button>


              <EmployeeCertificate
                employeeData={employeeData}
              />

            </div>

          </div>

        )}

      </main>

    </div>
  );
}