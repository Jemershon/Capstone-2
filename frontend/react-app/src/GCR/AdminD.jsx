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
// NotificationsDropdown not shown for Admin dashboard per request

// Add custom styles for responsive design and modern theme
const customStyles = `
  /* Modern gradient theme styles (brand colors) */
  :root { --brand-red: #a30c0c; --brand-red-dark: #780606; --brand-gold: #ffcc00; --brand-gold-light: #ffd54a; }
  .modern-gradient-bg {
    background: linear-gradient(135deg, var(--brand-red) 0%, var(--brand-red-dark) 100%);
    min-height: 100vh;
  }

  .modern-sidebar {
    background: linear-gradient(180deg, var(--brand-red) 0%, var(--brand-red-dark) 100%) !important;
    box-shadow: 2px 0 10px rgba(0,0,0,0.1);
  }

  .modern-mobile-navbar {
    background: linear-gradient(90deg, var(--brand-red) 0%, var(--brand-red-dark) 100%) !important;
    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
  }

  .modern-mobile-navbar .navbar-brand {
    color: white !important;
    font-weight: 600;
  }

  .modern-card {
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(10px);
    border: none;
    border-radius: 20px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
    transition: all 0.3s ease;
  }

  .modern-card:hover {
    transform: translateY(-5px);
    box-shadow: 0 12px 48px rgba(0, 0, 0, 0.15);
  }

  .modern-card-header {
    background: linear-gradient(135deg, var(--brand-red) 0%, var(--brand-red-dark) 100%);
    color: white;
    border: none;
    border-radius: 20px 20px 0 0 !important;
    padding: 1.25rem 1.5rem;
    font-weight: 600;
  }

  .admin-user-card {
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(10px);
    border: none;
    border-radius: 20px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
    transition: all 0.3s ease;
    overflow: hidden;
  }

  /* Desktop: position action buttons at the bottom-right of the card */
  @media (min-width: 768px) {
    .admin-user-card {
      position: relative;
      display: flex;
      flex-direction: column;
    }

    .admin-user-card .card-action-btns {
      position: absolute;
      right: 12px;
      bottom: 12px;
      display: flex !important;
      gap: 8px;
    }

    /* Make sure card body has enough bottom padding to avoid overlap */
    .admin-user-card .card-body {
      padding-bottom: 56px;
    }
  }

  .admin-user-card:hover {
    transform: translateY(-5px);
    box-shadow: 0 12px 40px rgba(102, 126, 234, 0.3);
  }

  .admin-user-card::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 5px;
    background: linear-gradient(90deg, var(--brand-red) 0%, var(--brand-red-dark) 100%);
  }

  .btn-modern-primary {
    background: linear-gradient(135deg, var(--brand-gold) 0%, var(--brand-gold-light) 100%);
    border: none;
    color: var(--brand-red);
    padding: 10px 24px;
    border-radius: 25px;
    font-weight: 600;
    transition: all 0.3s ease;
    box-shadow: 0 4px 15px rgba(163, 12, 12, 0.15);
  }

  .btn-modern-primary:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(163, 12, 12, 0.25);
    filter: brightness(0.95);
  }

  .modern-modal-header {
    background: linear-gradient(135deg, var(--brand-red) 0%, var(--brand-red-dark) 100%);
    color: white;
    border: none;
    border-radius: 20px 20px 0 0 !important;
  }

  .modern-modal-header .btn-close {
    filter: brightness(0) invert(1);
  }

  .main-content-responsive {
    margin-left: 0;
    padding: 0;
    min-height: 100vh;
  background: linear-gradient(135deg, var(--brand-red) 0%, var(--brand-red-dark) 100%);
  }
  
  @media (min-width: 768px) {
    .main-content-responsive {
      margin-left: 16.666667%;
      padding: 20px;
    }
  }
  
  /* Mobile navbar styles */
  @media (max-width: 991px) {
    .mobile-nav-link {
      text-align: center !important;
      padding: 12px 20px !important;
      transition: all 0.3s ease;
      border-radius: 8px;
      margin: 5px 10px;
      color: #212529 !important;
    }
    
    .mobile-nav-link:hover {
      background-color: #f0f0f0 !important;
      transform: translateX(5px);
      color: #212529 !important;
    }
    
    .mobile-nav-link.active,
    .nav-link.mobile-nav-link.active {
      background-color: #e3f2fd !important;
      color: #1976d2 !important;
      font-weight: 600;
    }
    
    .navbar-collapse {
      text-align: center;
    }
    
    .navbar-nav {
      width: 100%;
    }
    
    /* Remove all gaps on mobile */
    .dashboard-content {
      padding: 15px !important;
      margin: 0 !important;
    }
    
    .dashboard-content > h2:first-child {
      margin-top: 0 !important;
    }
    
    .row {
      margin-left: 0 !important;
      margin-right: 0 !important;
    }
    
    .col, [class*="col-"] {
      padding-left: 5px !important;
      padding-right: 5px !important;
    }
  }
  
  .nav-link-custom {
    border-radius: 4px;
    margin-bottom: 5px;
    transition: background-color 0.2s;
    color: #fff !important;
    text-decoration: none;
  }
  
  .nav-link-custom:hover {
    background-color: rgba(255, 255, 255, 0.1);
    color: #fff !important;
  }
  
  .nav-link-custom.active {
    background-color: rgba(255, 255, 255, 0.2);
  }
  
  /* Fix container gaps */
  .container-fluid {
    padding: 0;
  }
  
  .row.g-0 {
    margin: 0;
  }
  
  /* Ensure full height layout */
  .admin-dashboard-container {
    min-height: 100vh;
  }
  
  .dashboard-content {
    padding: 0;
    margin: 0;
  }
  
  @media (max-width: 767px) {
    body {
      margin: 0 !important;
      padding: 0 !important;
    }
    
    .admin-dashboard-container {
      padding: 0 !important;
      margin: 0 !important;
    }
    
    .row, .row.g-0 {
      margin: 0 !important;
      padding: 0 !important;
    }
    
    .col, [class*="col-"] {
      padding: 0 !important;
      margin: 0 !important;
    }
    
    .container, .container-fluid {
      padding: 0 !important;
      margin: 0 !important;
    }
    
    .main-content-responsive {
      padding: 10px !important;
      margin: 0 !important;
    }
    
    .dashboard-content {
      padding: 10px !important;
      margin: 0 !important;
    }

    /* Ensure admin cards place action buttons below content on small screens to avoid overlap */
    .admin-user-card .d-flex.align-items-start.mb-2 {
      flex-wrap: wrap;
      gap: 8px;
    }

    .admin-user-card .d-flex.align-items-start.mb-2 > .d-flex.flex-grow-1 {
      order: 1;
      min-width: 0; /* allow text to truncate instead of pushing actions */
    }

    .admin-user-card .card-action-btns {
      order: 2;
      width: 100%;
      margin-top: 8px;
      display: flex !important;
      flex-direction: row !important;
      gap: 8px;
      justify-content: flex-end;
    }

    .admin-user-card .card-action-btns .btn {
      margin-left: 0;
    }
    
    .dashboard-content > * {
      margin-top: 10px !important;
    }
    
    .dashboard-content > *:first-child,
    .dashboard-content > h1:first-child,
    .dashboard-content > h2:first-child {
      margin-top: 0 !important;
    }

    /* Make card headers stack controls on small screens so Create User button is visible/clickable */
    .modern-card-header.d-flex {
      flex-direction: column !important;
      align-items: stretch !important;
      gap: 8px;
    }

    .modern-card-header .d-flex.align-items-center.gap-3 {
      width: 100%;
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      align-items: center;
    }

    .modern-card-header .form-control.form-control-sm,
    .modern-card-header .form-select {
      width: 100% !important;
      min-width: 0;
    }

    .modern-card-header > .btn {
      align-self: flex-end;
      z-index: 10;
    }
    
    .card, .container {
      margin-top: 10px !important;
    }
    
    h1, h2, h3, h4, h5, h6 {
      margin-top: 0 !important;
    }
  }
`;

