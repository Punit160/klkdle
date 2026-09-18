import { createBrowserRouter, Navigate } from "react-router-dom"
import RootLayout from "../layout/root"
import ProtectedRoute from "../routes/ProtectedRoute"
import StateRoute from "../routes/StateRoute"

import Dashboard from "../pages/Bihar/BiharSSL/AMC/Dashboard"
import UploadForm from "../pages/Bihar/BiharSSL/AMC/UploadForm"
import DocumentList from "../pages/Bihar/BiharSSL/AMC/DocumentList"
import DocumentDetails from "../pages/Bihar/BiharSSL/AMC/DocumentDetails"

import DLEProfile from "../components/DLE/dle-profile"
import DLECard from "../components/DLE/dle-id-card"
import DLERegisterForm from "../components/DLE/dle-Register-form"
import DLECertificate from "../components/DLE/dle-Emp-certi-Sec"

import Login from "../components/DLE/dle-login-section"
import DLEDashboard from "../components/DLE/dle-dashboard"

import UPUploadForm from "../pages/UP/UPSSL/AMC/UploadForm"
import UPDashboard from "../pages/UP/UPSSL/AMC/Dashboard"
import UPDocumentList from "../pages/UP/UPSSL/AMC/DocumentList"
import UPDocumentDetails from "../pages/UP/UPSSL/AMC/DocumentDetails"
import Complaint from "../pages/Bihar/BiharSSL/AMC/Complaint"
import ViewComplaint from "../pages/Bihar/BiharSSL/AMC/ViewComplaint"
import AssignAmc from "../pages/Bihar/BiharSSL/AMC/AssignAmc"
import LightAmcForm from "../pages/AMC/LightAmcForm"
import LightAmcList from "../pages/AMC/LightAmcList"
import LightAmcDetails from "../pages/AMC/LightAmcDetails"
import AttendanceReport from "../pages/Attendance/AttendanceReport"
import { legacyPages, pages } from "../api/routes"



import BiharUlaForm from "../pages/Bihar/BiharULA/BiharUlaForm"
import BiharUlaList from "../pages/Bihar/BiharULA/BiharUlaList"
import BiharUlaDetails from "../pages/Bihar/BiharULA/BiharUlaDetails"

const legacyRedirects = Object.entries(legacyPages).map(([from, to]) => ({
  path: from.replace(/^\/+/, "").replace(/\/+$/, ""),
  element: <Navigate to={to} replace />,
}))

export const router = createBrowserRouter([
  {
    path: "/",
    element: (
      <ProtectedRoute>
        <RootLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <Navigate to={pages.dashboard} replace /> },

      { path: pages.dashboard.slice(1), element: <DLEDashboard /> },
      { path: pages.profile.slice(1), element: <DLEProfile /> },
      { path: pages.attendance.slice(1), element: <AttendanceReport /> },
      { path: pages.idCard.slice(1), element: <DLECard /> },
      { path: pages.certificate.slice(1), element: <DLECertificate /> },

      { path: pages.bihar.amcDashboard.slice(1), element: <StateRoute stateKey="bihar"><Dashboard /></StateRoute> },
      { path: pages.bihar.assignAmc.slice(1), element: <StateRoute stateKey="bihar"><AssignAmc /></StateRoute> },
      { path: pages.bihar.amcUpload.slice(1), element: <StateRoute stateKey="bihar"><UploadForm /></StateRoute> },
      { path: pages.bihar.amcList.slice(1), element: <StateRoute stateKey="bihar"><DocumentList /></StateRoute> },
      { path: pages.bihar.amcDetails.slice(1), element: <StateRoute stateKey="bihar"><DocumentDetails /></StateRoute> },
      { path: pages.bihar.complaint.slice(1), element: <StateRoute stateKey="bihar"><Complaint /></StateRoute> },
      { path: pages.bihar.complaints.slice(1), element: <StateRoute stateKey="bihar"><ViewComplaint /></StateRoute> },
      { path: pages.bihar.lightAmc.slice(1), element: <StateRoute stateKey="bihar"><LightAmcForm region="bihar" /></StateRoute> },
      { path: pages.bihar.lightAmcList.slice(1), element: <StateRoute stateKey="bihar"><LightAmcList region="bihar" /></StateRoute> },
      { path: pages.bihar.lightAmcDetails.slice(1), element: <StateRoute stateKey="bihar"><LightAmcDetails region="bihar" /></StateRoute> },
      
            { path: (pages.bihar?.ulaForm || '/bihar/ula/form').slice(1), element: <StateRoute stateKey="bihar"><BiharUlaForm /></StateRoute> },
      { path: (pages.bihar?.ulaList || '/bihar/ula/list').slice(1), element: <StateRoute stateKey="bihar"><BiharUlaList /></StateRoute> },
      { path: (pages.bihar?.ulaDetails || '/bihar/ula/details').slice(1), element: <StateRoute stateKey="bihar"><BiharUlaDetails /></StateRoute> },

      { path: pages.up.amcDashboard.slice(1), element: <StateRoute stateKey="up"><UPDashboard /></StateRoute> },
      { path: pages.up.amcUpload.slice(1), element: <StateRoute stateKey="up"><UPUploadForm /></StateRoute> },
      { path: pages.up.amcList.slice(1), element: <StateRoute stateKey="up"><UPDocumentList /></StateRoute> },
      { path: pages.up.amcDetails.slice(1), element: <StateRoute stateKey="up"><UPDocumentDetails /></StateRoute> },
      { path: pages.up.lightAmc.slice(1), element: <StateRoute stateKey="up"><LightAmcForm region="up" /></StateRoute> },
      { path: pages.up.lightAmcList.slice(1), element: <StateRoute stateKey="up"><LightAmcList region="up" /></StateRoute> },
      { path: pages.up.lightAmcDetails.slice(1), element: <StateRoute stateKey="up"><LightAmcDetails region="up" /></StateRoute> },
    ],
  },

  { path: pages.login, element: <Login /> },
  { path: pages.register, element: <DLERegisterForm /> },

  ...legacyRedirects,
])
