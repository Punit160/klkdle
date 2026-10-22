import { createBrowserRouter, Navigate } from "react-router-dom"
import RootLayout from "../layout/root"
import ProtectedRoute from "../routes/ProtectedRoute"
import PortalModuleRoute from "../routes/PortalModuleRoute"

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
import FieldVisitDashboard from "../pages/AMC/FieldVisitDashboard"
import LightAmcForm from "../pages/AMC/LightAmcForm"
import LightAmcList from "../pages/AMC/LightAmcList"
import LightAmcDetails from "../pages/AMC/LightAmcDetails"
import AttendanceReport from "../pages/Attendance/AttendanceReport"
import DailyWorkReport from "../pages/Attendance/DailyWorkReport"
import { legacyPages, pages } from "../api/routes"



import BiharUlaForm from "../pages/Bihar/BiharULA/BiharUlaForm"
import BiharUlaList from "../pages/Bihar/BiharULA/BiharUlaList"
import BiharUlaDetails from "../pages/Bihar/BiharULA/BiharUlaDetails"
import BiharUlaDashboard from "../pages/Bihar/BiharULA/BiharUlaDashboard"
import PortalAccessAdmin from "../pages/Portal/PortalAccessAdmin"
import UserMaster from "../pages/Admin/UserMaster"

const legacyRedirects = Object.entries(legacyPages).map(([from, to]) => ({
  path: from.replace(/^\/+/, "").replace(/\/+$/, ""),
  element: <Navigate to={to} replace />,
}))

const moduleRoute = (stateKey, pagePath, element) => ({
  path: pagePath.slice(1),
  element: (
    <PortalModuleRoute stateKey={stateKey} pagePath={pagePath}>
      {element}
    </PortalModuleRoute>
  ),
})

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
      { path: pages.dailyWork.slice(1), element: <DailyWorkReport /> },
      { path: pages.portalAccess.slice(1), element: <PortalAccessAdmin /> },
      { path: pages.userMaster.slice(1), element: <UserMaster /> },
      { path: pages.idCard.slice(1), element: <DLECard /> },
      { path: pages.certificate.slice(1), element: <DLECertificate /> },

      moduleRoute("bihar", pages.bihar.amcDashboard, <Dashboard />),
      moduleRoute("bihar", pages.bihar.assignAmc, <AssignAmc />),
      moduleRoute("bihar", pages.bihar.amcUpload, <UploadForm />),
      moduleRoute("bihar", pages.bihar.amcList, <DocumentList />),
      moduleRoute("bihar", pages.bihar.amcDetails, <DocumentDetails />),
      moduleRoute("bihar", pages.bihar.complaint, <Complaint />),
      moduleRoute("bihar", pages.bihar.complaints, <ViewComplaint />),
      moduleRoute("bihar", pages.bihar.lightAmc, <LightAmcForm region="bihar" />),
      moduleRoute("bihar", pages.bihar.lightAmcList, <LightAmcList region="bihar" />),
      moduleRoute("bihar", pages.bihar.lightAmcDetails, <LightAmcDetails region="bihar" />),
      moduleRoute("bihar", pages.bihar.ulaForm, <BiharUlaForm />),
      moduleRoute("bihar", pages.bihar.ulaList, <BiharUlaList />),
      moduleRoute("bihar", pages.bihar.ulaDetails, <BiharUlaDetails />),
      moduleRoute("bihar", pages.bihar.ulaDashboard, <BiharUlaDashboard />),

      moduleRoute("up", pages.up.amcDashboard, <UPDashboard />),
      moduleRoute("up", pages.up.amcUpload, <UPUploadForm />),
      moduleRoute("up", pages.up.amcList, <UPDocumentList />),
      moduleRoute("up", pages.up.amcDetails, <UPDocumentDetails />),
      moduleRoute("up", pages.up.lightAmc, <LightAmcForm region="up" />),
      moduleRoute("up", pages.up.lightAmcList, <LightAmcList region="up" />),
      moduleRoute("up", pages.up.lightAmcDetails, <LightAmcDetails region="up" />),
      moduleRoute("up", pages.up.kusumcDashboard, <FieldVisitDashboard key="kusumc-dashboard" region="kusumc" />),
      moduleRoute("up", pages.up.kusumcAmc, <LightAmcForm key="kusumc-form" region="kusumc" />),
      moduleRoute("up", pages.up.kusumcAmcList, <LightAmcList key="kusumc-list" region="kusumc" />),
      moduleRoute("up", pages.up.kusumcAmcDetails, <LightAmcDetails key="kusumc-details" region="kusumc" />),
      moduleRoute("up", pages.up.powerpackDashboard, <FieldVisitDashboard key="powerpack-dashboard" region="powerpack" />),
      moduleRoute("up", pages.up.powerpackAmc, <LightAmcForm key="powerpack-form" region="powerpack" />),
      moduleRoute("up", pages.up.powerpackAmcList, <LightAmcList key="powerpack-list" region="powerpack" />),
      moduleRoute("up", pages.up.powerpackAmcDetails, <LightAmcDetails key="powerpack-details" region="powerpack" />),
      moduleRoute("up", pages.up.offgridDashboard, <FieldVisitDashboard key="offgrid-dashboard" region="offgrid" />),
      moduleRoute("up", pages.up.offgridAmc, <LightAmcForm key="offgrid-form" region="offgrid" />),
      moduleRoute("up", pages.up.offgridAmcList, <LightAmcList key="offgrid-list" region="offgrid" />),
      moduleRoute("up", pages.up.offgridAmcDetails, <LightAmcDetails key="offgrid-details" region="offgrid" />),
      moduleRoute("up", pages.up.ongridDashboard, <FieldVisitDashboard key="ongrid-dashboard" region="ongrid" />),
      moduleRoute("up", pages.up.ongridAmc, <LightAmcForm key="ongrid-form" region="ongrid" />),
      moduleRoute("up", pages.up.ongridAmcList, <LightAmcList key="ongrid-list" region="ongrid" />),
      moduleRoute("up", pages.up.ongridAmcDetails, <LightAmcDetails key="ongrid-details" region="ongrid" />),
    ],
  },

  { path: pages.login, element: <Login /> },
  { path: pages.register, element: <DLERegisterForm /> },

  ...legacyRedirects,
])
