import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Button, Form, Spinner, Container, Row, Col, Card } from "react-bootstrap";
import axios from "axios";
import { API_BASE_URL } from "../api";

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    password: "",
    confirmPassword: ""
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const token = searchParams.get("token");

  useEffect(() => {
    if (!token) {
      setError("Invalid reset link. No token provided.");
    }
  }, [token]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.password || !formData.confirmPassword) {
      setError("Both password fields are required");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters long");
      return;
    }

    setLoading(true);
    setError("");
    setMessage("");

    try {
      const res = await axios.post(`${API_BASE_URL}/api/reset-password`, {
        token,
        newPassword: formData.password
      });

      setMessage("Password reset successfully! Redirecting to login...");

      // Redirect to home page after success
      setTimeout(() => {
        navigate("/");
      }, 2000);

    } catch (err) {
      console.error("Reset password error:", err);
      setError(err.response?.data?.error || "Failed to reset password. The link may be expired.");
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <Container className="mt-5">
        <Row className="justify-content-center">
          <Col md={6}>
            <Card>
              <Card.Body className="text-center">
                <h2>Invalid Reset Link</h2>
                <p>The password reset link is invalid or has expired.</p>
                <Button onClick={() => navigate("/")}>Go to Home</Button>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    );
  }

  return (
    <Container className="mt-5">
      <Row className="justify-content-center">
        <Col md={6}>
          <Card>
            <Card.Header>
              <h2 className="text-center mb-0">Reset Password</h2>
            </Card.Header>
            <Card.Body>
              <Form onSubmit={handleSubmit}>
                <Form.Floating className="mb-3">
                  <Form.Control
                    id="floatingPassword"
                    name="password"
                    type="password"
                    placeholder="New Password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    aria-required="true"
                  />
                  <label htmlFor="floatingPassword">New Password</label>
                </Form.Floating>

                <Form.Floating className="mb-3">
                  <Form.Control
                    id="floatingConfirmPassword"
                    name="confirmPassword"
                    type="password"
                    placeholder="Confirm New Password"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    required
                    aria-required="true"
                  />
                  <label htmlFor="floatingConfirmPassword">Confirm New Password</label>
                </Form.Floating>

                {error && (
                  <div className="alert alert-danger mb-3">
                    {error}
                  </div>
                )}

                {message && (
                  <div className="alert alert-success mb-3">
                    {message}
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-100"
                  disabled={loading}
                  aria-label="Reset password"
                >
                  {loading ? (
                    <Spinner animation="border" size="sm" aria-label="Resetting" />
                  ) : (
                    "Reset Password"
                  )}
                </Button>
              </Form>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default ResetPassword;