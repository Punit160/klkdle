import { createBrowserRouter, Navigate } from "react-router-dom"
import RootLayout from "../layout/root"
import ProtectedRoute from "../routes/ProtectedRoute"

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
import LightAmcForm from "../pages/AMC/LightAmcForm"
import LightAmcList from "../pages/AMC/LightAmcList"
import LightAmcDetails from "../pages/AMC/LightAmcDetails"
import { legacyPages, pages } from "../api/routes"

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
      { path: pages.idCard.slice(1), element: <DLECard /> },
      { path: pages.certificate.slice(1), element: <DLECertificate /> },

      { path: pages.bihar.amcDashboard.slice(1), element: <Dashboard /> },
      { path: pages.bihar.amcUpload.slice(1), element: <UploadForm /> },
      { path: pages.bihar.amcList.slice(1), element: <DocumentList /> },
      { path: pages.bihar.amcDetails.slice(1), element: <DocumentDetails /> },
      { path: pages.bihar.complaint.slice(1), element: <Complaint /> },
      { path: pages.bihar.complaints.slice(1), element: <ViewComplaint /> },
      { path: pages.bihar.lightAmc.slice(1), element: <LightAmcForm region="bihar" /> },
      { path: pages.bihar.lightAmcList.slice(1), element: <LightAmcList region="bihar" /> },
      { path: pages.bihar.lightAmcDetails.slice(1), element: <LightAmcDetails region="bihar" /> },

      { path: pages.up.amcDashboard.slice(1), element: <UPDashboard /> },
      { path: pages.up.amcUpload.slice(1), element: <UPUploadForm /> },
      { path: pages.up.amcList.slice(1), element: <UPDocumentList /> },
      { path: pages.up.amcDetails.slice(1), element: <UPDocumentDetails /> },
      { path: pages.up.lightAmc.slice(1), element: <LightAmcForm region="up" /> },
      { path: pages.up.lightAmcList.slice(1), element: <LightAmcList region="up" /> },
      { path: pages.up.lightAmcDetails.slice(1), element: <LightAmcDetails region="up" /> },
    ],
  },

  { path: pages.login, element: <Login /> },
  { path: pages.register, element: <DLERegisterForm /> },

  ...legacyRedirects,
])
