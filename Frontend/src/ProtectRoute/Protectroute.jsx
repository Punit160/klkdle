import React from "react";
import { Navigate, Outlet } from "react-router-dom";

const ProtectedRoute = () => {
  const token = localStorage.getItem("dleToken");

  if (!token) {
    return <Navigate to="/dle/login" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;