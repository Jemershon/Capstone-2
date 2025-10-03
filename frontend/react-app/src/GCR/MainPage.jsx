import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button, Modal, Form, Toast, Spinner, Navbar, Nav, Container, InputGroup, Alert } from "react-bootstrap";
import axios from "axios";
import { API_BASE_URL } from "../api";

// Mobile optimization styles
const mobileStyles = `
  @media (max-width: 767px) {
    /* Center all content on mobile */
    .landing-hero-section {
      padding: 20px 15px !important;
      text-align: center !important;
    }
    
    .landing-hero-section .col-md-6,
    .landing-hero-section .col-md-5 {
      width: 100% !important;
      max-width: 100% !important;
      padding: 0 15px !important;
    }
    
    .landing-hero-section h1 {
      font-size: 2rem !important;
      text-align: center !important;
      margin-bottom: 1rem !important;
    }
    
    .landing-hero-section p.lead {
      font-size: 1.1rem !important;
      text-align: center !important;
      margin-bottom: 1.5rem !important;
    }
    
    /* Button container on mobile */
    .landing-hero-buttons {
      display: flex !important;
      flex-direction: column !important;
      align-items: center !important;
      gap: 10px !important;
      width: 100% !important;
      padding: 0 15px !important;
    }
    
    .landing-hero-buttons .btn {
      width: 100% !important;
      max-width: 300px !important;
      margin: 0 !important;
    }
    
    /* Image on mobile */
    .landing-hero-image {
      margin-top: 30px !important;
      padding: 0 30px !important;
    }
    
    .landing-hero-image img {
      max-width: 250px !important;
      height: auto !important;
    }
    
    /* Features section on mobile */
    .features-section {
      padding: 30px 15px !important;
    }
    
    .features-section .row {
      gap: 15px !important;
    }
    
    .features-section .col-md-4 {
      width: 100% !important;
      padding: 0 !important;
      margin-bottom: 15px !important;
    }
    
    .features-section .card {
      margin: 0 !important;
    }
    
    /* Navbar optimization */
    .navbar {
      padding: 10px 15px !important;
    }
    
    .navbar-brand {
      font-size: 1.5rem !important;
    }
    
    .navbar-collapse {
      text-align: center !important;
      margin-top: 10px !important;
    }
    
    .navbar .btn {
      width: 100% !important;
      max-width: 200px !important;
      margin: 10px auto 0 !important;
    }
  }
`;

