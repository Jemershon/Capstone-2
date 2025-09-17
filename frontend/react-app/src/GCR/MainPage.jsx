import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button, Modal, Form, Toast, Spinner } from "react-bootstrap";
import axios from "axios";
import { API_BASE_URL } from "../api";

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

  const handleShowModal = () => {
    setShowModal(true);
    setError("");
    setFormData({ name: "", username: "", email: "", password: "", role: "Student" });
    setIsLogin(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setError("");
    setFormData({ name: "", username: "", email: "", password: "", role: "Student" });
    setIsLogin(true);
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
      console.log("Login response:", res.data); // Debug log
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("username", formData.username);
      setError("Login successful!");
      setShowToast(true);
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
  };

  return (
    <div className="d-flex flex-column min-vh-100 bg-light">
      <header className="navbar navbar-expand-lg navbar-light bg-white shadow-sm px-4">
        <a className="navbar-brand fw-bold text-primary fs-3" href="#">
          NoteTify
        </a>
        <div className="ms-auto">
          <a className="nav-link d-inline mx-2 text-dark" href="#features">
            Features
          </a>
          <a className="nav-link d-inline mx-2 text-dark" href="#about">
            About
          </a>
          <a className="nav-link d-inline mx-2 text-dark" href="#contact">
            Contact
          </a>
          <button
            className="btn btn-primary ms-3"
            onClick={handleShowModal}
            aria-label="Get started"
          >
            Get Started
          </button>
          <Link to="/admin/dashboard" className="btn btn-outline-dark ms-2" aria-label="Admin dashboard">
            Admin
          </Link>
        </div>
      </header>

      <section className="container flex-grow-1 d-flex flex-column flex-md-row align-items-center justify-content-between py-5">
        <div className="col-md-6">
          <h1 className="display-4 fw-bold text-dark">
            A Smarter Way to Learn
          </h1>
          <p className="lead text-muted mt-3">
            Connect teachers and students in one simple platform.
          </p>
          <div className="mt-4">
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
        <div className="col-md-5 text-center mt-5 mt-md-0">
          <img
            src="https://cdn-icons-png.flaticon.com/512/3135/3135755.png"
            alt="Classroom Illustration"
            className="img-fluid"
          />
        </div>
      </section>

      <section id="features" className="py-5 bg-white">
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
          © {new Date().getFullYear()} NoteTify. All rights reserved.
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
              bg={error.includes("successfully") ? "success" : "danger"}
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
            <Form.Floating className="mb-3">
              <Form.Control
                id="floatingUsername"
                name="username"
                type="text"
                placeholder="Username"
                value={formData.username}
                onChange={handleChange}
                required
                aria-required="true"
              />
              <label htmlFor="floatingUsername">Username</label>
            </Form.Floating>
            <Form.Floating className="mb-3">
              <Form.Control
                id="floatingEmail" // New ID
                name="email" // New name
                type="email"
                placeholder="Email"
                value={formData.email}
                onChange={handleChange}
                required={!isLogin} // Required only for registration
                aria-required={!isLogin}
              />
              <label htmlFor="floatingEmail">Email</label> {/* New label */}
            </Form.Floating>
            <Form.Floating className="mb-3">
              <Form.Control
                id="floatingPassword"
                name="password"
                type="password"
                placeholder="Password"
                value={formData.password}
                onChange={handleChange}
                required
                aria-required="true"
              />
              <label htmlFor="floatingPassword">Password</label>
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
          <div className="text-center mt-3">
            <small>
              {isLogin ? (
                <>
                  Don't have an account?{" "}
                  <span
                    className="text-primary"
                    style={{ cursor: "pointer" }}
                    onClick={() => setIsLogin(false)}
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
                    onClick={() => setIsLogin(true)}
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
    </div>
  );
}