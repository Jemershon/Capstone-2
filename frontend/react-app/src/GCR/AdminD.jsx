import React, { useState, useEffect } from "react";
import axios from "axios";
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
} from "react-bootstrap";

// ================= Admin Login =================
function AdminLogin({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post("http://localhost:4000/api/login", {
        username,
        password,
      });
      localStorage.setItem("token", res.data.token);
      onLogin();
      navigate("/admin/dashboard");
    } catch (err) {
      setError(err.response?.data?.error || "Login failed");
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
        >
          ✖
        </Button>

        <h3 className="mb-4 text-center fw-bold">🔑 Admin Login</h3>
        {error && <div className="alert alert-danger">{error}</div>}
        <form onSubmit={handleLogin}>
          <div className="mb-3">
            <label className="fw-semibold">Username</label>
            <input
              type="text"
              className="form-control"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              placeholder="adminusername"
            />
          </div>
          <div className="mb-3">
            <label className="fw-semibold">Password</label>
            <input
              type="password"
              className="form-control"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Enter your password"
            />
          </div>
          <Button
            type="submit"
            variant="primary"
            className="w-100 fw-bold py-2 shadow-sm d-flex justify-content-center align-items-center gap-2"
          >
            <i className="bi bi-box-arrow-in-right"></i> Login
          </Button>
        </form>
      </Card>
    </Container>
  );
}


// ================= Dashboard Pages =================
function DashboardHome() {
  const [classes, setClasses] = useState([]);
  const [users, setUsers] = useState([]);

  useEffect(() => {
    axios
      .get("http://localhost:4000/api/admin/classes")
      .then((res) => setClasses(res.data));
    axios
      .get("http://localhost:4000/api/admin/users")
      .then((res) => setUsers(res.data));
  }, []);

  return (
    <div>
      <h2 className="fw-bold mb-4">Admin Dashboard</h2>
      <Row>
        <Col md={6}>
          <Card className="mb-4 shadow-sm">
            <Card.Header className="fw-bold">All Classes</Card.Header>
            <Table striped bordered hover responsive>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Section</th>
                  <th>Code</th>
                  <th>Teacher</th>
                  <th>Students</th>
                </tr>
              </thead>
              <tbody>
                {classes.map((cls) => (
                  <tr key={cls._id || cls.id}>
                    <td>{cls.name}</td>
                    <td>{cls.section}</td>
                    <td>{cls.code}</td>
                    <td>{cls.teacher}</td>
                    <td>{cls.students}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Card>
        </Col>
        <Col md={6}>
          <Card className="mb-4 shadow-sm">
            <Card.Header className="fw-bold">All Users</Card.Header>
            <Table striped bordered hover responsive>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user._id || user.id}>
                    <td>{user.name}</td>
                    <td>{user.email}</td>
                    <td>{user.role}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Card>
        </Col>
      </Row>
    </div>
  );
}

// ================= Admin Dashboard Wrapper =================
export default function AdminDashboard() {
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [loggedIn, setLoggedIn] = useState(!!localStorage.getItem("token"));
  const navigate = useNavigate();

  if (!loggedIn) {
    return <AdminLogin onLogin={() => setLoggedIn(true)} />;
  }

  return (
    <Container fluid>
      <Row>
        {/* Sidebar */}
        <Col md={2} className="d-none d-md-block bg-dark text-white vh-100 p-3">
          <h4 className="text-center mb-4">Admin Panel</h4>
          <Nav className="flex-column">
            <Nav.Link
              as={NavLink}
              to="/admin/dashboard"
              className="nav-link-custom"
            >
              🏠 Dashboard
            </Nav.Link>
            <Nav.Link
              onClick={() => setShowLogoutModal(true)}
              className="nav-link-custom text-danger"
            >
              🚪 Logout
            </Nav.Link>
          </Nav>
        </Col>

        {/* Mobile Navbar */}
        <Col xs={12} className="d-md-none p-0">
          <Navbar bg="dark" variant="dark" expand="md">
            <Navbar.Brand className="ms-2">Admin Panel</Navbar.Brand>
            <Navbar.Toggle aria-controls="mobile-nav" />
            <Navbar.Collapse id="mobile-nav">
              <Nav className="flex-column p-2">
                <Nav.Link
                  as={NavLink}
                  to="/admin/dashboard"
                  className="text-white"
                >
                  🏠 Dashboard
                </Nav.Link>
                <Nav.Link
                  onClick={() => setShowLogoutModal(true)}
                  className="text-danger"
                >
                  🚪 Logout
                </Nav.Link>
              </Nav>
            </Navbar.Collapse>
          </Navbar>
        </Col>

        {/* Main Content */}
        <Col md={10} xs={12} className="p-4">
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
          <Modal.Title>Logout</Modal.Title>
        </Modal.Header>
        <Modal.Body>Are you sure you want to logout?</Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowLogoutModal(false)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              setShowLogoutModal(false);
              setShowToast(true);
              localStorage.removeItem("token");
              setLoggedIn(false);
              setTimeout(() => {
                setShowToast(false);
                navigate("/");
              }, 1500);
            }}
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
          zIndex: 9999,
        }}
      >
        <Toast.Body className="text-white fw-bold">
          ✅ Logged out successfully!
        </Toast.Body>
      </Toast>
    </Container>
  );
}