// Retry function for API calls
const retry = async (fn, retries = 3, delay = 1000) => {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (err) {
      if (i === retries - 1) throw err;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
};

export default function LandingPage() {
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    name: "",
    username: "",
    email: "", // Added email field
    password: "",
    role: "Student",
  });
  const [error, setError] = useState("");
  const [showToast, setShowToast] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState("");
  const [resetCode, setResetCode] = useState("");
  const [enteredCode, setEnteredCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [resetStep, setResetStep] = useState(1);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Inject mobile styles
  useEffect(() => {
    const styleElement = document.createElement('style');
    styleElement.textContent = mobileStyles;
    document.head.appendChild(styleElement);
    
    return () => {
      document.head.removeChild(styleElement);
    };
  }, []);

  const handleShowModal = () => {
    setShowModal(true);
    setError("");
    setFormData({ name: "", username: "", email: "", password: "", role: "Student" });
    setIsLogin(true);
    setShowPassword(false);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setError("");
    setFormData({ name: "", username: "", email: "", password: "", role: "Student" });
    setIsLogin(true);
    setShowPassword(false);
  };

  const handleChange = (e) => {
    setFormData((f) => ({ ...f, [e.target.name]: e.target.value }));
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.username || !formData.email || !formData.password) { // Updated validation
      setError("All fields are required");
      setShowToast(true);
      return;
    }
    setLoading(true);
    try {
      const res = await retry(() =>
        axios.post(`${API_BASE_URL}/api/register`, formData)
      );
      console.log("Register response:", res.data); // Debug log
      setError("Account created successfully! Please login.");
      setShowToast(true);
      setIsLogin(true);
      setFormData({ name: "", username: "", email: "", password: "", role: "Student" });
    } catch (err) {
      console.error("Register error:", err.response?.data || err.message);
      setError(err.response?.data?.error || "Registration failed. Check inputs.");
      setShowToast(true);
    } finally {
      setLoading(false);
    }
  };

  const handleSendResetCode = async (e) => {
    e.preventDefault();
    if (!forgotPasswordEmail) {
      setError("Please enter your email address");
      setShowToast(true);
      return;
    }
    setLoading(true);
    try {
      const res = await axios.post(`${API_BASE_URL}/api/send-reset-code`, {
        email: forgotPasswordEmail
      });
      setResetCode(res.data.resetCode);
      setError(`Reset code sent! Your code is: ${res.data.resetCode}`);
      setShowToast(true);
      setResetStep(2);
    } catch (err) {
      console.error("Send reset code error:", err.response?.data || err.message);
      setError(err.response?.data?.error || "Failed to send reset code. Please try again.");
      setShowToast(true);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = (e) => {
    e.preventDefault();
    if (!enteredCode) {
      setError("Please enter the reset code");
      setShowToast(true);
      return;
    }
    if (enteredCode !== resetCode) {
      setError("Invalid reset code. Please try again.");
      setShowToast(true);
      return;
    }
    setError("");
    setResetStep(3);
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!newPassword || !confirmPassword) {
      setError("Please fill in all fields");
      setShowToast(true);
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      setShowToast(true);
      return;
    }
    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters");
      setShowToast(true);
      return;
    }
    setLoading(true);
    try {
      await axios.post(`${API_BASE_URL}/api/reset-password`, {
        email: forgotPasswordEmail,
        resetCode: resetCode,
        newPassword: newPassword
      });
      setError("Password changed successfully! You can now login.");
      setShowToast(true);
      setTimeout(() => {
        setShowForgotPassword(false);
        setShowModal(true);
        setIsLogin(true);
        // Reset all forgot password states
        setForgotPasswordEmail("");
        setResetCode("");
        setEnteredCode("");
        setNewPassword("");
        setConfirmPassword("");
        setResetStep(1);
        setError("");
      }, 2000);
    } catch (err) {
      console.error("Reset password error:", err.response?.data || err.message);
      setError(err.response?.data?.error || "Failed to reset password. Please try again.");
      setShowToast(true);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!formData.username || !formData.password) {
      setError("Username and password are required");
      setShowToast(true);
      return;
    }
    setLoading(true);
    try {
      const res = await retry(() =>
        axios.post(`${API_BASE_URL}/api/login`, {
          username: formData.username,
          password: formData.password,
        })
      );
      
      console.log("Login response received:", {
        status: res.status,
        role: res.data.user.role,
        tokenReceived: !!res.data.token
      });
      
      // Import the setAuthData function from api.js
      const { setAuthData } = await import('../api');
      
      // Store authentication data using our helper function
      setAuthData(res.data.token, res.data.user.username, res.data.user.role);
      
      // Show success message
      setError("Login successful!");
      setShowToast(true);
      
      console.log("Redirecting to dashboard for role:", res.data.user.role);
      
      // Redirect after a short delay
      setTimeout(() => {
        if (res.data.user.role === "Student") navigate("/student/dashboard");
        else if (res.data.user.role === "Teacher") navigate("/teacher/dashboard");
        else if (res.data.user.role === "Admin") navigate("/admin/dashboard");
        else throw new Error("Invalid role");
      }, 1000);
    } catch (err) {
      console.error("Login error:", err.response?.data || err.message);
      setError(err.response?.data?.error || "Login failed. Check credentials.");
      setShowToast(true);
    } finally {
      setLoading(false);
    }
  };

  const openModalWithRole = (role) => {
    setFormData({ name: "", username: "", email: "", password: "", role });
    setIsLogin(false);
    setShowModal(true);
    setError("");
    setShowPassword(false);
  };

  return (
    <div className="d-flex flex-column min-vh-100 bg-light">
      <Navbar expand="lg" bg="white" variant="light" className="shadow-sm px-4">
        <Container fluid>
          <Navbar.Brand className="fw-bold text-primary fs-3">Remora</Navbar.Brand>
          <Navbar.Toggle aria-controls="main-nav" />
          <Navbar.Collapse id="main-nav">
            <Nav className="ms-auto align-items-lg-center">
              <Nav.Link href="#features" className="mx-2 text-dark">Features</Nav.Link>
              <Button
                className="ms-lg-3"
                onClick={handleShowModal}
                aria-label="Get started"
              >
                Get Started
              </Button>
            </Nav>
          </Navbar.Collapse>
        </Container>
      </Navbar>

      <section className="container flex-grow-1 d-flex flex-column flex-md-row align-items-center justify-content-between py-5 landing-hero-section">
        <div className="col-md-6">
          <h1 className="display-4 fw-bold text-dark">
            A Smarter Way to Learn
          </h1>
          <p className="lead text-muted mt-3">
            Connect teachers and students in one simple platform.
          </p>
          <div className="mt-4 landing-hero-buttons">
            <button
              className="btn btn-primary btn-lg me-3"
              onClick={() => openModalWithRole("Student")}
              aria-label="Join as Student"
            >
              Join as Student
            </button>
            <button
              className="btn btn-outline-secondary btn-lg"
              onClick={() => openModalWithRole("Teacher")}
              aria-label="Join as Teacher"
            >
              Join as Teacher
            </button>
          </div>
        </div>
        <div className="col-md-5 text-center mt-5 mt-md-0 landing-hero-image">
          <img
            src="https://cdn-icons-png.flaticon.com/512/3135/3135755.png"
            alt="Classroom Illustration"
            className="img-fluid"
          />
        </div>
      </section>

      <section id="features" className="py-5 bg-white features-section">
        <div className="container text-center">
          <h2 className="fw-bold mb-5">Features</h2>
          <div className="row g-4">
            <div className="col-md-4">
              <div className="card shadow-sm h-100">
                <div className="card-body">
                  <h5 className="card-title">Easy Classroom Management</h5>
                  <p className="text-muted">
                    Create, manage, and join classes with just a few clicks.
                  </p>
                </div>
              </div>
            </div>
            <div className="col-md-4">
              <div className="card shadow-sm h-100">
                <div className="card-body">
                  <h5 className="card-title">Assignments & Quizzes</h5>
                  <p className="text-muted">
                    Post assignments and quizzes, and track student progress
                    easily.
                  </p>
                </div>
              </div>
            </div>
            <div className="col-md-4">
              <div className="card shadow-sm h-100">
                <div className="card-body">
                  <h5 className="card-title">Collaboration Tools</h5>
                  <p className="text-muted">
                    Enable discussions, announcements, and resource sharing.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="bg-light text-center py-3 mt-auto border-top">
        <small className="text-muted">
          © {new Date().getFullYear()} Remora. All rights reserved.
        </small>
      </footer>

      {/* Modal for Login/Register */}
      <Modal show={showModal} onHide={handleCloseModal} centered>
        <Modal.Header closeButton>
          <Modal.Title>{isLogin ? "Login" : "Create Account"}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {error && (
            <Toast
              show={showToast}
              onClose={() => setShowToast(false)}
              delay={5000}
              autohide
              bg={error.toLowerCase().includes("success") ? "success" : "danger"}
              style={{ position: "absolute", top: "10px", right: "10px", zIndex: 10000 }}
            >
              <Toast.Body className="text-white">{error}</Toast.Body>
            </Toast>
          )}
          <Form onSubmit={isLogin ? handleLogin : handleRegister}>
            {!isLogin && (
              <Form.Floating className="mb-3">
                <Form.Control
                  id="floatingName"
                  name="name"
                  type="text"
                  placeholder="Name"
                  value={formData.name}
                  onChange={handleChange}
                  required={!isLogin}
                  aria-required={!isLogin}
                />
                <label htmlFor="floatingName">Name</label>
              </Form.Floating>
            )}
            {!isLogin && (
              <Form.Floating className="mb-3">
                <Form.Control
                  id="floatingUsername"
                  name="username"
                  type="text"
                  placeholder="Username"
                  value={formData.username}
                  onChange={handleChange}
                  required={!isLogin}
                  aria-required={!isLogin}
                />
                <label htmlFor="floatingUsername">Username</label>
              </Form.Floating>
            )}
            {!isLogin && (
              <Form.Floating className="mb-3">
                <Form.Control
                  id="floatingEmail"
                  name="email"
                  type="email"
                  placeholder="Email"
                  value={formData.email}
                  onChange={handleChange}
                  required={!isLogin}
                  aria-required={!isLogin}
                />
                <label htmlFor="floatingEmail">Email</label>
              </Form.Floating>
            )}
            {isLogin && (
              <Form.Floating className="mb-3">
                <Form.Control
                  id="floatingLoginUsername"
                  name="username"
                  type="text"
                  placeholder="Username"
                  value={formData.username}
                  onChange={handleChange}
                  required
                  aria-required="true"
                />
                <label htmlFor="floatingLoginUsername">Username</label>
              </Form.Floating>
            )}
            <Form.Floating className="mb-3" style={{ position: 'relative' }}>
              <Form.Control
                id="floatingPassword"
                name="password"
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={formData.password}
                onChange={handleChange}
                required
                aria-required="true"
                style={{ paddingRight: '50px' }}
              />
              <label htmlFor="floatingPassword">Password</label>
              <Button
                variant="outline-secondary"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  zIndex: 3,
                  background: 'transparent',
                  border: 'none',
                  color: '#6c757d'
                }}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                <i className={`bi ${showPassword ? 'bi-eye-slash' : 'bi-eye'}`}></i>
              </Button>
            </Form.Floating>
            {!isLogin && (
              <Form.Select
                className="mb-3"
                value={formData.role}
                onChange={(e) =>
                  setFormData({ ...formData, role: e.target.value })
                }
                aria-label="Select role"
              >
                <option value="Student">Student</option>
                <option value="Teacher">Teacher</option>
              </Form.Select>
            )}
            <Button
              type="submit"
              className="w-100"
              disabled={loading}
              aria-label={isLogin ? "Login" : "Create Account"}
            >
              {loading ? (
                <Spinner animation="border" size="sm" aria-label="Processing" />
              ) : (
                isLogin ? "Login" : "Create Account"
              )}
            </Button>
          </Form>
          {isLogin && (
            <div className="text-center mt-2">
              <small>
                <span
                  className="text-primary"
                  style={{ cursor: "pointer", textDecoration: "underline" }}
                  onClick={() => {
                    setShowModal(false);
                    setShowForgotPassword(true);
                  }}
                  role="button"
                  aria-label="Forgot password"
                >
                  Forgot Password?
                </span>
              </small>
            </div>
          )}
          <div className="text-center mt-3">
            <small>
              {isLogin ? (
                <>
                  Don't have an account?{" "}
                  <span
                    className="text-primary"
                    style={{ cursor: "pointer" }}
                    onClick={() => {
                      setIsLogin(false);
                      setShowPassword(false);
                    }}
                    role="button"
                    aria-label="Switch to create account"
                  >
                    Create one
                  </span>
                </>
              ) : (
                <>
                  Already have an account?{" "}
                  <span
                    className="text-primary"
                    style={{ cursor: "pointer" }}
                    onClick={() => {
                      setIsLogin(true);
                      setShowPassword(false);
                    }}
                    role="button"
                    aria-label="Switch to login"
                  >
                    Login
                  </span>
                </>
              )}
            </small>
          </div>
        </Modal.Body>
      </Modal>

      {/* Forgot Password Modal */}
      <Modal 
        show={showForgotPassword} 
        onHide={() => {
          setShowForgotPassword(false);
          setForgotPasswordEmail("");
          setResetCode("");
          setEnteredCode("");
          setNewPassword("");
          setConfirmPassword("");
          setResetStep(1);
          setError("");
        }} 
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>
            {resetStep === 1 && "Forgot Password"}
            {resetStep === 2 && "Enter Reset Code"}
            {resetStep === 3 && "Create New Password"}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {error && (
            <Alert 
              variant={
                error.toLowerCase().includes("success") || 
                error.toLowerCase().includes("sent") || 
                error.toLowerCase().includes("changed")
                  ? "success" 
                  : "danger"
              }
              className="mb-3"
            >
              {error.includes("code is:") ? (
                <div>
                  <strong>Reset Code Sent!</strong>
                  <div className="mt-2">
                    <code style={{ fontSize: "1.3rem", padding: "8px 15px", background: "#f8f9fa", borderRadius: "4px", fontWeight: "bold" }}>
                      {error.split("code is:")[1].trim()}
                    </code>
                  </div>
                  <small className="text-muted d-block mt-2">Enter this code in the next step</small>
                </div>
              ) : (
                error
              )}
            </Alert>
          )}

          {/* Step 1: Enter Email */}
          {resetStep === 1 && (
            <>
              <p className="text-muted mb-3">
                Enter your email address and we'll send you a reset code.
              </p>
              <Form onSubmit={handleSendResetCode}>
                <Form.Floating className="mb-3">
                  <Form.Control
                    id="forgotPasswordEmail"
                    type="email"
                    placeholder="Email"
                    value={forgotPasswordEmail}
                    onChange={(e) => setForgotPasswordEmail(e.target.value)}
                    required
                    aria-required="true"
                  />
                  <label htmlFor="forgotPasswordEmail">Email Address</label>
                </Form.Floating>
                <Button
                  type="submit"
                  className="w-100"
                  disabled={loading}
                  aria-label="Send reset code"
                >
                  {loading ? (
                    <Spinner animation="border" size="sm" aria-label="Processing" />
                  ) : (
                    "Send Reset Code"
                  )}
                </Button>
              </Form>
            </>
          )}

          {/* Step 2: Enter Reset Code */}
          {resetStep === 2 && (
            <>
              <p className="text-muted mb-3">
                Enter the 6-digit code sent to <strong>{forgotPasswordEmail}</strong>
              </p>
              <Form onSubmit={handleVerifyCode}>
                <Form.Floating className="mb-3">
                  <Form.Control
                    id="resetCode"
                    type="text"
                    placeholder="Reset Code"
                    value={enteredCode}
                    onChange={(e) => setEnteredCode(e.target.value)}
                    maxLength={6}
                    required
                    aria-required="true"
                    style={{ textAlign: "center", fontSize: "1.5rem", letterSpacing: "0.3em" }}
                  />
                  <label htmlFor="resetCode">6-Digit Code</label>
                </Form.Floating>
                <Button
                  type="submit"
                  className="w-100"
                  disabled={loading}
                  aria-label="Verify code"
                >
                  Verify Code
                </Button>
                <div className="text-center mt-2">
                  <small>
                    <span
                      className="text-primary"
                      style={{ cursor: "pointer", textDecoration: "underline" }}
                      onClick={() => {
                        setResetStep(1);
                        setEnteredCode("");
                        setError("");
                      }}
                      role="button"
                    >
                      Use different email
                    </span>
                  </small>
                </div>
              </Form>
            </>
          )}

          {/* Step 3: Create New Password */}
          {resetStep === 3 && (
            <>
              <p className="text-muted mb-3">
                Create a new password for your account.
              </p>
              <Form onSubmit={handleResetPassword}>
                <Form.Floating className="mb-3" style={{ position: 'relative' }}>
                  <Form.Control
                    id="newPassword"
                    type={showNewPassword ? "text" : "password"}
                    placeholder="New Password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    aria-required="true"
                    style={{ paddingRight: '50px' }}
                  />
                  <label htmlFor="newPassword">New Password</label>
                  <Button
                    variant="outline-secondary"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      zIndex: 3,
                      background: 'transparent',
                      border: 'none',
                      color: '#6c757d'
                    }}
                    aria-label={showNewPassword ? "Hide password" : "Show password"}
                  >
                    <i className={`bi ${showNewPassword ? 'bi-eye-slash' : 'bi-eye'}`}></i>
                  </Button>
                </Form.Floating>
                <Form.Floating className="mb-3" style={{ position: 'relative' }}>
                  <Form.Control
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirm Password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    aria-required="true"
                    style={{ paddingRight: '50px' }}
                  />
                  <label htmlFor="confirmPassword">Confirm Password</label>
                  <Button
                    variant="outline-secondary"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      zIndex: 3,
                      background: 'transparent',
                      border: 'none',
                      color: '#6c757d'
                    }}
                    aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                  >
                    <i className={`bi ${showConfirmPassword ? 'bi-eye-slash' : 'bi-eye'}`}></i>
                  </Button>
                </Form.Floating>
                <Button
                  type="submit"
                  className="w-100"
                  disabled={loading}
                  aria-label="Reset password"
                >
                  {loading ? (
                    <Spinner animation="border" size="sm" aria-label="Processing" />
                  ) : (
                    "Change Password"
                  )}
                </Button>
              </Form>
            </>
          )}

          <div className="text-center mt-3">
            <small>
              <span
                className="text-primary"
                style={{ cursor: "pointer" }}
                onClick={() => {
                  setShowForgotPassword(false);
                  setShowModal(true);
                  setIsLogin(true);
                  setForgotPasswordEmail("");
                  setResetCode("");
                  setEnteredCode("");
                  setNewPassword("");
                  setConfirmPassword("");
                  setResetStep(1);
                  setError("");
                }}
                role="button"
                aria-label="Back to login"
              >
                Back to Login
              </span>
            </small>
          </div>
        </Modal.Body>
      </Modal>
    </div>
  );
}
