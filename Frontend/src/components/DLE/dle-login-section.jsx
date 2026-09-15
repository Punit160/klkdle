import { useEffect, useState } from "react";
import localApi from "../../api/localApi";
import { app, pages } from "../../api/routes";
import {
  FiMail,
  FiLock,
  FiEye,
  FiEyeOff,
  FiArrowRight,
  FiShield,
  FiSun,
  FiFileText,
  FiMapPin,
} from "react-icons/fi";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { isAuthenticated, saveAuthData } from "../../utils/auth";
import "../../styles/DLE/dle-login-section.css";

const REMEMBER_EMAIL_KEY = "rememberEmail";

const Login = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: localStorage.getItem(REMEMBER_EMAIL_KEY) || "",
    password: "",
    rememberMe: !!localStorage.getItem(REMEMBER_EMAIL_KEY),
  });

  const navigate = useNavigate();
  const location = useLocation();
  const registrationMessage = location.state?.registered ? location.state.message : "";

  useEffect(() => {
    if (isAuthenticated()) {
      navigate(pages.dashboard, { replace: true });
    }
  }, [navigate]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));

    if (error) setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await localApi.post(app.auth.login, {
        email: formData.email.trim(),
        password: formData.password,
      });

      if (response.data.success) {
        const user = response.data.user;
        saveAuthData(response.data.token, user);

        if (formData.rememberMe) {
          localStorage.setItem(REMEMBER_EMAIL_KEY, formData.email.trim());
        } else {
          localStorage.removeItem(REMEMBER_EMAIL_KEY);
        }

        navigate(pages.dashboard);
      } else {
        setError(response.data.message || "Login failed");
      }
    } catch (err) {
      const data = err.response?.data
      setError(
        data?.message ||
        data?.error ||
        err.message ||
        "Login failed"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">

        <div className="login-brand-section">
          <div className="brand-background-circle circle-one"></div>
          <div className="brand-background-circle circle-two"></div>
          <div className="brand-background-circle circle-three"></div>

          <div className="brand-content">
            <div className="brand-inner">

              <div className="brand-text">
                <div className="logo-wrapper">
                  <img
                    src="/images/logo-full.png"
                    alt="KLK Logo"
                    className="company-logo"
                  />
                </div>

                <span className="welcome-small">WELCOME BACK</span>

                <h2>Welcome to KLK Ventures ERP</h2>

                <p>
                  Your unified workspace for solar street lights, panels, production,
                  inventory, dispatch, installation, and AMC — built for field teams
                  and operations across multiple states.
                </p>

                <p className="brand-subtext">
                  Track documents, submit AMC visits, manage complaints, and stay
                  synced with the central KLK ERP platform from one secure dashboard.
                </p>
              </div>

              <div className="brand-info-grid">
                <div className="brand-info-card">
                  <div className="brand-info-icon">
                    <FiShield />
                  </div>
                  <div>
                    <strong>Secure Login</strong>
                    <span>Encrypted access for your account</span>
                  </div>
                </div>

                <div className="brand-info-card">
                  <div className="brand-info-icon">
                    <FiSun />
                  </div>
                  <div>
                    <strong>AMC & Field Visits</strong>
                    <span>Light AMC, GPS capture & site records</span>
                  </div>
                </div>

                <div className="brand-info-card">
                  <div className="brand-info-icon">
                    <FiFileText />
                  </div>
                  <div>
                    <strong>Document Management</strong>
                    <span>Upload, view & track SSL AMC data</span>
                  </div>
                </div>

                <div className="brand-info-card">
                  <div className="brand-info-icon">
                    <FiMapPin />
                  </div>
                  <div>
                    <strong>Multi-State Operations</strong>
                    <span>Bihar, Uttar Pradesh & growing states</span>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>

        <div className="login-form-section">
          <div className="login-card">

            <div className="mobile-logo">
              <img src="/images/logo-full.png" alt="Company Logo" />
            </div>

            <div className="login-heading">
              <span>ACCOUNT LOGIN</span>
              <h2>Sign in</h2>
              <p>
                Enter your details to continue
              </p>
            </div>

            <form onSubmit={handleSubmit}>
              {registrationMessage && (
                <div className="login-success" role="status">
                  {registrationMessage}
                </div>
              )}

              {error && (
                <div className="login-error" role="alert">
                  {error}
                </div>
              )}

              <div className="input-group">
                <label htmlFor="email">Email Address</label>

                <div className="input-wrapper">
                  <FiMail className="input-icon" />

                  <input
                    id="email"
                    type="email"
                    name="email"
                    placeholder="Enter your email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    autoComplete="email"
                  />
                </div>
              </div>

              <div className="input-group">
                <div className="password-label">
                  <label htmlFor="password">Password</label>
                </div>

                <div className="input-wrapper">
                  <FiLock className="input-icon" />

                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    name="password"
                    placeholder="Enter your password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    autoComplete="current-password"
                  />

                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={
                      showPassword
                        ? "Hide password"
                        : "Show password"
                    }
                  >
                    {showPassword ? <FiEyeOff /> : <FiEye />}
                  </button>
                </div>
              </div>

              <div className="login-options">
                <label className="remember-me">
                  <input
                    type="checkbox"
                    name="rememberMe"
                    checked={formData.rememberMe}
                    onChange={handleChange}
                  />

                  <span className="custom-checkbox"></span>

                  <span>Remember me</span>
                </label>
              </div>

              <button type="submit" className="login-button" disabled={loading}>
                <span>{loading ? "Signing in..." : "Sign In"}</span>
                {!loading && <FiArrowRight />}
              </button>

              <div className="login-footer">
                <span>Don&apos;t have an account?</span>
                <Link to={pages.register}>Register</Link>
              </div>

            </form>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Login;
