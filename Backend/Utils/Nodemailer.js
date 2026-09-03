import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD
  }
});

export const sendApprovalEmail = async ({
  name,
  email,
  password
}) => {
  await transporter.sendMail({
    from: `"DLE Registration" <${process.env.SMTP_USER}>`,
    to: email,
    subject: "DLE Registration Approved",
    html: `
      <div style="font-family: Arial; padding: 20px;">
        <h2>DLE Registration Approved</h2>

        <p>Hello <strong>${name}</strong>,</p>

        <p>
          Your DLE registration has been approved successfully.
        </p>

        <p>
          You can now login using the credentials below:
        </p>

        <div style="
          background:#f5f5f5;
          padding:15px;
          border-radius:8px;
          margin:15px 0;
        ">
          <p>
            <strong>Email:</strong> ${email}
          </p>

          <p>
            <strong>Password:</strong> ${password}
          </p>
        </div>

        <p>
          Please keep your password secure.
        </p>

        <p>
          Regards,<br/>
          DLE Team
        </p>
      </div>
    `
  });
};


export const sendRejectionEmail = async ({
  name,
  email,
  remark
}) => {
  await transporter.sendMail({
    from: `"DLE Registration" <${process.env.SMTP_USER}>`,
    to: email,
    subject: "DLE Registration Rejected",
    html: `
      <div style="font-family: Arial; padding: 20px;">
        <h2>DLE Registration Rejected</h2>

        <p>Hello <strong>${name}</strong>,</p>

        <p>
          We regret to inform you that your DLE registration
          has been rejected.
        </p>

        <div style="
          background:#fff2f2;
          padding:15px;
          border-radius:8px;
          margin:15px 0;
          border-left: 4px solid #d9534f;
        ">
          <p>
            <strong>Reason / Remark:</strong>
          </p>
          <p>${remark}</p>
        </div>

        <p>
          If you believe this is a mistake, please contact
          the admin team for more details.
        </p>

        <p>
          Regards,<br/>
          DLE Team
        </p>
      </div>
    `
  });
};