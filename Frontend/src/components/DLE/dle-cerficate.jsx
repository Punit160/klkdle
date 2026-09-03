import React, {
  forwardRef,
  useImperativeHandle,
  useRef,
} from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import "../../styles/DLE/dle-certificate.css";

const DEFAULT_ACHIEVEMENT_TEXT =
  "In recognition of outstanding dedication, consistent performance, and valuable contribution to the organization's growth and success.";

const getOrdinal = (n) => {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;

  return (
    n +
    (s[(v - 20) % 10] || s[v] || s[0])
  );
};

const formatDate = (dateInput) => {
  if (!dateInput) return "—";

  const date = new Date(dateInput);

  if (isNaN(date.getTime())) return "—";

  const day = date.getDate();

  const month = date.toLocaleString("en-US", {
    month: "long",
  });

  const year = date.getFullYear();

  return `${getOrdinal(day)} ${month} ${year}`;
};

const EmployeeCertificate = forwardRef(
  ({ employeeData }, ref) => {
    const certificateRef = useRef(null);

    const employeeName =
      employeeData?.name || "Employee";

    const employeeId = employeeData?.id
      ? `DLE-${String(
          employeeData.id
        ).padStart(6, "0")}`
      : "DLE-000000";

    const issueDate =
      employeeData?.created_at || new Date();

    const downloadCertificate = async () => {
      if (!certificateRef.current) {
        console.error(
          "Certificate element not found"
        );
        return;
      }

      try {
        const canvas = await html2canvas(
          certificateRef.current,
          {
            scale: 2,
            useCORS: true,
            backgroundColor: "#ffffff",
            logging: false,
          }
        );

        const imageData =
          canvas.toDataURL("image/png");

        const pdf = new jsPDF({
          orientation: "landscape",
          unit: "mm",
          format: "a4",
        });

        const pageWidth =
          pdf.internal.pageSize.getWidth();

        const pageHeight =
          pdf.internal.pageSize.getHeight();

        const imageWidth =
          pageWidth - 20;

        const imageHeight =
          (canvas.height * imageWidth) /
          canvas.width;

        const x = 10;

        const y =
          (pageHeight - imageHeight) / 2;

        pdf.addImage(
          imageData,
          "PNG",
          x,
          y,
          imageWidth,
          imageHeight
        );

        pdf.save(
          `${employeeName
            .replace(
              /\s+/g,
              "-"
            )}-DLE-Certificate.pdf`
        );
      } catch (error) {
        console.error(
          "Certificate download failed:",
          error
        );
      }
    };

    useImperativeHandle(ref, () => ({
      download: downloadCertificate,
    }));

    return (
      <div className="dle-certificate-wrapper">

        <div className="dle-certificate-actions no-print">
          <button
            type="button"
            className="dle-print-btn"
            onClick={downloadCertificate}
          >
            Download Certificate
          </button>
        </div>

        <div
          className="dle-certificate"
          id="dle-certificate"
          ref={certificateRef}
        >
          <span
            className="dle-corner dle-corner-tl"
            aria-hidden="true"
          />

          <span
            className="dle-corner dle-corner-br"
            aria-hidden="true"
          />

          <span
            className="dle-watermark"
            aria-hidden="true"
          >
            KLK
          </span>

          <div className="dle-frame">

            <header className="dle-header-cer">
              <img
                src="/images/logo-full.png"
                alt="KLK Logo"
                className="dle-logo"
              />

              <p className="dle-company-name">
                KLK Venture
              </p>

              <p className="dle-tagline">
                Excellence Through Dedication
              </p>
            </header>

            <div className="dle-title-block">
              <h1 className="dle-title">
                Certificate of Excellence
              </h1>

              <span
                className="dle-title-divider"
                aria-hidden="true"
              />
            </div>

            <p className="dle-presented-to">
              This certificate is proudly presented
              to
            </p>

            <h2 className="dle-employee-name">
              {employeeName}
            </h2>

            <p className="dle-designation">
              DLE KLK Venture
            </p>

            <div
              className="dle-ornament"
              aria-hidden="true"
            >
              <span></span>
              <i></i>
              <span></span>
            </div>

            <p className="dle-achievement-text">
              {DEFAULT_ACHIEVEMENT_TEXT}
            </p>

            <footer className="dle-footer-cer">

              <div className="dle-footer-col">
                <p className="dle-footer-value">
                  {formatDate(issueDate)}
                </p>

                <span className="dle-footer-line"></span>

                <p className="dle-footer-label">
                  Date Issued
                </p>
              </div>

              <div
                className="dle-seal"
                aria-hidden="true"
              >
                <div className="dle-seal-ring">
                  <span className="dle-seal-star">
                    ★
                  </span>
                </div>
              </div>

              <div className="dle-footer-col">
                <p className="dle-footer-value">
                  {employeeId}
                </p>

                <span className="dle-footer-line"></span>

                <p className="dle-footer-label">
                  Employee ID
                </p>
              </div>

            </footer>

            <p className="dle-cert-id">
              Certificate ID: CERT-{employeeId}
            </p>

          </div>
        </div>
      </div>
    );
  }
);

export default EmployeeCertificate;