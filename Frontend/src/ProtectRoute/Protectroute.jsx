import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { getToken } from "../utils/auth";

const ProtectedRoute = () => {
  if (!getToken()) {
    return <Navigate to="/authentication/login/" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;