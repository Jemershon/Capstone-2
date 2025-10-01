import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { API_BASE_URL, getAuthToken, getUsername, getUserRole, checkAuth } from "../api";
import { Routes, Route, NavLink, useNavigate } from "react-router-dom";
import {
  Container,
  Row,
  Col,
  Nav,
  Navbar,
  Card,
  Button,
  Table,
  Modal,
  Toast,
  Form,
  Spinner,
  Alert,
} from "react-bootstrap";

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

// ================= Admin Login =================
function AdminLogin({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showToast, setShowToast] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await retry(() =>
        axios.post(`${API_BASE_URL}/api/login`, {
          username,
          password,
        })
      );
      
      // Use proper auth data setting
      const { setAuthData } = await import('../api');
      setAuthData(res.data.token, res.data.user.username, res.data.user.role);
      onLogin();
      setError("Login successful!");
      setShowToast(true);
      setTimeout(() => navigate("/admin/dashboard"), 1000);
    } catch (err) {
      console.error("Login error:", err.response?.data || err.message);
      setError(err.response?.data?.error || "Login failed. Check credentials.");
      setShowToast(true);
    }
  };

  return (
    <Container className="d-flex flex-column align-items-center justify-content-center vh-100 bg-light">
      <Card className="p-4 shadow-lg border-0 position-relative" style={{ maxWidth: 400, width: "100%" }}>
        {/* X Close Button */}
        <Button
          variant="light"
          size="sm"
          className="position-absolute top-0 end-0 m-2 border-0"
          onClick={() => navigate("/")}
          aria-label="Close login form"
        >
          ✖
        </Button>

        <h3 className="mb-4 text-center fw-bold">🔑 Admin Login</h3>
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
        <form onSubmit={handleLogin}>
          <div className="mb-3">
            <label className="fw-semibold" htmlFor="admin-username">
              Username
            </label>
            <input
              type="text"
              id="admin-username"
              className="form-control"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              placeholder="adminusername"
              aria-required="true"
            />
          </div>
          <div className="mb-3">
            <label className="fw-semibold" htmlFor="admin-password">
              Password
            </label>
            <input
              type="password"
              id="admin-password"
              className="form-control"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Enter your password"
              aria-required="true"
            />
          </div>
          <Button
            type="submit"
            variant="primary"
            className="w-100 fw-bold py-2 shadow-sm d-flex justify-content-center align-items-center gap-2"
            aria-label="Submit login"
          >
            <i className="bi bi-box-arrow-in-right"></i> Login
          </Button>
        </form>
      </Card>
    </Container>
  );
}

