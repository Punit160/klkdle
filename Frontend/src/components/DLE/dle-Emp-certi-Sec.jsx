import React, { useEffect, useState } from "react";
import axios from "axios";
import EmployeeCertificate from "./dle-cerficate";

const EmployeeCertificatePage = ({ employeeId }) => {
  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // true = Fake Data
  // false = API Data
  const USE_FAKE_DATA = true;

  // Fake Employee Data
  const fakeEmployee = {
    fullName: "Harsh Rajput",
    designation: "DLE Employee",
    achievementText:
  "In recognition of your valuable association with KLK Venture and your continued contribution to the organization. We are pleased to acknowledge your transition to DLE, where you now hold the position of a valued member of the team.",
    issueDate: "21 August 2026",
    certificateId: "DLE-CERT-2026-001",
    signatureUrl: "/assets/signature.png",
    signatoryName: "Punit",
    signatoryDesignation: "Director",
  };

  useEffect(() => {
    const fetchEmployee = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fake Data
        if (USE_FAKE_DATA) {
          setTimeout(() => {
            setEmployee(fakeEmployee);
            setLoading(false);
          }, 500);

          return;
        }

        // Actual API
        const res = await axios.get(
          `/api/employees/${employeeId}/certificate`
        );

        setEmployee(res.data);
      } catch (err) {
        console.error("Certificate API Error:", err);
        setError("Unable to load certificate details.");
      } finally {
        if (!USE_FAKE_DATA) {
          setLoading(false);
        }
      }
    };

    if (employeeId || USE_FAKE_DATA) {
      fetchEmployee();
    }
  }, [employeeId]);

  if (loading) {
    return <p className="dle-loading-text">Loading certificate...</p>;
  }

  if (error) {
    return <p className="dle-error-text">{error}</p>;
  }

  if (!employee) {
    return null;
  }

  return (
    <EmployeeCertificate
      companyName="DLE"
      companyLogo="/images/logo-full.png"
      certificateTitle="Certificate of Excellence"
      employeeName={employee.fullName}
      designation={employee.designation}
      achievementText={employee.achievementText}
      issueDate={employee.issueDate}
      certificateId={employee.certificateId}
      signatureImage={employee.signatureUrl}
      signatoryName={employee.signatoryName}
      signatoryDesignation={employee.signatoryDesignation}
    />
  );
};

export default EmployeeCertificatePage;