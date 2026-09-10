import React, { forwardRef, useImperativeHandle, useRef } from "react";

import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { FiDownload } from "react-icons/fi";
import "../../styles/DLE/dle-certificate.css";

const LETTERHEAD_URL = "/images/klk_letter_head.jpeg";

const DleCertificate = forwardRef(({ employeeData, hideHeader = false }, ref) => {
  const certRef = useRef(null);
  const bgImgRef = useRef(null);

  const data = {
    certificateId: employeeData?.id
      ? `KLK/DLE/${new Date().getFullYear()}/${String(employeeData.id).padStart(5, "0")}`
      : "KLK/DLE/0000/00000",
    employeeName: employeeData?.name || "Employee",
    employeeDesignation: "DLE Registered Employee",
    associationDate: employeeData?.created_at
      ? new Date(employeeData.created_at).toLocaleDateString("en-IN", {
          day: "numeric",
          month: "long",
          year: "numeric",
        })
      : "—",
    validTill: employeeData?.police_verification_validity || "—",
  };

  const waitForImage = () =>
    new Promise((resolve) => {
      const img = bgImgRef.current;
      if (!img) return resolve();
      if (img.complete && img.naturalHeight !== 0) {
        resolve();
        return;
      }
      img.onload = () => resolve();
      img.onerror = () => resolve();
    });

  const downloadCertificate = async () => {
    if (!certRef.current) {
      console.error("Certificate element not found");
      return;
    }

    try {
      await waitForImage();
      if (document.fonts?.ready) {
        await document.fonts.ready;
      }

      const canvas = await html2canvas(certRef.current, {
        scale: 3,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
        imageTimeout: 15000,
      });

      const imageData = canvas.toDataURL("image/png");

      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const canvasRatio = canvas.width / canvas.height;
      const pageRatio = pageWidth / pageHeight;

      let imgWidth;
      let imgHeight;

      if (canvasRatio > pageRatio) {
        imgWidth = pageWidth;
        imgHeight = pageWidth / canvasRatio;
      } else {
        imgHeight = pageHeight;
        imgWidth = pageHeight * canvasRatio;
      }

      const x = (pageWidth - imgWidth) / 2;
      const y = (pageHeight - imgHeight) / 2;

      pdf.addImage(imageData, "PNG", x, y, imgWidth, imgHeight);
      pdf.save(`${data.employeeName.replace(/\s+/g, "-")}-DLE-Certificate.pdf`);
    } catch (error) {
      console.error("Certificate download failed:", error);
    }
  };

  useImperativeHandle(ref, () => ({
    download: downloadCertificate,
  }));

  return (
    <div className={`certificate-page ${hideHeader ? "certificate-page-embedded" : ""}`}>
      {!hideHeader && (
        <div className="certificate-header">
          <div>
            <span>ASSOCIATION CERTIFICATE</span>
            <h2>Employee Certificate</h2>
            <p>Digital association certificate generated from registered profile</p>
          </div>

          <button
            type="button"
            className="download-id-button"
            onClick={downloadCertificate}
          >
            <FiDownload />
            Download Certificate
          </button>
        </div>
      )}

      <div className="certificate-area">
        <div className="certificate-wrapper">
          <div className="dle-certificate" ref={certRef}>
            <img
              ref={bgImgRef}
              className="certificate-bg-img"
              src={LETTERHEAD_URL}
              alt=""
              crossOrigin="anonymous"
            />

            <div className="certificate-heading">
              <div className="heading-line">
                <span></span>
                <b>❧</b>
                <span></span>
              </div>

              <h1>ASSOCIATION CERTIFICATE</h1>

              <div className="heading-line bottom">
                <span></span>
                <b>❧</b>
                <span></span>
              </div>
            </div>

            <div className="certificate-intro">
              <p>This is to certify that</p>
              <h2>{data.employeeName}</h2>
              <div className="name-border"></div>
              <h3>{data.employeeDesignation}</h3>
            </div>

            <div className="certificate-content">
              <p>
                is officially associated with{" "}
                <strong>KLK Ventures Private Limited</strong>
              </p>
              <p>
                in the capacity of <b>DLE Registered Employee.</b>
              </p>
              <p className="authorization">
                He is authorized to represent the company for official duties
                <br />
                and responsibilities as assigned.
              </p>
            </div>

            <div className="certificate-note">
              <p>
                This certificate is issued upon the employee&apos;s request
                <br />
                for official reference and site visits.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

export default DleCertificate;
