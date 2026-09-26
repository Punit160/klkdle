import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { FiDownload, FiShield } from "react-icons/fi";
import PageHeader from "@/components/shared/pageHeader/PageHeader";
import localApi from "../../api/localApi";
import { app } from "../../api/routes";
import { getUser } from "../../utils/auth";
import { resolveUploadUrl } from "../../utils/uploadUrl";
import "../../styles/DLE/dle-id-card.css";

export const EmployeeIdCard = forwardRef(
  ({ employeeData }, ref) => {
    const cardRef = useRef(null);
    const [photoLoadFailed, setPhotoLoadFailed] = useState(false);

    useEffect(() => {
      setPhotoLoadFailed(false);
    }, [employeeData?.profile_image, employeeData?.profile_image_url]);

    const data = {
      employeeName:
        employeeData?.name || "Employee",

      employeeId: employeeData?.id
        ? `DLE-${String(
            employeeData.id
          ).padStart(6, "0")}`
        : "DLE-000000",

      email: employeeData?.email || "—",

      contactNo:
        employeeData?.contact_no || "—",

      state:
        employeeData?.state || "—",

      district:
        employeeData?.district || "—",

      panchayat:
        employeeData?.panchayat || "—",

      address:
        employeeData?.address || "—",

      companyLogo:
        "/images/logo-full.png",

      designation:
        "DLE KLK Venture",

      validity:
        employeeData?.status === 1
          ? "Valid Employee"
          : "Pending",

      profilePhotoUrl: resolveUploadUrl(
        employeeData?.profile_image_url || employeeData?.profile_image
      ),
    };

    const detailRows = [
      {
        label: "Employee ID",
        value: data.employeeId,
      },
      {
        label: "Contact",
        value: data.contactNo,
      },
      {
        label: "Email",
        value: data.email,
      },
      {
        label: "State",
        value: data.state,
      },
      {
        label: "District",
        value: data.district,
      },
      {
        label: "Panchayat",
        value: data.panchayat,
      },
    ];

    const downloadIdCard = async () => {
      if (!cardRef.current) {
        console.error(
          "ID card element not found"
        );
        return;
      }

      try {
        const canvas = await html2canvas(cardRef.current, {
          scale: 3,
          useCORS: true,
          allowTaint: true,
          backgroundColor: "#ffffff",
          logging: false,
        });

        const imageData =
          canvas.toDataURL("image/png");

        const pdf = new jsPDF({
          orientation: "portrait",
          unit: "mm",
          format: "a4",
        });

        const pdfWidth = 85;

        const pdfHeight =
          (canvas.height * pdfWidth) /
          canvas.width;

        const pageWidth =
          pdf.internal.pageSize.getWidth();

        const pageHeight =
          pdf.internal.pageSize.getHeight();

        const x =
          (pageWidth - pdfWidth) / 2;

        const y =
          (pageHeight - pdfHeight) / 2;

        pdf.addImage(
          imageData,
          "PNG",
          x,
          y,
          pdfWidth,
          pdfHeight
        );

        pdf.save(
          `${data.employeeName
            .replace(
              /\s+/g,
              "-"
            )}-DLE-ID-Card.pdf`
        );
      } catch (error) {
        console.error(
          "ID Card download failed:",
          error
        );
      }
    };

    useImperativeHandle(ref, () => ({
      download: downloadIdCard,
    }));

    return (
      <div className="id-card-page">

        <div className="id-card-header">
          <div>
            <span>EMPLOYEE ID CARD</span>

            <h2>
              Employee Identity Card
            </h2>

            <p>
              Digital employee identity card
              generated from registered profile
            </p>
          </div>

          <button
            type="button"
            className="download-id-button"
            onClick={downloadIdCard}
          >
            <FiDownload />
            Download ID Card
          </button>
        </div>

        <div className="id-card-area">

          <div
            className="employee-id-card"
            ref={cardRef}
          >

            <div className="card-hero">

              <div className="hero-top-row">

                <div className="brand-mark">
                  <div className="logo-chip">

                    <img
                      src={data.companyLogo}
                      alt="Company Logo"
                    />

                  </div>
                </div>

                <div className="status-pill">
                  <FiShield />
                  <span>
                    DLE Employee
                  </span>
                </div>

              </div>

              <div className="hero-waves-id">
                <div className="wave-layer-id wave-red-id" />
                <div className="wave-layer-id wave-silver-id" />
                <div className="wave-layer-id wave-white-id" />
              </div>

            </div>

            <div className="photo-ring">
              {data.profilePhotoUrl && !photoLoadFailed ? (
                <img
                  className="id-card-profile-photo"
                  src={data.profilePhotoUrl}
                  alt={`${data.employeeName} profile`}
                  referrerPolicy="no-referrer"
                  onError={() => setPhotoLoadFailed(true)}
                />
              ) : (
                <div className="profile-avatar-placeholder">
                  {data.employeeName
                    .charAt(0)
                    .toUpperCase()}
                </div>
              )}
            </div>

            <div className="id-body">

              <h1 className="id-name">
                {data.employeeName}
              </h1>

              <p className="id-role">
                {data.designation}
              </p>

              <div className="id-divider" />

              <div className="id-detail-list">

                {detailRows.map((row) => (
                  <div
                    className="id-detail-row"
                    key={row.label}
                  >
                    <span className="detail-label">
                      {row.label}
                    </span>

                    <span className="detail-sep">
                      :
                    </span>

                    <span className="detail-value">
                      {row.value}
                    </span>
                  </div>
                ))}

              </div>

              <div className="id-address">

                <span>
                  ADDRESS AS PER DOCUMENT
                </span>

                <strong>
                  {data.address}
                </strong>

              </div>

              <div className="id-footer">

                <div className="footer-block">
                  <span>
                    ID CARD STATUS
                  </span>

                  <strong>
                    {data.validity}
                  </strong>
                </div>

                <div className="footer-brand">
                  <span>
                    AUTHORIZED
                  </span>

                  <FiShield />
                </div>

              </div>

            </div>

          </div>

        </div>

      </div>
    );
  }
);

EmployeeIdCard.displayName = "EmployeeIdCard";

const DLEIdCardPage = () => {
  const [employeeData, setEmployeeData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const loadProfile = () => {
      const user = getUser();

      if (!user?.id) {
        setError("Please login again to view your ID card.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      localApi
        .get(app.auth.profile, { params: { userId: user.id } })
        .then(({ data }) => {
          if (cancelled) return;
          if (data?.success && data.user) {
            setEmployeeData(data.user);
          } else {
            setError(data?.message || "Unable to load ID card details.");
          }
        })
        .catch((err) => {
          if (cancelled) return;
          console.error("ID Card profile API Error:", err);
          setError("Unable to load ID card details.");
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    };

    loadProfile();

    const onAuthUpdated = () => loadProfile();
    window.addEventListener("dle-auth-updated", onAuthUpdated);
    window.addEventListener("focus", onAuthUpdated);

    return () => {
      cancelled = true;
      window.removeEventListener("dle-auth-updated", onAuthUpdated);
      window.removeEventListener("focus", onAuthUpdated);
    };
  }, []);

  if (loading) {
    return <p className="dle-loading-text">Loading ID card…</p>;
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
      <EmployeeIdCard employeeData={employeeData} />
    </>
  );
};

export default DLEIdCardPage;