import { useState } from "react";
import localApi from "../../api/localApi";
import { app } from "../../api/routes";
import {
  FiMail,
  FiLock,
  FiEye,
  FiEyeOff,
  FiArrowRight,
  FiShield,
} from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import { saveAuthData } from "../../utils/auth"; 
import "../../styles/DLE/dle-login-section.css";

const Login = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    rememberMe: false,
  });

  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const response = await localApi.post(app.auth.login, {
        email: formData.email,
        password: formData.password,
      });

      console.log("LOGIN RESPONSE:", response.data);

      if (response.data.success) {
        const user = response.data.user;
        saveAuthData(response.data.token, user);
        navigate("/DLE/dashboard");
      } else {
        alert(response.data.message || "Login failed");
      }
    } catch (error) {
      console.log("LOGIN ERROR:", error);

      alert(
        error.response?.data?.message ||
        error.message ||
        "Login failed"
      );
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

            <div className="logo-wrapper">
              <img
                src="/images/logo-full.png"
                alt="KLK Logo"
                className="company-logo"
              />
            </div>

            <div className="brand-text">
              <span className="welcome-small">WELCOME BACK</span>

              <h2>
               Welcome to KLK Ventures ERP
              </h2>

              <p>
                Sign in to access your centralized platform for managing solar panels, solar street lights, production, inventory, dispatch, installation, AMC, and operations — all in one secure dashboard.
              </p>
            </div>

            <div className="security-badge">
              <div className="security-icon">
                <FiShield />
              </div>

              <div>
                <strong>Secure Login</strong>
                <span>Your information is protected</span>
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
                  />
                </div>
              </div>

              <div className="input-group">
                <div className="password-label">
                  <label htmlFor="password">Password</label>

                  <button
                    type="button"
                    className="forgot-password"
                    onClick={() => console.log("Forgot Password")}
                  >
                    Forgot Password?
                  </button>
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

              <button type="submit" className="login-button">
                <span>Sign In</span>
                <FiArrowRight />
              </button>

            </form>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Login;