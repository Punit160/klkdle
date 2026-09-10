import { useEffect, useRef, useState } from "react";
import PageHeader from "@/components/shared/pageHeader/PageHeader";
import localApi from "../../api/localApi";
import { app } from "../../api/routes";
import { getUser } from "../../utils/auth";
import EmployeeCertificate from "./dle-cerficate";

const EmployeeCertificatePage = () => {
  const certificateRef = useRef(null);
  const [employeeData, setEmployeeData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const user = getUser();

    if (!user?.id) {
      setError("Please login again to view your certificate.");
      setLoading(false);
      return;
    }

    localApi
      .get(app.auth.profile, { params: { userId: user.id } })
      .then(({ data }) => {
        if (data?.success && data.user) {
          setEmployeeData(data.user);
        } else {
          setError(data?.message || "Unable to load certificate details.");
        }
      })
      .catch((err) => {
        console.error("Certificate API Error:", err);
        setError("Unable to load certificate details.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <p className="dle-loading-text">Loading certificate...</p>;
  }

  if (error) {
    return <p className="dle-error-text">{error}</p>;
  }

  if (!employeeData) {
    return null;
  }

  return (
    <>
      <PageHeader />
      <EmployeeCertificate
        ref={certificateRef}
        employeeData={employeeData}
      />
    </>
  );
};

export default EmployeeCertificatePage;
