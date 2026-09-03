import { createBrowserRouter } from "react-router-dom"
import RootLayout from "../layout/root"
import LayoutAuth from "../layout/layoutAuth"
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

export const router = createBrowserRouter([
    {
        path: "/",
        element: (
            <ProtectedRoute>
                <RootLayout />
            </ProtectedRoute>
        ),
        children: [
          

            {
                path: "DLE/dashboard",
                element: < DLEDashboard />
            },

            {
                path: "bihar/ssl/dashboard",
                element: <Dashboard />
            },

            {
                path: "bihar/ssl-amc/upload-form",
                element: <UploadForm />
            },

            {
                path: "bihar/ssl-amc/view-document",
                element: <DocumentList />
            },

            {
                path: "bihar/ssl-amc/view-document-details",
                element: <DocumentDetails />
            },


                 {
                path: "bihar/ssl-amc/complaint",
                element: <Complaint />
            },

                        {
                path: "bihar/ssl-amc/view-complaint",
                element: < ViewComplaint/>
            },

            {
                path: "bihar/ssl-amc/light-amc",
                element: <LightAmcForm region="bihar" />
            },

            {
                path: "bihar/ssl-amc/view-light-amc",
                element: <LightAmcList region="bihar" />
            },

            {
                path: "bihar/ssl-amc/view-light-amc-details",
                element: <LightAmcDetails region="bihar" />
            },




            // uttarpradesh 

            
            {
                path: "uttarpradesh/ssl-amc/upload-form",
                element: <UPUploadForm />
            },

    
             {
                path: "uttarpradesh/ssl-amc/Dashboard",
                element: <UPDashboard/>
            },
             {
                path: "uttarpradesh/ssl-amc/view-document-details",
                element: <UPDocumentDetails/>
            },

            {
                path: "uttarpradesh/ssl-amc/view-document",
                element: <UPDocumentList/>
            },

            {
                path: "uttarpradesh/ssl-amc/light-amc",
                element: <LightAmcForm region="up" />
            },

            {
                path: "uttarpradesh/ssl-amc/view-light-amc",
                element: <LightAmcList region="up" />
            },

            {
                path: "uttarpradesh/ssl-amc/view-light-amc-details",
                element: <LightAmcDetails region="up" />
            },




            {
                path: "dle/user-profile",
                element: <DLEProfile />
            },

            {
                path: "dle/id-card",
                element: <DLECard />
            },


            {
                path: "dle/user-cerficate",
                element: <DLECertificate />
            }


        ]


    },

    {
        path: "dle/register-form",
        element: <DLERegisterForm />
    },

    {
        path: "/",
        element: <LayoutAuth />,
        children: [
            {
                path: "/authentication/login/",
                element: <Login />
            }
        ]
    }
])