// Inject styles
if (typeof document !== 'undefined') {
  const styleElement = document.createElement('style');
  styleElement.textContent = customStyles;
  document.head.appendChild(styleElement);
}

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

// ================= Dashboard Home =================
function DashboardHome() {
  const [classes, setClasses] = useState([]);
  const [users, setUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [sortMode, setSortMode] = useState('az');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showToast, setShowToast] = useState(false);
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [showCreateClassModal, setShowCreateClassModal] = useState(false);
  const [createdCode, setCreatedCode] = useState("");
  const [showCreatedCodeModal, setShowCreatedCodeModal] = useState(false);
  const [userData, setUserData] = useState({ name: "", username: "", password: "", role: "student" });
  const [classData, setClassData] = useState({ name: "", section: "", code: "", teacher: "", course: "", year: "", schedule: "" });
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedClass, setSelectedClass] = useState(null);
  const [showUserDetailModal, setShowUserDetailModal] = useState(false);
  const [showClassDetailModal, setShowClassDetailModal] = useState(false);

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
    if (!userData.name || !userData.username || !userData.password) {
      setError("Name, username and password are required");
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

  const handleUnlinkGoogle = async (userId) => {
    try {
      await retry(() =>
        axios.put(`${API_BASE_URL}/api/admin/users/${userId}/unlink-google`, null, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        })
      );
      await fetchData();
      setError("Google account unlinked successfully!");
      setShowToast(true);
    } catch (err) {
      console.error("Unlink google error:", err.response?.data || err.message);
      setError(err.response?.data?.error || "Failed to unlink google account. Check network.");
      setShowToast(true);
    }
  };

  const handleCreateClass = async () => {
    if (!classData.name || !(classData.section || classData.year) || !classData.teacher) {
      setError("Name, year/section and teacher are required");
      setShowToast(true);
      return;
    }
    try {
      const res = await retry(() =>
        axios.post(
          `${API_BASE_URL}/api/admin/classes`,
          { 
            name: classData.name,
            section: classData.section || classData.year,
            bg: classData.bg,
            course: classData.course,
            year: classData.year,
            schedule: classData.schedule,
            teacher: classData.teacher
          },
          { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
        )
      );
      const created = res.data.cls || res.data;
      const newCode = created.code || (created.cls && created.cls.code) || '';
      await fetchData();
    setShowCreateClassModal(false);
  setClassData({ name: "", section: "", code: "", teacher: "", course: "", year: "", bg: "#FFF0D8", schedule: "" });
      setCreatedCode(newCode);
      setShowCreatedCodeModal(true);
      setError("");
    } catch (err) {
      console.error("Create class error:", err.response?.data || err.message);
      setError(err.response?.data?.error || "Failed to create class. Check network or try again.");
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

  // Derived users list after applying search and role filter
  const displayedUsers = users
    .filter(u => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (u.username || '').toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q) || (u.name || '').toLowerCase().includes(q);
    })
    .filter(u => {
      // if the select is used for sorting (az/za) treat it as no role filter
      if (roleFilter === 'all' || roleFilter === 'az' || roleFilter === 'za') return true;
      return (u.role || '').toLowerCase() === roleFilter;
    })
    .sort((a, b) => {
      if (sortMode === 'az') return (a.username || '').localeCompare(b.username || '');
      if (sortMode === 'za') return (b.username || '').localeCompare(a.username || '');
      // default: keep admins on top, then teachers, then students — stable sort when same role
      const rank = (r) => r === 'admin' ? 0 : r === 'teacher' ? 1 : 2;
      return rank(a.role) - rank(b.role) || ((a.username || '').localeCompare(b.username || ''));
    });

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
          <Card className="mb-4 modern-card">
            <Card.Header className="modern-card-header d-flex align-items-center">
              <div>All Classes ({classes.length})</div>
            </Card.Header>
            <Card.Body style={{ maxHeight: "500px", overflowY: "auto" }}>
              {classes.length === 0 ? (
                <div className="text-center text-muted py-4">
                  <i className="bi bi-folder-x fs-1 d-block mb-2"></i>
                  <p>No classes found. Create a class to get started!</p>
                </div>
              ) : (
                <Row>
                  {classes.map((cls) => (
                    <Col key={cls._id || cls.id} xs={12} sm={6} lg={4} className="mb-3">
                      <Card 
                        className="h-100 admin-user-card"
                        style={{ cursor: "pointer" }}
                        onClick={() => {
                          setSelectedClass(cls);
                          setShowClassDetailModal(true);
                        }}
                      >
                        <Card.Body>
                          <div className="d-flex align-items-start mb-2">
                            <div className="bg-primary text-white rounded-circle p-2 me-2" style={{ width: "40px", height: "40px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                              <i className="bi bi-book"></i>
                            </div>
                            <div className="flex-grow-1 d-flex flex-column">
                              <h6 className="mb-0 fw-bold">{cls.name}</h6>
                              <small className="text-muted">{cls.section}</small>
                            </div>
                            <div className="card-action-btns d-flex">
                              <Button
                                variant="outline-danger"
                                size="sm"
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  if (window.confirm(`Are you sure you want to delete class "${cls.name}"?`)) {
                                    await handleDeleteClass(cls._id || cls.id);
                                  }
                                }}
                                aria-label={`Delete class ${cls.name}`}
                              >
                                <i className="bi bi-trash"></i>
                              </Button>
                            </div>
                          </div>
                          <div className="mt-2">
                            <small className="text-muted d-block">
                              <i className="bi bi-person me-1"></i>{cls.teacher}
                            </small>
                            <small className="text-muted d-block">
                              <i className="bi bi-people me-1"></i>{cls.students?.length || 0} students
                            </small>
                          </div>
                        </Card.Body>
                      </Card>
                    </Col>
                  ))}
                </Row>
              )}
            </Card.Body>
          </Card>
        </Col>
        <Col md={6}>
          <Card className="mb-4 modern-card">
            <Card.Header className="modern-card-header d-flex justify-content-between align-items-center">
              <div className="d-flex align-items-center gap-3">
                <div>All Users ({users.length})</div>
                <input
                  type="text"
                  placeholder="Search users..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  aria-label="Search users"
                  className="form-control form-control-sm"
                  style={{ width: '220px' }}
                />
                <Form.Select size="sm" value={roleFilter} onChange={(e) => { const v = e.target.value; setRoleFilter(v); if (v === 'az' || v === 'za') setSortMode(v); }} style={{ width: '220px' }} aria-label="Sort by or filter by role">
                  <option value="all">Sort by</option>
                  <option value="student">Students</option>
                  <option value="teacher">Teachers</option>
                  <option value="admin">Admins</option>
                  <option value="az">A → Z</option>
                  <option value="za">Z → A</option>
                </Form.Select>
              </div>
              <Button
                variant="outline-primary"
                size="sm"
                onClick={() => setShowCreateUserModal(true)}
                aria-label="Create new user"
              >
                + Create User
              </Button>
            </Card.Header>
            <Card.Body style={{ maxHeight: "500px", overflowY: "auto" }}>
              {displayedUsers.length === 0 ? (
                <div className="text-center text-muted py-4">
                  <i className="bi bi-person-x fs-1 d-block mb-2"></i>
                  <p>No users found. Try a different search or create a user to get started!</p>
                </div>
              ) : (
                <Row>
                  {displayedUsers.map((user) => (
                    <Col key={user._id || user.id} xs={12} sm={6} lg={4} className="mb-3">
                      <Card 
                        className="h-100 admin-user-card"
                        style={{ cursor: "pointer" }}
                        onClick={() => {
                          setSelectedUser(user);
                          setShowUserDetailModal(true);
                        }}
                      >
                        <Card.Body>
                          <div className="d-flex align-items-start mb-2">
                            <div className={`${user.role === 'teacher' ? 'bg-success' : user.role === 'admin' ? 'bg-danger' : 'bg-info'} text-white rounded-circle p-2 me-2`} style={{ width: "40px", height: "40px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                              <i className="bi bi-person-fill"></i>
                            </div>
                            <div className="flex-grow-1 d-flex flex-column">
                              <h6 className="mb-0 fw-bold">{user.username}</h6>
                              <small className={`badge ${user.role === 'teacher' ? 'bg-success' : user.role === 'admin' ? 'bg-danger' : 'bg-info'}`}>
                                {user.role}
                              </small>
                            </div>
                            <div className="card-action-btns d-flex">
                              <Button
                                variant="outline-danger"
                                size="sm"
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  if (window.confirm(`Are you sure you want to delete user "${user.username}"?`)) {
                                    await handleDeleteUser(user._id || user.id);
                                  }
                                }}
                                aria-label={`Delete user ${user.username}`}
                              >
                                <i className="bi bi-trash"></i>
                              </Button>
                            </div>
                          </div>
                          <div className="mt-2">
                            <small className="text-muted d-block text-truncate">
                              <i className="bi bi-envelope me-1"></i>{user.email}
                            </small>
                          </div>
                        </Card.Body>
                      </Card>
                    </Col>
                  ))}
                </Row>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Google Sign-ins Section */}
      <Row>
        <Col md={12}>
          <Card className="mb-4 modern-card">
            <Card.Header className="modern-card-header d-flex justify-content-between align-items-center">
              Google Sign-ins ({users.filter(u => u.googleId).length})
            </Card.Header>
            <Card.Body style={{ maxHeight: "400px", overflowY: "auto" }}>
              {users.filter(u => u.googleId).length === 0 ? (
                <div className="text-center text-muted py-4">
                  <i className="bi bi-google fs-1 d-block mb-2"></i>
                  <p>No Google sign-ins found.</p>
                </div>
              ) : (
                <Row>
                  {users.filter(u => u.googleId).map((gUser) => (
                    <Col key={gUser._id || gUser.id} xs={12} sm={6} lg={4} className="mb-3">
                      <Card className="h-100 admin-user-card">
                        <Card.Body>
                          <div className="d-flex align-items-start mb-2">
                            <div className="me-2" style={{ width: "48px", height: "48px" }}>
                              {gUser.picture ? (
                                <img src={gUser.picture} alt={gUser.username} style={{ width: "48px", height: "48px", borderRadius: "50%" }} />
                              ) : (
                                <div className="bg-secondary text-white rounded-circle p-2 d-flex align-items-center justify-content-center" style={{ width: "48px", height: "48px" }}>
                                  <i className="bi bi-person-fill"></i>
                                </div>
                              )}
                            </div>
                            <div className="flex-grow-1">
                              <h6 className="mb-0 fw-bold">{gUser.username}</h6>
                              <small className="text-muted d-block">{gUser.email}</small>
                              <small className="text-muted d-block">Role: {gUser.role}</small>
                              <small className="text-muted d-block">Google ID: <code style={{fontSize: '0.75rem'}}>{gUser.googleId}</code></small>
                            </div>
                            <div className="card-action-btns d-flex">
                              <Button
                                variant="outline-danger"
                                size="sm"
                                onClick={async () => {
                                  if (window.confirm(`Are you sure you want to delete user "${gUser.username}"?`)) {
                                    await handleDeleteUser(gUser._id || gUser.id);
                                  }
                                }}
                                aria-label={`Delete user ${gUser.username}`}
                              >
                                <i className="bi bi-trash"></i>
                              </Button>
                              <Button
                                variant="outline-secondary"
                                size="sm"
                                onClick={async () => {
                                  if (window.confirm(`Unlink Google account from "${gUser.username}"? This will keep the user but remove Google sign-in.`)) {
                                    await handleUnlinkGoogle(gUser._id || gUser.id);
                                  }
                                }}
                                aria-label={`Unlink google for ${gUser.username}`}
                              >
                                Unlink
                              </Button>
                            </div>
                          </div>
                        </Card.Body>
                      </Card>
                    </Col>
                  ))}
                </Row>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
      
      {/* User Detail Modal */}
      <Modal
        show={showUserDetailModal}
        onHide={() => {
          setShowUserDetailModal(false);
          setSelectedUser(null);
        }}
        centered
        size="lg"
      >
        <Modal.Header closeButton className="modern-modal-header">
          <Modal.Title>User Details</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedUser && (
            <div>
              <Row className="mb-3">
                <Col xs={12} className="text-center mb-3">
                  <div className={`${selectedUser.role === 'teacher' ? 'bg-success' : selectedUser.role === 'admin' ? 'bg-danger' : 'bg-info'} text-white rounded-circle p-3 d-inline-flex align-items-center justify-content-center`} style={{ width: "80px", height: "80px" }}>
                    <i className="bi bi-person-fill fs-1"></i>
                  </div>
                </Col>
              </Row>
              <Row>
                <Col md={6} className="mb-3">
                  <strong className="text-muted d-block mb-1">Full Name</strong>
                  <p className="mb-0">{selectedUser.name}</p>
                </Col>
                <Col md={6} className="mb-3">
                  <strong className="text-muted d-block mb-1">Username</strong>
                  <p className="mb-0">{selectedUser.username}</p>
                </Col>
                <Col md={6} className="mb-3">
                  <strong className="text-muted d-block mb-1">Email</strong>
                  <p className="mb-0">{selectedUser.email}</p>
                </Col>
                {/* Password removed from admin user details for privacy */}
                <Col md={6} className="mb-3">
                  <strong className="text-muted d-block mb-1">Role</strong>
                  <span className={`badge ${selectedUser.role === 'teacher' ? 'bg-success' : selectedUser.role === 'admin' ? 'bg-danger' : 'bg-info'}`}>
                    {selectedUser.role}
                  </span>
                </Col>
                <Col md={6} className="mb-3">
                  <strong className="text-muted d-block mb-1">User ID</strong>
                  <code className="d-block p-2 bg-light rounded" style={{ fontSize: "0.75rem", wordBreak: "break-all" }}>
                    {selectedUser._id || selectedUser.id}
                  </code>
                </Col>
              </Row>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button 
            variant="outline-secondary" 
            onClick={() => {
              setShowUserDetailModal(false);
              setSelectedUser(null);
            }}
          >
            Close
          </Button>
          <Button 
            variant="danger"
            onClick={async () => {
              if (window.confirm(`Are you sure you want to delete user "${selectedUser.username}"?`)) {
                await handleDeleteUser(selectedUser._id || selectedUser.id);
                setShowUserDetailModal(false);
                setSelectedUser(null);
              }
            }}
          >
            Delete User
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Created Class Code Modal */}
      <Modal show={showCreatedCodeModal} onHide={() => setShowCreatedCodeModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Class Created</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p className="mb-2">Share this class code with the teacher or students so they can join:</p>
          <h4><code>{createdCode}</code></h4>
          <div className="mt-3">
            <Button variant="primary" onClick={() => { navigator.clipboard?.writeText(createdCode); setShowCreatedCodeModal(false); setError('Class code copied to clipboard'); setShowToast(true); }}>Copy</Button>
            <Button variant="secondary" className="ms-2" onClick={() => setShowCreatedCodeModal(false)}>Close</Button>
          </div>
        </Modal.Body>
      </Modal>

      {/* Class Detail Modal */}
      <Modal
        show={showClassDetailModal}
        onHide={() => {
          setShowClassDetailModal(false);
          setSelectedClass(null);
        }}
        centered
        size="lg"
      >
        <Modal.Header closeButton className="modern-modal-header">
          <Modal.Title>Class Details</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedClass && (
            <div>
              <Row className="mb-3">
                <Col xs={12} className="text-center mb-3">
                  <div className="bg-primary text-white rounded-circle p-3 d-inline-flex align-items-center justify-content-center" style={{ width: "80px", height: "80px" }}>
                    <i className="bi bi-book fs-1"></i>
                  </div>
                </Col>
              </Row>
              <Row>
                <Col md={6} className="mb-3">
                  <strong className="text-muted d-block mb-1">Class Name</strong>
                  <p className="mb-0">{selectedClass.name}</p>
                </Col>
                <Col md={6} className="mb-3">
                  <strong className="text-muted d-block mb-1">Section</strong>
                  <p className="mb-0">{selectedClass.section}</p>
                </Col>
                <Col md={6} className="mb-3">
                  <strong className="text-muted d-block mb-1">Class Code</strong>
                  <code className="d-block p-2 bg-light rounded">{selectedClass.code}</code>
                </Col>
                <Col md={6} className="mb-3">
                  <strong className="text-muted d-block mb-1">Teacher</strong>
                  <p className="mb-0">{selectedClass.teacher}</p>
                </Col>
                <Col md={6} className="mb-3">
                  <strong className="text-muted d-block mb-1">Number of Students</strong>
                  <p className="mb-0">{selectedClass.students?.length || 0}</p>
                </Col>
                <Col md={6} className="mb-3">
                  <strong className="text-muted d-block mb-1">Class ID</strong>
                  <code className="d-block p-2 bg-light rounded" style={{ fontSize: "0.75rem", wordBreak: "break-all" }}>
                    {selectedClass._id || selectedClass.id}
                  </code>
                </Col>
                {selectedClass.students && selectedClass.students.length > 0 && (
                  <Col xs={12} className="mb-3">
                    <strong className="text-muted d-block mb-2">Enrolled Students</strong>
                    <div className="p-2 bg-light rounded" style={{ maxHeight: "150px", overflowY: "auto" }}>
                      {selectedClass.students.map((student, index) => (
                        <span key={index} className="badge bg-secondary me-1 mb-1">
                          {student}
                        </span>
                      ))}
                    </div>
                  </Col>
                )}
              </Row>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button 
            variant="outline-secondary" 
            onClick={() => {
              setShowClassDetailModal(false);
              setSelectedClass(null);
            }}
          >
            Close
          </Button>
          <Button 
            variant="danger"
            onClick={async () => {
              if (window.confirm(`Are you sure you want to delete class "${selectedClass.name}"?`)) {
                await handleDeleteClass(selectedClass._id || selectedClass.id);
                setShowClassDetailModal(false);
                setSelectedClass(null);
              }
            }}
          >
            Delete Class
          </Button>
        </Modal.Footer>
      </Modal>
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
        <Modal.Header closeButton className="modern-modal-header">
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
            {/* Email removed from admin create user flow */}
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
              setUserData({ name: "", username: "", password: "", role: "student" });
              setError("");
            }}
            aria-label="Cancel create user"
          >
            Cancel
          </Button>
          <Button
            className="btn-modern-primary"
            onClick={handleCreateUser}
            disabled={!userData.name || !userData.username || !userData.password}
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
          setClassData({ name: "", section: "", code: "", teacher: "", course: "", year: "", bg: "#FFF0D8", schedule: "" });
          setError("");
        }}
        centered
      >
        <Modal.Header closeButton className="modern-modal-header">
          <Modal.Title>Create Class</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Floating className="mb-3" style={{ position: 'relative' }}>
              <Form.Control
                id="floatingClassNameAdmin"
                type="text"
                placeholder="Class Name"
                value={classData.name}
                onChange={(e) => setClassData({ ...classData, name: e.target.value })}
                required
                aria-required="true"
              />
              <label htmlFor="floatingClassNameAdmin">Class Name</label>
            </Form.Floating>

            {/* Teacher username stays here */}
            <Form.Group className="mb-3">
              <Form.Label>Teacher Username</Form.Label>
              <Form.Control
                type="text"
                value={classData.teacher}
                onChange={(e) => setClassData({ ...classData, teacher: e.target.value })}
                required
                aria-required="true"
              />
              <Form.Text className="text-muted">
                Use the teacher's username (e.g., teacher1)
              </Form.Text>
            </Form.Group>

            <Form.Floating className="mb-3" style={{ position: 'relative' }}>
              <Form.Control
                id="floatingCourseAdmin"
                type="text"
                placeholder="Course"
                value={classData.course}
                onChange={(e) => setClassData({ ...classData, course: e.target.value })}
                aria-label="Course"
              />
              <label htmlFor="floatingCourseAdmin">Course</label>
            </Form.Floating>

            <Form.Floating className="mb-3" style={{ position: 'relative' }}>
              <Form.Control
                id="floatingYearAdmin"
                type="text"
                placeholder="Year / Section"
                value={classData.year}
                onChange={(e) => setClassData({ ...classData, year: e.target.value })}
                aria-label="Year and Section"
              />
              <label htmlFor="floatingYearAdmin">Year / Section</label>
            </Form.Floating>

            {/* Room removed per user request */}

            <Form.Floating className="mb-3" style={{ position: 'relative' }}>
              <Form.Control
                id="floatingScheduleAdmin"
                type="text"
                placeholder="Schedule"
                value={classData.schedule}
                onChange={(e) => setClassData({ ...classData, schedule: e.target.value })}
                aria-label="Schedule"
              />
              <label htmlFor="floatingScheduleAdmin">Schedule</label>
            </Form.Floating>

            {/* Background color removed to match Teacher modal UI */}
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
          onClick={() => {
              setShowCreateClassModal(false);
              setClassData({ name: "", section: "", code: "", teacher: "", course: "", year: "", bg: "#FFF0D8", schedule: "" });
              setError("");
            }}
            aria-label="Cancel create class"
          >
            Cancel
          </Button>
          <Button
            className="btn-modern-primary"
            onClick={handleCreateClass}
            disabled={!classData.name || !classData.year || !classData.teacher}
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
    // Redirect to main landing page for login
    navigate("/");
    return (
      <div className="text-center py-4">
        <Spinner animation="border" role="status" aria-label="Redirecting to login" />
        <p>Redirecting to login...</p>
      </div>
    );
  }

  return (
    <Container fluid>
      <Row>
        {/* Sidebar */}
        <Col md={2} className="d-none d-md-block modern-sidebar text-white vh-100 p-3 position-fixed" style={{top: 0, left: 0, zIndex: 1000}}>
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
        <div className="d-md-none">
          <Navbar expand="lg" className="modern-mobile-navbar shadow-sm">
            <Container fluid>
              <div className="d-flex align-items-center justify-content-between w-100">
                <Navbar.Brand className="fw-bold text-primary fs-4">👑 Admin</Navbar.Brand>
                <div className="d-flex align-items-center">
                  <Navbar.Toggle aria-controls="mobile-nav" />
                </div>
              </div>
              <Navbar.Collapse id="mobile-nav">
                <Nav className="w-100">
                  <Nav.Link
                    as={NavLink}
                    to="/admin/dashboard"
                    className="mobile-nav-link"
                  >
                    Dashboard
                  </Nav.Link>
                  <div className="text-center my-2 px-3">
                    <Button
                      variant="danger"
                      onClick={() => setShowLogoutModal(true)}
                      className="w-100"
                      style={{maxWidth: '200px'}}
                    >
                      Logout
                    </Button>
                  </div>
                </Nav>
              </Navbar.Collapse>
            </Container>
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
