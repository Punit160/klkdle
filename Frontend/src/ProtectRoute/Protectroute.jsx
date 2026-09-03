import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { getToken } from "../utils/auth";
import { pages } from "../api/routes";

const ProtectedRoute = () => {
  if (!getToken()) {
    return <Navigate to={pages.login} replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;