// ================= Dashboard Home =================
function DashboardHome() {
  const [classes, setClasses] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showToast, setShowToast] = useState(false);
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [showCreateClassModal, setShowCreateClassModal] = useState(false);
  const [userData, setUserData] = useState({ name: "", username: "", email: "", password: "", role: "student" });
  const [classData, setClassData] = useState({ name: "", section: "", code: "", teacher: "" });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${localStorage.getItem("token")}` };
      const [classesRes, usersRes] = await Promise.all([
        retry(() => axios.get(`${API_BASE_URL}/api/admin/classes?page=1&limit=100`, { headers })),
        retry(() => axios.get(`${API_BASE_URL}/api/admin/users?page=1&limit=100`, { headers })),
      ]);
      setClasses(classesRes.data || []);
      setUsers(usersRes.data || []);
    } catch (err) {
      console.error("Fetch error:", err.response?.data || err.message);
      setError(err.response?.data?.error || "Failed to load data. Check network or login status.");
      setShowToast(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (!cancelled) fetchData();
    return () => {
      cancelled = true;
    };
  }, [fetchData]);

  const handleCreateUser = async () => {
    if (!userData.name || !userData.username || !userData.email || !userData.password) {
      setError("All fields are required");
      setShowToast(true);
      return;
    }
    try {
      await retry(() =>
        axios.post(
          `${API_BASE_URL}/api/admin/users`,
          userData,
          { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
        )
      );
      await fetchData();
      setShowCreateUserModal(false);
      setUserData({ name: "", username: "", email: "", password: "", role: "student" });
      setError("User created successfully!");
      setShowToast(true);
    } catch (err) {
      console.error("Create user error:", err.response?.data || err.message);
      setError(err.response?.data?.error || "Failed to create user. Check inputs or network.");
      setShowToast(true);
    }
  };

  const handleDeleteUser = async (userId) => {
    try {
      await retry(() =>
        axios.delete(`${API_BASE_URL}/api/admin/users/${userId}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        })
      );
      await fetchData();
      setError("User deleted successfully!");
      setShowToast(true);
    } catch (err) {
      console.error("Delete user error:", err.response?.data || err.message);
      setError(err.response?.data?.error || "Failed to delete user. Check network.");
      setShowToast(true);
    }
  };

  const handleCreateClass = async () => {
    if (!classData.name || !classData.section || !classData.code || !classData.teacher) {
      setError("All fields are required");
      setShowToast(true);
      return;
    }
    try {
      await retry(() =>
        axios.post(
          `${API_BASE_URL}/api/admin/classes`,
          { ...classData, code: classData.code.toUpperCase() },
          { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
        )
      );
      await fetchData();
      setShowCreateClassModal(false);
      setClassData({ name: "", section: "", code: "", teacher: "" });
      setError("Class created successfully!");
      setShowToast(true);
    } catch (err) {
      console.error("Create class error:", err.response?.data || err.message);
      setError(err.response?.data?.error || "Failed to create class. Check code uniqueness or network.");
      setShowToast(true);
    }
  };

  const handleDeleteClass = async (classId) => {
    try {
      await retry(() =>
        axios.delete(`${API_BASE_URL}/api/admin/classes/${classId}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        })
      );
      await fetchData();
      setError("Class deleted successfully!");
      setShowToast(true);
    } catch (err) {
      console.error("Delete class error:", err.response?.data || err.message);
      setError(err.response?.data?.error || "Failed to delete class. Check network.");
      setShowToast(true);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-4">
        <Spinner animation="border" role="status" aria-label="Loading dashboard data" />
        <p>Loading dashboard data...</p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="fw-bold mb-4">Admin Dashboard</h2>
      {error && (
        <Toast
          show={showToast}
          onClose={() => setShowToast(false)}
          delay={5000}
          autohide
          bg={error.toLowerCase().includes("success") || error.toLowerCase().includes("created") || error.toLowerCase().includes("deleted") ? "success" : "danger"}
          style={{ position: "fixed", top: "20px", right: "20px", zIndex: 10000 }}
        >
          <Toast.Body className="text-white">{error}</Toast.Body>
        </Toast>
      )}
      <Row>
        <Col md={6}>
          <Card className="mb-4 shadow-sm">
            <Card.Header className="fw-bold d-flex justify-content-between align-items-center">
              All Classes
              <Button
                variant="outline-primary"
                size="sm"
                onClick={() => setShowCreateClassModal(true)}
                aria-label="Create new class"
              >
                + Create Class
              </Button>
            </Card.Header>
            <Table striped bordered hover responsive style={{ tableLayout: "fixed" }}>
              <thead>
                <tr>
                  <th style={{ width: "20%" }}>Name</th>
                  <th style={{ width: "15%" }}>Section</th>
                  <th style={{ width: "15%" }}>Code</th>
                  <th style={{ width: "20%" }}>Teacher</th>
                  <th style={{ width: "15%" }}>Students</th>
                  <th style={{ width: "15%" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {classes.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center text-muted">
                      No classes found. Create a class to get started!
                    </td>
                  </tr>
                )}
                {classes.map((cls) => (
                  <tr key={cls._id || cls.id}>
                    <td>{cls.name}</td>
                    <td>{cls.section}</td>
                    <td>{cls.code}</td>
                    <td>{cls.teacher}</td>
                    <td>{cls.students?.length || 0}</td>
                    <td>
                      <Button
                        variant="outline-danger"
                        size="sm"
                        onClick={() => handleDeleteClass(cls._id || cls.id)}
                        aria-label={`Delete class ${cls.name}`}
                      >
                        Delete
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Card>
        </Col>
        <Col md={6}>
          <Card className="mb-4 shadow-sm">
            <Card.Header className="fw-bold d-flex justify-content-between align-items-center">
              All Users
              <Button
                variant="outline-primary"
                size="sm"
                onClick={() => setShowCreateUserModal(true)}
                aria-label="Create new user"
              >
                + Create User
              </Button>
            </Card.Header>
            <Table striped bordered hover responsive style={{ tableLayout: "fixed" }}>
              <thead>
                <tr>
                  <th style={{ width: "25%" }}>Name</th>
                  <th style={{ width: "30%" }}>Email</th>
                  <th style={{ width: "20%" }}>Username</th>
                  <th style={{ width: "15%" }}>Role</th>
                  <th style={{ width: "10%" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center text-muted">
                      No users found. Create a user to get started!
                    </td>
                  </tr>
                )}
                {users.map((user) => (
                  <tr key={user._id || user.id}>
                    <td>{user.name}</td>
                    <td>{user.email}</td>
                    <td>{user.username}</td>
                    <td>{user.role}</td>
                    <td>
                      <Button
                        variant="outline-danger"
                        size="sm"
                        onClick={() => handleDeleteUser(user._id || user.id)}
                        aria-label={`Delete user ${user.username}`}
                      >
                        Delete
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Card>
        </Col>
      </Row>
      {/* Create User Modal */}
      <Modal
        show={showCreateUserModal}
        onHide={() => {
          setShowCreateUserModal(false);
          setUserData({ name: "", username: "", email: "", password: "", role: "student" });
          setError("");
        }}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>Create User</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Name</Form.Label>
              <Form.Control
                type="text"
                value={userData.name}
                onChange={(e) => setUserData({ ...userData, name: e.target.value })}
                placeholder="e.g., John Doe"
                required
                aria-required="true"
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Username</Form.Label>
              <Form.Control
                type="text"
                value={userData.username}
                onChange={(e) => setUserData({ ...userData, username: e.target.value })}
                placeholder="e.g., johndoe"
                required
                aria-required="true"
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Email</Form.Label>
              <Form.Control
                type="email"
                value={userData.email}
                onChange={(e) => setUserData({ ...userData, email: e.target.value })}
                placeholder="e.g., john.doe@example.com"
                required
                aria-required="true"
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Password</Form.Label>
              <Form.Control
                type="password"
                value={userData.password}
                onChange={(e) => setUserData({ ...userData, password: e.target.value })}
                placeholder="Enter password"
                required
                aria-required="true"
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Role</Form.Label>
              <Form.Select
                value={userData.role}
                onChange={(e) => setUserData({ ...userData, role: e.target.value })}
                aria-label="Select user role"
              >
                <option value="student">Student</option>
                <option value="teacher">Teacher</option>
                <option value="admin">Admin</option>
              </Form.Select>
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => {
              setShowCreateUserModal(false);
              setUserData({ name: "", username: "", email: "", password: "", role: "student" });
              setError("");
            }}
            aria-label="Cancel create user"
          >
            Cancel
          </Button>
          <Button
            variant="success"
            onClick={handleCreateUser}
            disabled={!userData.name || !userData.username || !userData.email || !userData.password}
            aria-label="Create user"
          >
            Create
          </Button>
        </Modal.Footer>
      </Modal>
      {/* Create Class Modal */}
      <Modal
        show={showCreateClassModal}
        onHide={() => {
          setShowCreateClassModal(false);
          setClassData({ name: "", section: "", code: "", teacher: "" });
          setError("");
        }}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>Create Class</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Class Name</Form.Label>
              <Form.Control
                type="text"
                value={classData.name}
                onChange={(e) => setClassData({ ...classData, name: e.target.value })}
                placeholder="e.g., Math 101"
                required
                aria-required="true"
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Section</Form.Label>
              <Form.Control
                type="text"
                value={classData.section}
                onChange={(e) => setClassData({ ...classData, section: e.target.value })}
                placeholder="e.g., A"
                required
                aria-required="true"
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Class Code</Form.Label>
              <Form.Control
                type="text"
                value={classData.code}
                onChange={(e) => setClassData({ ...classData, code: e.target.value })}
                placeholder="e.g., ABC123"
                required
                aria-required="true"
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Teacher Username</Form.Label>
              <Form.Control
                type="text"
                value={classData.teacher}
                onChange={(e) => setClassData({ ...classData, teacher: e.target.value })}
                placeholder="e.g., teacher1"
                required
                aria-required="true"
              />
              <Form.Text className="text-muted">
                Use the teacher's username (e.g., teacher1)
              </Form.Text>
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => {
              setShowCreateClassModal(false);
              setClassData({ name: "", section: "", code: "", teacher: "" });
              setError("");
            }}
            aria-label="Cancel create class"
          >
            Cancel
          </Button>
          <Button
            variant="success"
            onClick={handleCreateClass}
            disabled={!classData.name || !classData.section || !classData.code || !classData.teacher}
            aria-label="Create class"
          >
            Create
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}

// ================= Admin Dashboard Wrapper =================
export default function AdminDashboard() {
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(checkAuth());
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState("");
  const navigate = useNavigate();

  const verifyToken = useCallback(async () => {
    setAuthLoading(true);
    try {
      // Get the token using our helper function
      const token = getAuthToken();
      
      const res = await retry(() =>
        axios.get(`${API_BASE_URL}/api/profile`, {
          headers: { Authorization: `Bearer ${token}` },
        })
      );
      
      // Check if the user has the correct role
      if (res.data.role !== "Admin") {
        throw new Error("Access denied: Not an admin");
      }
      
      // Import helper functions
      const { setAuthData } = await import("../api");
      
      // Update auth data with the fresh information
      setAuthData(token, res.data.username, res.data.role);
      console.log("✅ Admin authentication verified successfully");
    } catch (err) {
      console.error("Auth error:", err.response?.data || err.message);
      setAuthError(err.response?.data?.error || "Authentication failed. Please log in as an admin.");
      setIsAuthenticated(false);
      
      // Import helper function
      const { clearAuthData } = await import("../api");
      
      // Clear all auth data
      clearAuthData();
      localStorage.removeItem("username");
      setTimeout(() => navigate("/"), 3000);
    } finally {
      setAuthLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    let cancelled = false;
    if (isAuthenticated && !cancelled) {
      verifyToken();
    } else {
      setAuthLoading(false);
    }
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, verifyToken]);

  if (authLoading) {
    return (
      <div className="text-center py-4">
        <Spinner animation="border" role="status" aria-label="Verifying authentication" />
        <p>Verifying authentication...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AdminLogin onLogin={() => setIsAuthenticated(true)} />;
  }

  return (
    <Container fluid>
      <Row>
        {/* Sidebar */}
        <Col md={2} className="d-none d-md-block bg-dark text-white vh-100 p-3 position-fixed" style={{top: 0, left: 0, zIndex: 1000}}>
          <h4 className="text-center mb-4">Admin Panel</h4>
          <Nav className="flex-column">
            <Nav.Link
              as={NavLink}
              to="/admin/dashboard"
              className="nav-link-custom"
              aria-label="Dashboard"
            >
              🏠 Dashboard
            </Nav.Link>
            <Nav.Link
              onClick={() => setShowLogoutModal(true)}
              className="nav-link-custom text-danger"
              aria-label="Logout"
            >
              🚪 Logout
            </Nav.Link>
          </Nav>
        </Col>

        {/* Mobile Navbar */}
        <div className="d-md-none position-fixed w-100" style={{top: 0, zIndex: 1000}}>
          <Navbar bg="dark" variant="dark" expand="md">
            <Navbar.Brand className="ms-2">Admin Panel</Navbar.Brand>
            <Navbar.Toggle aria-controls="mobile-nav" />
            <Navbar.Collapse id="mobile-nav">
              <Nav className="flex-column p-2">
                <Nav.Link
                  as={NavLink}
                  to="/admin/dashboard"
                  className="text-white"
                  aria-label="Dashboard"
                >
                  🏠 Dashboard
                </Nav.Link>
                <Nav.Link
                  onClick={() => setShowLogoutModal(true)}
                  className="text-danger"
                  aria-label="Logout"
                >
                  🚪 Logout
                </Nav.Link>
              </Nav>
            </Navbar.Collapse>
          </Navbar>
        </div>

        {/* Main Content */}
        <Col md={10} xs={12} className="main-content-responsive">
          <Routes>
            <Route path="dashboard" element={<DashboardHome />} />
          </Routes>
        </Col>
      </Row>

      {/* Logout Modal */}
      <Modal
        show={showLogoutModal}
        onHide={() => setShowLogoutModal(false)}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>Confirm Logout</Modal.Title>
        </Modal.Header>
        <Modal.Body>Are you sure you want to logout?</Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => setShowLogoutModal(false)}
            aria-label="Cancel logout"
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={async () => {
              setShowLogoutModal(false);
              setShowToast(true);
              
              // Import the clearAuthData function
              const { clearAuthData } = await import('../api');
              
              // Clear all auth data using our helper function
              clearAuthData();
              
              // Update authentication state
              setIsAuthenticated(false);
              
              // Redirect to login page after a short delay
              setTimeout(() => {
                setShowToast(false);
                navigate("/");
              }, 1500);
            }}
            aria-label="Confirm logout"
          >
            Logout
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Toast Notification */}
      <Toast
        show={showToast}
        onClose={() => setShowToast(false)}
        delay={1500}
        autohide
        bg="success"
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          minWidth: "250px",
          textAlign: "center",
          zIndex: 10000,
        }}
      >
        <Toast.Body className="text-white fw-bold">
          ✅ Logged out successfully!
        </Toast.Body>
      </Toast>
    </Container>
  );
}
