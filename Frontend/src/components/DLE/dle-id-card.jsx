import React, {
  forwardRef,
  useImperativeHandle,
  useRef,
} from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { FiDownload, FiShield } from "react-icons/fi";
import "../../styles/DLE/dle-id-card.css";

const EmployeeIdCard = forwardRef(
  ({ employeeData }, ref) => {
    const cardRef = useRef(null);

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
        const canvas = await html2canvas(
          cardRef.current,
          {
            scale: 3,
            useCORS: true,
            backgroundColor: "#ffffff",
            logging: false,
          }
        );

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
              <div className="profile-avatar-placeholder">
                {data.employeeName
                  .charAt(0)
                  .toUpperCase()}
              </div>
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

export default EmployeeIdCard;