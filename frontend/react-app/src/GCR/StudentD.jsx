import React, { useState, useEffect } from "react";
import { Routes, Route, NavLink, useNavigate, useParams, Link, useLocation } from "react-router-dom";
import axios from "axios";
import { Container, Row, Col, Nav, Navbar, Card, Button, Table, Modal, Form, Tab, Tabs, Badge, Alert, Spinner, Toast, ListGroup, Dropdown } from "react-bootstrap";
import { getAuthToken, getUsername, getUserRole, checkAuth, clearAuthData, API_BASE_URL } from "../api";
import NotificationsDropdown from "./components/NotificationsDropdown";
import Comments from "./components/Comments";
import { io } from "socket.io-client";

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

  .class-card-modern {
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(10px);
    border: none;
    border-radius: 20px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
    transition: all 0.3s ease;
    cursor: pointer;
    overflow: hidden;
  }

  .class-card-modern:hover {
    transform: translateY(-8px);
    box-shadow: 0 12px 40px rgba(163, 12, 12, 0.25);
  }

  .class-card-modern .card-body {
    position: relative;
    z-index: 2;
  }

  .class-card-modern::before {
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

  .btn-modern-secondary {
    background: rgba(255, 255, 255, 0.9);
    border: 2px solid var(--brand-red);
    color: var(--brand-red);
    padding: 10px 24px;
    border-radius: 25px;
    font-weight: 600;
    transition: all 0.3s ease;
  }

  .btn-modern-secondary:hover {
    background: var(--brand-red);
    color: white;
    transform: translateY(-2px);
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

  .profile-card-modern {
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(10px);
    border: none;
    border-radius: 20px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
    padding: 2rem;
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
  
  .nav-link-custom {
    border-radius: 10px;
    margin-bottom: 8px;
    transition: all 0.3s ease;
    color: rgba(255, 255, 255, 0.9) !important;
  }
  
  .nav-link-custom:hover {
    background-color: rgba(255, 255, 255, 0.2);
    transform: translateX(5px);
    color: white !important;
  }
  
  .nav-link-custom.active {
    background-color: rgba(255, 255, 255, 0.3);
    color: white !important;
    font-weight: 600;
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
  }
  
  /* Fix container gaps */
  .container-fluid {
    padding: 0;
  }
  
  .row.g-0 {
    margin: 0;
  }
  
  /* Ensure full height layout */
  .student-dashboard-container {
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
    
    .student-dashboard-container {
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
    
    /* Add small gaps between stat cards */
    .row.mb-4 > [class*="col-"] {
      padding: 0 5px !important;
      margin-bottom: 10px !important;
    }
    
    .row.mb-4 {
      margin-left: -5px !important;
      margin-right: -5px !important;
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
    
    .dashboard-content > * {
      margin-top: 10px !important;
    }
    
    .dashboard-content > *:first-child,
    .dashboard-content > h1:first-child,
    .dashboard-content > h2:first-child {
      margin-top: 0 !important;
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

function StudentDashboard() {
  const [user, setUser] = useState({ name: "", username: "", role: "" });
  const [isAuthenticated, setIsAuthenticated] = useState(checkAuth());
  const [loading, setLoading] = useState(true);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [lastAuthCheck, setLastAuthCheck] = useState(0); // Add auth caching
  const navigate = useNavigate();
  const location = useLocation();
  const isClassRoute = location.pathname.includes('/class/');

  useEffect(() => {
    const verifyToken = async () => {
      // Skip if we've verified recently (within last 5 minutes)
      const now = Date.now();
      if (now - lastAuthCheck < 5 * 60 * 1000) {
        console.log("⚡ Skipping auth check - recently verified");
        setLoading(false);
        return;
      }

      try {
        const token = getAuthToken();
        const username = getUsername();
        const role = getUserRole();
        
        if (!token || !username || role !== "Student") {
          throw new Error("Invalid authentication data");
        }

        const response = await axios.get(`${API_BASE_URL}/api/verify-token`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (response.data.valid && response.data.user.role === "Student") {
          setUser({
            name: response.data.user.name || username,
            username: username,
            role: "Student"
          });
          setIsAuthenticated(true);
          setLastAuthCheck(now); // Update last check timestamp
        } else {
          throw new Error("Invalid token or role");
        }
      } catch (error) {
        console.error("🚫 Authentication failed:", error);
        clearAuthData();
        setIsAuthenticated(false);
        navigate("/");
      } finally {
        setLoading(false);
      }
    };

    // Only verify once on mount, not on every render
    if (isAuthenticated) {
      verifyToken();
    } else {
      setLoading(false);
    }
  }, []); // Empty dependency array - only run once on mount

  const handleLogout = () => {
    clearAuthData();
    setIsAuthenticated(false);
    navigate("/");
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-100">
        <div className="text-center">
          <div className="spinner-border text-primary mb-3"></div>
          <p>Verifying authentication...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-100">
        <div className="text-center">
          <h3>🚫 Authentication Required</h3>
          <p>Please log in to access the student dashboard.</p>
          <Button variant="primary" onClick={() => navigate("/")}>
            Return to Login
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Container fluid className="student-dashboard-container">
      <Row className="g-0">
        {/* Sidebar for desktop */}
        <Col md={2} className="d-none d-md-block modern-sidebar text-white vh-100 p-3 position-fixed" style={{top: 0, left: 0, zIndex: 1000}}>
          <h4 className="text-center mb-4">📚 Student Panel</h4>
          <Nav className="flex-column">
            <Nav.Link
              as={NavLink}
              to="/student/dashboard"
              className="text-white nav-link-custom"
              aria-label="Dashboard and Classes"
            >
              🏠 Dashboard & Classes
            </Nav.Link>

            <Nav.Link
              as={NavLink}
              to="/student/profile"
              className="text-white nav-link-custom"
              aria-label="Profile"
            >
              👤 Profile
            </Nav.Link>
            <Nav.Link
              onClick={() => setShowLogoutModal(true)}
              className="text-danger nav-link-custom"
              aria-label="Logout"
            >
              🚪 Logout
            </Nav.Link>
          </Nav>
        </Col>
        
        {/* Mobile navbar */}
        <div className="d-md-none w-100" style={{position: 'relative', zIndex: 1000}}>
          <Navbar expand="lg" className="modern-mobile-navbar shadow-sm" expanded={mobileNavOpen} onToggle={(val) => setMobileNavOpen(val)}>
            <Container fluid>
              <div className="d-flex align-items-center justify-content-between w-100">
                <Navbar.Brand className="fw-bold text-primary fs-4">📚 Student</Navbar.Brand>
                  <div className="d-flex align-items-center mobile-toggle-group">
                  <div className="d-md-none notifications-fixed-mobile me-2">
                    <NotificationsDropdown mobileMode={true} />
                  </div>
                  <Navbar.Toggle aria-controls="mobile-nav" />
                </div>
              </div>
              <Navbar.Collapse id="mobile-nav">
                <Nav className="w-100">
                  <Nav.Link
                    as={NavLink}
                    to="/student/dashboard"
                    className="mobile-nav-link"
                    onClick={() => setMobileNavOpen(false)}
                  >
                    Dashboard
                  </Nav.Link>
                  <Nav.Link
                    as={NavLink}
                    to="/student/profile"
                    className="mobile-nav-link"
                    onClick={() => setMobileNavOpen(false)}
                  >
                    Profile
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
        <Col md={10} xs={12} className="main-content-responsive" style={{ position: 'relative' }}>
          {/* Single responsive notifications wrapper (desktop: top-right, mobile: inline in navbar) */}
          <div className="d-none d-md-block" style={{ position: 'absolute', top: 12, right: 18, zIndex: 1050 }}>
            <NotificationsDropdown />
          </div>
          <Routes>
            <Route path="/" element={<StudentMainDashboard />} />
            <Route path="/dashboard" element={<StudentMainDashboard />} />
            <Route path="/class/:className" element={<StudentClassStream />} />

            <Route path="/profile" element={<StudentProfile />} />
            {/* Default route - redirect to dashboard */}
            <Route path="*" element={<StudentMainDashboard />} />
          </Routes>
        </Col>
      </Row>

      {/* Logout Confirmation Modal */}
      <Modal show={showLogoutModal} onHide={() => setShowLogoutModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Confirm Logout</Modal.Title>
        </Modal.Header>
        <Modal.Body>Are you sure you want to logout?</Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowLogoutModal(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleLogout}>
            Logout
          </Button>
        </Modal.Footer>
      </Modal>
      
      {/* Success toast for logout */}
      <Toast
        show={showLogoutModal && false} // This will be controlled by logout success
        onClose={() => setShowLogoutModal(false)}
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

function StudentMainDashboard() {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showToast, setShowToast] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showUnenrollModal, setShowUnenrollModal] = useState(false);
  const [selectedClassToUnenroll, setSelectedClassToUnenroll] = useState(null);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [statsModalType, setStatsModalType] = useState('');
  const [statsModalTitle, setStatsModalTitle] = useState('');
  
  const [refreshKey, setRefreshKey] = useState(0); // Used to force re-fetch of classes

  useEffect(() => {
    fetchClasses();
  }, [refreshKey]); // Re-fetch when refreshKey changes

  const fetchClasses = async () => {
    setLoading(true);
    try {
      const token = getAuthToken();
      const username = getUsername();
      const response = await axios.get(`${API_BASE_URL}/api/student-classes/${username}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Store classes both in state and localStorage for offline/fallback access
      const fetchedClasses = response.data || [];
      setClasses(fetchedClasses);
      localStorage.setItem('studentClasses', JSON.stringify(fetchedClasses));
      
    } catch (err) {
      console.error("Error fetching classes:", err);
      
      // Try to load classes from localStorage if API fails
      const cachedClasses = localStorage.getItem('studentClasses');
      if (cachedClasses) {
        console.log("Using cached classes from localStorage");
        setClasses(JSON.parse(cachedClasses));
        setError("Using cached class data. Some information may be outdated.");
      } else {
        setError("Failed to fetch classes");
      }
      setShowToast(true);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinClass = async () => {
    if (!joinCode.trim()) {
      setError("Please enter a class code");
      setShowToast(true);
      return;
    }
    
    try {
      const token = getAuthToken();
      const username = getUsername();
      await axios.post(`${API_BASE_URL}/api/join-class`, {
        code: joinCode.toUpperCase(),
        student: username
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setJoinCode("");
      setShowJoinModal(false);
      fetchClasses();
      setError("Successfully joined the class!");
      setShowToast(true);
    } catch (err) {
      console.error("Join class error:", err);
      setError(err.response?.data?.error || "Failed to join class. Please check the code.");
      setShowToast(true);
    }
  };

  const handleUnenrollClass = async () => {
    if (!selectedClassToUnenroll) return;
    
    try {
      const token = getAuthToken();
      const classId = selectedClassToUnenroll._id || selectedClassToUnenroll.id;
      
      if (!classId) {
        throw new Error("Class ID not found");
      }
      
      // Try API call to leave class
      try {
        await axios.delete(`${API_BASE_URL}/api/leave-class/${classId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        console.log(`✅ Successfully left class ${selectedClassToUnenroll.name} via API`);
      } catch (apiErr) {
        console.error("API leave class error:", apiErr);
        // Continue execution even if API fails - we'll handle it with local state
      }
      
      // Remove class locally regardless of API success
      const updatedClasses = classes.filter(c => 
        (c._id !== classId) && (c.id !== classId)
      );
      
      // Update both state and localStorage
      setClasses(updatedClasses);
      localStorage.setItem('studentClasses', JSON.stringify(updatedClasses));
      
      setShowUnenrollModal(false);
      setSelectedClassToUnenroll(null);
      setError(`Successfully left ${selectedClassToUnenroll.name}`);
      setShowToast(true);
      
      // Force refresh class list
      setRefreshKey(prev => prev + 1);
    } catch (err) {
      console.error("Unenroll class error:", err);
      
      // Last resort - force remove without API
      if (confirm(`Error: ${err.message}. Do you want to force remove this class from your view?`)) {
        const updatedClasses = classes.filter(c => c !== selectedClassToUnenroll);
        setClasses(updatedClasses);
        localStorage.setItem('studentClasses', JSON.stringify(updatedClasses));
        
        setShowUnenrollModal(false);
        setSelectedClassToUnenroll(null);
        setError(`Class removed from your view`);
        setShowToast(true);
      } else {
        setError(err.response?.data?.error || "Failed to leave class. Please try again.");
        setShowToast(true);
      }
    }
  };

  const openUnenrollModal = (classItem) => {
    setSelectedClassToUnenroll(classItem);
    setShowUnenrollModal(true);
  };

  if (loading) {
    return (
      <div className="text-center py-4">
        <Spinner animation="border" role="status" aria-label="Loading classes" />
        <p>Loading your classes...</p>
      </div>
    );
  }

  return (
    <div className="dashboard-content">
      <h2 className="fw-bold mb-4">Dashboard & Classes</h2>
      
      {error && (
        <Toast
          show={showToast}
          onClose={() => setShowToast(false)}
          delay={5000}
          autohide
          bg={error.toLowerCase().includes("success") || error.toLowerCase().includes("joined") || error.toLowerCase().includes("left") ? "success" : "danger"}
          style={{ position: "fixed", top: "20px", right: "20px", zIndex: 10000 }}
        >
          <Toast.Body className="text-white">{error}</Toast.Body>
        </Toast>
      )}
      
      <h4 className="fw-bold mb-3 d-flex justify-content-between align-items-center">
        <span>My Classes:</span>
        <Button
          size="sm"
          variant="outline-primary"
          onClick={() => setShowJoinModal(true)}
          aria-label="Join a new class"
        >
          + Join Class
        </Button>
      </h4>

      <Row>
        {classes.length === 0 && (
          <Col xs={12}>
            <Card className="p-4 text-center text-muted">
              No classes joined yet. Join your first class using a class code from your teacher!
            </Card>
          </Col>
        )}
        {classes.map((cls) => (
          <Col key={cls._id || cls.id} md={4} className="mb-3">
            <Card
              className="class-card-modern h-100"
              onClick={() => window.location.href = `/student/class/${encodeURIComponent(cls.name)}`}
            >
              <Card.Body>
                <div className="d-flex align-items-center justify-content-between mb-2">
                  <div>
                    <Card.Title className="fw-bold">{cls.name}</Card.Title>
                    <div className="mb-2 text-muted" style={{ lineHeight: 1.25 }}>
                      <div>{(cls.course ? `${cls.course}` : '')}{cls.year ? ` ${cls.year}` : ''}{!cls.course && !cls.year && cls.section ? `${cls.section}` : ''}</div>
                      <div>Room: {cls.room || ''}</div>
                    </div>
                  </div>
                  {cls.teacherPicture && (
                    <img
                      src={cls.teacherPicture}
                      alt={`${cls.teacher}'s avatar`}
                      style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover', marginLeft: 12 }}
                    />
                  )}
                </div>
                <p className="mb-1">
                  <strong>Class code:</strong> {cls.code}
                </p>
                <p className="mb-0">
                  <strong>Students:</strong> {(cls.students || []).length}
                </p>
              </Card.Body>
              <Card.Footer className="d-flex justify-content-end align-items-center">
                <Dropdown align="end" onClick={(e) => e.stopPropagation()}>
                  <Dropdown.Toggle 
                    variant="outline-secondary" 
                    size="sm"
                    className="d-flex align-items-center px-2"
                    id={`dropdown-${cls._id || cls.id}`}
                    style={{ minWidth: '35px' }}
                  >
                    •••
                  </Dropdown.Toggle>
                  <Dropdown.Menu>
                    <Dropdown.Item 
                      className="text-danger d-flex align-items-center"
                      onClick={() => openUnenrollModal(cls)}
                    >
                      <span style={{ marginRight: '8px' }}>🚪</span>
                      Leave class
                    </Dropdown.Item>
                  </Dropdown.Menu>
                </Dropdown>
              </Card.Footer>
            </Card>
          </Col>
        ))}
      </Row>

      {/* Join Class Modal */}
      <Modal show={showJoinModal} onHide={() => setShowJoinModal(false)} centered>
        <Modal.Header closeButton className="modern-modal-header">
          <Modal.Title>Join a Class</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group>
              <Form.Label>Class Code</Form.Label>
              <Form.Control
                type="text"
                placeholder="Enter class code from your teacher"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                required
              />
              <Form.Text className="text-muted">
                Ask your teacher for the class code to join their class.
              </Form.Text>
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowJoinModal(false)}>
            Cancel
          </Button>
          <Button className="btn-modern-primary" onClick={handleJoinClass} disabled={!joinCode.trim()}>
            Join Class
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Unenroll Confirmation Modal - compact style */}
      <Modal
        show={showUnenrollModal}
        onHide={() => setShowUnenrollModal(false)}
        centered
        size="sm"
      >
        <Modal.Header closeButton>
          <Modal.Title>Leave class?</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="d-flex align-items-center gap-3">
            {selectedClassToUnenroll?.teacherPicture && (
              <img
                src={selectedClassToUnenroll.teacherPicture}
                alt={`${selectedClassToUnenroll.teacher}'s avatar`}
                style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover' }}
              />
            )}
            <div>
              <p className="mb-1 fw-bold">{selectedClassToUnenroll?.name}</p>
              <p className="mb-0 text-muted small">You will lose access to posts, assignments and materials. You can rejoin with the class code.</p>
            </div>
          </div>
        </Modal.Body>
        <Modal.Footer className="d-flex justify-content-between">
          <Button variant="outline-secondary" onClick={() => setShowUnenrollModal(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleUnenrollClass} disabled={!selectedClassToUnenroll}>
            Leave class
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Stats Detail Modal */}
      <Modal show={showStatsModal} onHide={() => setShowStatsModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>{statsModalTitle}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {statsModalType === 'classes' && (
            <Table striped bordered hover responsive>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Class Name</th>
                  <th>Section</th>
                  <th>Teacher</th>
                </tr>
              </thead>
              <tbody>
                {classes.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="text-center text-muted">No classes found</td>
                  </tr>
                ) : (
                  classes.map((cls, index) => (
                    <tr key={cls._id || cls.id}>
                      <td>{index + 1}</td>
                      <td>{cls.name}</td>
                      <td>{cls.section}</td>
                      <td>{cls.teacher}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </Table>
          )}

          {statsModalType === 'materials' && (
            <Table striped bordered hover responsive>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Title</th>
                  <th>Class</th>
                  <th>Type</th>
                  <th>Uploaded</th>
                </tr>
              </thead>
              <tbody>
                {classes.flatMap(cls => 
                  (cls.materials || []).map(material => ({ ...material, className: `${cls.name} - ${cls.section}` }))
                ).length === 0 ? (
                  <tr>
                    <td colSpan="5" className="text-center text-muted">No materials found</td>
                  </tr>
                ) : (
                  classes.flatMap(cls => 
                    (cls.materials || []).map(material => ({
                      ...material,
                      className: `${cls.name} - ${cls.section}`
                    }))
                  ).map((material, index) => (
                    <tr key={material._id || `material-${index}`}>
                      <td>{index + 1}</td>
                      <td>{material.title}</td>
                      <td>{material.className}</td>
                      <td>
                        {material.fileUrl ? (
                          <span className="badge bg-primary">
                            {material.fileUrl.split('.').pop().toUpperCase()}
                          </span>
                        ) : (
                          <span className="badge bg-secondary">Text</span>
                        )}
                      </td>
                      <td>{material.createdAt ? new Date(material.createdAt).toLocaleDateString() : 'N/A'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </Table>
          )}

          {statsModalType === 'exams' && (
            <Table striped bordered hover responsive>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Exam Title</th>
                  <th>Class</th>
                  <th>Duration</th>
                  <th>Questions</th>
                </tr>
              </thead>
              <tbody>
                {classes.flatMap(cls => 
                  (cls.exams || []).map(exam => ({ ...exam, className: `${cls.name} - ${cls.section}` }))
                ).length === 0 ? (
                  <tr>
                    <td colSpan="5" className="text-center text-muted">No exams found</td>
                  </tr>
                ) : (
                  classes.flatMap(cls => 
                    (cls.exams || []).map(exam => ({
                      ...exam,
                      className: `${cls.name} - ${cls.section}`
                    }))
                  ).map((exam, index) => (
                    <tr key={exam._id || `exam-${index}`}>
                      <td>{index + 1}</td>
                      <td>{exam.title}</td>
                      <td>{exam.className}</td>
                      <td>{exam.timeLimit} min</td>
                      <td>{exam.questions?.length || 0}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </Table>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowStatsModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}

function StudentClassStream() {
  const { className: rawClassName } = useParams();
  const className = decodeURIComponent(rawClassName || "");
  console.log('StudentClassStream initialized with className:', className);
  const [announcements, setAnnouncements] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [exams, setExams] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [classmates, setClassmates] = useState([]);
  const [showFilePreview, setShowFilePreview] = useState(false);
  const [previewFile, setPreviewFile] = useState(null);
  const [teacher, setTeacher] = useState("");
  const [activeTab, setActiveTab] = useState("stream");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [submissionText, setSubmissionText] = useState("");
  const [submissionFile, setSubmissionFile] = useState(null);
  const [showSubmissionModal, setShowSubmissionModal] = useState(false);
  const [showExamModal, setShowExamModal] = useState(false);
  const [selectedExam, setSelectedExam] = useState(null);
  const [examAnswers, setExamAnswers] = useState({});
  const [examSubmitted, setExamSubmitted] = useState(false);
  const [submissionSuccess, setSubmissionSuccess] = useState(false);
  const [useCreditPoints, setUseCreditPoints] = useState(0); // Changed to number
  const [userCreditPoints, setUserCreditPoints] = useState(0);
  const [submittedExams, setSubmittedExams] = useState([]);
  const [examLoading, setExamLoading] = useState(null);
  const [examGrades, setExamGrades] = useState([]);
  const [currentClass, setCurrentClass] = useState(null);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const navigate = useNavigate();

  // Debug: Log when submittedExams changes
  useEffect(() => {
    console.log('📊 submittedExams state changed:', submittedExams);
  }, [submittedExams]);

  useEffect(() => {
    fetchClassData();
  }, [className]);

  // Load submitted exams whenever className changes
  useEffect(() => {
    if (className) {
      // Always get the latest from the server
      const token = getAuthToken();
      if (token) {
        fetchSubmittedExams(token).catch(err => 
          console.error('Error fetching submissions on className change:', err)
        );
      }
    }
  }, [className]);

  // Fetch exam grades when exams are loaded
  useEffect(() => {
    if (exams.length > 0) {
      const token = getAuthToken();
      if (token) {
        fetchSubmittedExams(token);
      }
    }
  }, [exams]);

  // Socket listener for real-time grade updates
  useEffect(() => {
    const socket = io(API_BASE_URL);
    
    // Join the class room
    if (className) {
      socket.emit('join-class', className);
    }
    
    // Listen for exam submissions (including our own)
    socket.on('exam-submitted', (data) => {
      console.log('Exam submitted event received, refreshing grades:', data);
      // Refresh exam grades when any exam is submitted
      const token = getAuthToken();
      if (token && exams.length > 0) {
        fetchSubmittedExams(token);
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [className, exams]);

  const fetchClassData = async () => {
    setLoading(true);
    try {
      const token = getAuthToken();
      const username = getUsername();

      await Promise.all([
        fetchAnnouncements(token),
        fetchAssignments(token),
        fetchExams(token),
        fetchMaterials(token),
        fetchClassmates(token)
      ]);
      
      // Always refresh submitted exams to ensure current state
      if (token) {
        await fetchSubmittedExams(token);
      }
    } catch (err) {
      console.error("Error fetching class data:", err);
      setError("Failed to load class data");
    } finally {
      setLoading(false);
    }
  };
  
  // Handle file preview functionality
  const handleFilePreview = (fileUrl, fileName, fileType) => {
    const extension = fileName.split('.').pop().toLowerCase();
    setPreviewFile({
      url: fileUrl,
      name: fileName,
      type: fileType || getFileType(extension),
      extension
    });
    setShowFilePreview(true);
  };

  // Helper function to determine file type based on extension
  const getFileType = (extension) => {
    const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp'];
    const docExtensions = ['doc', 'docx', 'pdf', 'txt', 'rtf', 'odt'];
    const spreadsheetExtensions = ['xls', 'xlsx', 'csv', 'ods'];
    const presentationExtensions = ['ppt', 'pptx', 'odp'];
    const videoExtensions = ['mp4', 'webm', 'ogg', 'mov', 'avi', 'wmv'];
    const audioExtensions = ['mp3', 'wav', 'ogg', 'aac', 'flac'];
    
    if (imageExtensions.includes(extension)) return 'image';
    if (docExtensions.includes(extension)) return 'document';
    if (spreadsheetExtensions.includes(extension)) return 'spreadsheet';
    if (presentationExtensions.includes(extension)) return 'presentation';
    if (videoExtensions.includes(extension)) return 'video';
    if (audioExtensions.includes(extension)) return 'audio';
    
    return 'other';
  };

  const fetchAnnouncements = async (token) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/announcements?className=${encodeURIComponent(className)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAnnouncements(response.data);
    } catch (err) {
      console.error("Error fetching announcements:", err);
    }
  };

  const fetchAssignments = async (token) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/assignments?className=${encodeURIComponent(className)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAssignments(response.data);
    } catch (err) {
      console.error("Error fetching assignments:", err);
    }
  };

  const fetchExams = async (token) => {
    try {
      console.log('Fetching exams for class:', className);
      const response = await axios.get(`${API_BASE_URL}/api/exams?className=${encodeURIComponent(className)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('Exams fetched:', response.data);
      setExams(response.data);
    } catch (err) {
      console.error("Error fetching exams:", err);
    }
  };

  const fetchMaterials = async (token) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/materials?className=${encodeURIComponent(className)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMaterials(response.data);
    } catch (err) {
      console.error("Error fetching materials:", err);
    }
  };

  const fetchClassmates = async (token) => {
    try {
      console.log("🔍 Fetching people data for class:", className);
      
      // Use the new people endpoint that returns teacher and classmates details
      const peopleResponse = await axios.get(`${API_BASE_URL}/api/classes/${encodeURIComponent(className)}/people`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      console.log("� People data fetched:", peopleResponse.data);
      
      if (peopleResponse.data) {
        // Set teacher name (full name if available, otherwise username)
        setTeacher(peopleResponse.data.teacher?.name || peopleResponse.data.teacher?.username || "");
        
        // Set classmates (array of names)
        const classmateNames = peopleResponse.data.classmates?.map(student => 
          student.name || student.username
        ) || [];
        setClassmates(classmateNames);
        
        console.log("✅ Teacher set to:", peopleResponse.data.teacher?.name || peopleResponse.data.teacher?.username);
        console.log("✅ Classmates set to:", classmateNames);
      }
      
      // Also fetch the basic class info for other purposes
      const classResponse = await axios.get(`${API_BASE_URL}/api/classes/${encodeURIComponent(className)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      console.log("📚 Class data fetched:", classResponse.data);
      
      if (!classResponse.data) {
        console.error("❌ No class data returned from API");
        return;
      }
      
      // Check if the class data has an ID before setting
      if (!classResponse.data._id && !classResponse.data.id) {
        console.warn("⚠️ Class data missing ID property:", classResponse.data);
        
        // Try to get class ID from student-classes endpoint as a backup
        try {
          const username = getUsername();
          const classesResponse = await axios.get(`${API_BASE_URL}/api/student-classes/${username}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          
          const matchingClass = classesResponse.data.find(c => c.name === className);
          
          if (matchingClass && (matchingClass._id || matchingClass.id)) {
            console.log("✅ Found class ID from student-classes endpoint:", matchingClass._id || matchingClass.id);
            // Merge the data
            classResponse.data._id = matchingClass._id || matchingClass.id;
          }
        } catch (backupErr) {
          console.error("❌ Failed to fetch backup class data:", backupErr);
        }
      }
      
      setCurrentClass(classResponse.data); // Store the current class data
      console.log("✅ Current class set:", classResponse.data);
    } catch (err) {
      console.error("Error fetching people data:", err);
      
      // Fallback to the old method if the new endpoint fails
      if (err.response?.status === 404 || err.response?.status === 403) {
        console.log("⚠️ New people endpoint failed, falling back to old method");
        try {
          const response = await axios.get(`${API_BASE_URL}/api/classes/${encodeURIComponent(className)}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          
          if (response.data) {
            setClassmates(response.data.students || []);
            setTeacher(response.data.teacher);
            setCurrentClass(response.data);
          }
        } catch (fallbackErr) {
          console.error("Error in fallback method:", fallbackErr);
        }
      }
    }
  };

  // Fixed handleLeaveClass function that follows Google Classroom style
  const handleLeaveClass = async () => {
    console.log("🚪 Attempting to leave class...", { currentClass });
    
    // Always show the leave modal instead of trying to handle leave here
    setShowLeaveModal(true);
    
    // Note: All class leaving logic is now handled inside the Leave Modal's onClick handler
    // to follow the Google Classroom style approach
  };

  const fetchSubmittedExams = async (token) => {
    try {
      console.log('📋 Fetching submitted exams for student');
      const response = await axios.get(`${API_BASE_URL}/api/exam-submissions/student`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      console.log('📋 Submitted exams response:', response.data);
      
      // Get exam IDs that have been submitted (handle both populated and non-populated examId)
      const submittedIds = response.data.map(submission => {
        // Handle both populated and non-populated examId
        if (typeof submission.examId === 'object' && submission.examId !== null) {
          return submission.examId._id || submission.examId;
        }
        return submission.examId;
      }).filter(id => id); // Remove any null/undefined values
      
      console.log('📋 Submitted exam IDs:', submittedIds);
      
      // Update the submitted exams state
      setSubmittedExams(submittedIds);
      console.log('✅ submittedExams state updated to:', submittedIds);
      
      // Filter submissions for current class and set exam grades
      const classSubmissions = response.data.filter(submission => 
        submission.examId && exams.some(exam => 
          exam._id === submission.examId && exam.className === className
        )
      );
      
      // Combine with exam data for better display
      const gradesWithExamInfo = classSubmissions.map(submission => {
        const examInfo = exams.find(exam => exam._id === submission.examId);
        return {
          ...submission,
          examTitle: examInfo?.title || 'Unknown Exam',
          examDue: examInfo?.due,
          isLate: examInfo?.due ? new Date(submission.submittedAt) > new Date(examInfo.due) : false
        };
      }).sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt)); // Sort by newest first
      
      setExamGrades(gradesWithExamInfo);
    } catch (err) {
      console.error("Error fetching submitted exams:", err);
    }
  };



  const handleSubmitAssignment = async () => {
    try {
      const token = getAuthToken();
      const username = getUsername();
      
      const formData = new FormData();
      formData.append('student', username);
      formData.append('submissionText', submissionText);
      if (submissionFile) {
        formData.append('file', submissionFile);
      }

      await axios.post(
        `${API_BASE_URL}/api/assignments/${selectedAssignment._id}/submit`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      setShowSubmissionModal(false);
      setSubmissionText("");
      setSubmissionFile(null);
      alert("Assignment submitted successfully!");
      fetchAssignments(getAuthToken());
    } catch (err) {
      console.error("Submission error:", err);
      alert("Failed to submit assignment");
    }
  };

  const handleTakeExam = async (exam) => {
    // Simple check - if already submitted, don't allow
    if (submittedExams.includes(exam._id)) {
      alert("You have already submitted this exam.");
      return;
    }
    // Prevent taking an exam that has expired
    if (exam.due && new Date(exam.due) < new Date()) {
      alert('This exam has expired and can no longer be taken.');
      return;
    }
    
    // Open exam modal
    setSelectedExam(exam);
    setExamAnswers({});
    setExamSubmitted(false);
    setUseCreditPoints(0); // Reset to 0
    setShowExamModal(true);
    
    try {
      
      // Open exam modal
      setSelectedExam(exam);
      setExamAnswers({});
      setExamSubmitted(false);
      setUseCreditPoints(0); // Reset to 0
      setShowExamModal(true);
    
    // Fetch user's current credit points
    try {
      const token = getAuthToken();
      const response = await axios.get(`${API_BASE_URL}/api/profile`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUserCreditPoints(response.data.creditPoints || 0);
      console.log("User credit points:", response.data.creditPoints || 0);
    } catch (err) {
      console.error("Error fetching credit points:", err);
      setUserCreditPoints(0);
    }
    
    console.log("Modal should show now");
    setExamLoading(null); // Clear loading state
    } catch (err) {
      console.error("Error opening exam:", err);
      alert("Error opening the exam. Please try again.");
      setExamLoading(null); // Clear loading state
    }
  };

  const handleAnswerChange = (questionIndex, answer) => {
    setExamAnswers(prev => ({
      ...prev,
      [questionIndex]: answer
    }));
  };

  const handleSubmitExam = async () => {
    try {
      console.log("Submitting exam:", selectedExam._id);
      console.log("Answers:", examAnswers);
      
      const submission = {
        examId: selectedExam._id,
        answers: Object.entries(examAnswers).map(([questionIndex, answer]) => ({
          questionIndex: parseInt(questionIndex),
          answer: answer
        })),
        useCreditPoints: useCreditPoints
      };

      console.log("Submission payload:", submission);

      const response = await axios.post(
        `${API_BASE_URL}/api/exam-submissions`,
        submission,
        {
          headers: { Authorization: `Bearer ${getAuthToken()}` }
        }
      );

      console.log("Submission successful:", response.data);
      
      // Immediately add exam to submitted list for instant UI update
      const updatedSubmissions = [...submittedExams, selectedExam._id];
      console.log("Updating submittedExams:", updatedSubmissions);
      setSubmittedExams(updatedSubmissions);
      setExamSubmitted(true);
      
      // Store in localStorage for persistence
      localStorage.setItem('submittedExams', JSON.stringify(updatedSubmissions));
      
      // Show visual success feedback
      setSubmissionSuccess(true);
      
      // Tell the server to notify all clients about the submission
      try {
        const socket = io(API_BASE_URL);
        socket.emit('exam-submitted', { examId: selectedExam._id, className });
        socket.disconnect();
      } catch (socketErr) {
        console.error("Error with socket notification:", socketErr);
      }
      
      const { score, totalQuestions, creditsUsed, creditPointsRemaining } = response.data;
      
      // Update user credit points after submission
      setUserCreditPoints(creditPointsRemaining || 0);
      
      let message = `Exam submitted successfully! Your score: ${score}/${totalQuestions}`;
      
      if (useCreditPoints > 0 && creditsUsed > 0) {
        message += `\n🌟 Used ${creditsUsed} credit points to improve your score!`;
        message += `\n⭐ Remaining credit points: ${creditPointsRemaining}`;
      } else if (useCreditPoints > 0 && creditsUsed === 0) {
        message += `\n✨ No credit points were needed - you got them all correct!`;
      }
      
      // Add info about timing bonus if applicable
      if (selectedExam.due) {
        const now = new Date();
        const dueDate = new Date(selectedExam.due);
        if (now < dueDate) {
          message += `\n⚡ Early submission bonus: +1 credit point!`;
        } else if (now > dueDate) {
          message += `\n⏰ Late submission penalty: -2 credit points`;
        }
      }
      
      // Fetch fresh submitted exams data from server immediately
      try {
        await fetchSubmittedExams(getAuthToken());
        console.log("✅ Successfully fetched updated submitted exams list");
      } catch (fetchErr) {
        console.error("❌ Error fetching submitted exams after submission:", fetchErr);
      }
      
      // Display success message for a moment
      setTimeout(() => {
        // Close the modal
        setShowExamModal(false);
        setExamSubmitted(false); // Reset for next exam
        
        // Refresh all class data to ensure everything is in sync
        setTimeout(() => {
          console.log("Reloading class data after exam submission");
          fetchClassData();
        }, 500);
      }, 2000);
      
    } catch (err) {
      console.error("Error submitting exam:", err);
      console.error("Error response:", err.response?.data);
      console.error("Error status:", err.response?.status);
    }
  };

  if (loading) {
    return (
      <Container className="d-flex justify-content-center align-items-center" style={{ minHeight: "50vh" }}>
        <div className="text-center">
          <div className="spinner-border text-primary mb-3"></div>
          <p>Loading class content...</p>
        </div>
      </Container>
    );
  }

  if (error) {
    return (
      <Container className="mt-4">
        <Alert variant="danger">{error}</Alert>
      </Container>
    );
  }

  return (
    <Container fluid>
      <Row>
        <Col>
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h2 className="fw-bold text-primary">{className}</h2>
            <div className="d-flex align-items-center gap-3">
              {/* Account-level notifications are provided by StudentDashboard's header */}
            </div>
          </div>

          <Tabs activeKey={activeTab} onSelect={(tab) => setActiveTab(tab)} className="mb-3">
            {/* Stream Tab */}
            <Tab eventKey="stream" title="Stream">
              <div className="stream-content">
                {announcements.length === 0 ? (
                  <Card className="text-center p-4">
                    <p className="text-muted">No announcements yet</p>
                  </Card>
                ) : (
                  announcements.map((announcement, index) => (
                    <Card key={announcement._id || index} className="mb-3">
                      <Card.Body>
                        <div className="d-flex align-items-center mb-2">
                          <div className="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center me-3" 
                               style={{ width: 40, height: 40 }}>
                            {announcement.teacher ? announcement.teacher[0].toUpperCase() : 'T'}
                          </div>
                          <div>
                            <strong>{announcement.teacher}</strong>
                            <br />
                            <small className="text-muted">{new Date(announcement.date).toLocaleString()}</small>
                          </div>
                        </div>
                        <p>{announcement.message}</p>
                        
                        {/* Display file attachments */}
                        {announcement.attachments && announcement.attachments.length > 0 && (
                          <div className="mt-3">
                            <div className="fw-bold mb-2">Attachments:</div>
                            {announcement.attachments.map((attachment, attachIndex) => (
                              <div key={attachIndex} className="d-flex align-items-center justify-content-between bg-light p-2 rounded mb-1">
                                <div className="d-flex align-items-center">
                                  <span className="me-2">📎</span>
                                  <span>{attachment.originalName}</span>
                                  <small className="text-muted ms-2">({(attachment.fileSize / 1024 / 1024).toFixed(2)} MB)</small>
                                </div>
                                <div className="d-flex gap-2">
                                  <Button 
                                    variant="outline-primary" 
                                    size="sm"
                                    onClick={() => window.open(`${API_BASE_URL}/${attachment.filePath}`, '_blank')}
                                  >
                                    View
                                  </Button>
                                  <Button 
                                    variant="outline-success" 
                                    size="sm"
                                    onClick={() => {
                                      const link = document.createElement('a');
                                      link.href = `${API_BASE_URL}/${attachment.filePath}`;
                                      link.download = attachment.originalName;
                                      document.body.appendChild(link);
                                      link.click();
                                      document.body.removeChild(link);
                                    }}
                                  >
                                    Download
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                          {/* Display materialRef if present */}
                          {announcement.materialRef && (
                            <div className="mt-3">
                              <div className="fw-bold mb-2">Material:</div>
                              <Card className="mb-2">
                                <Card.Body>
                                  <h6 className="text-center">{announcement.materialRef.title}</h6>
                                  {announcement.materialRef.description && (
                                    <p className="text-muted small text-center">{announcement.materialRef.description}</p>
                                  )}
                                  {announcement.materialRef.type === 'file' && announcement.materialRef.content && (
                                    <div className="d-flex gap-2">
                                      <Button
                                        variant="outline-primary"
                                        size="sm"
                                        className="flex-grow-1"
                                        onClick={() => window.open(
                                          announcement.materialRef.content.startsWith('http') ? announcement.materialRef.content : `${API_BASE_URL}/${announcement.materialRef.content}`,
                                          '_blank'
                                        )}
                                      >
                                        View
                                      </Button>
                                      <Button
                                        variant="outline-secondary"
                                        size="sm"
                                        className="flex-grow-1"
                                        as="a"
                                        href={announcement.materialRef.content.startsWith('http') ? announcement.materialRef.content : `${API_BASE_URL}/${announcement.materialRef.content}`}
                                        target="_blank"
                                        download
                                      >
                                        Download
                                      </Button>
                                    </div>
                                  )}
                                  {(announcement.materialRef.type === 'video' || announcement.materialRef.type === 'link') && announcement.materialRef.content && (
                                    <Button
                                      variant="outline-primary"
                                      size="sm"
                                      className="w-100"
                                      as="a"
                                      href={announcement.materialRef.content}
                                      target="_blank"
                                    >
                                      Open
                                    </Button>
                                  )}
                                </Card.Body>
                              </Card>
                            </div>
                          )}
                        
                        {announcement.examId && (
                          <Badge bg="info" className="me-2">Exam Posted</Badge>
                        )}
                        
                        {/* Comments and Reactions Section */}
                        <Comments 
                          referenceType="announcement"
                          referenceId={announcement._id || announcement.id}
                          className={className}
                        />
                      </Card.Body>
                    </Card>
                  ))
                )}
              </div>
            </Tab>

            {/* Classwork Tab */}
            <Tab eventKey="classwork" title="Classwork">
              {/* Uploaded Files Section */}
              <div className="mb-4">
                <h5 className="mb-3">📎 Class Files</h5>
                {announcements.filter(a => a.attachments && a.attachments.length > 0).length === 0 ? (
                  <Card className="text-center p-4">
                    <p className="text-muted">No files shared yet</p>
                  </Card>
                ) : (
                  <Card>
                    <Card.Body>
                      {announcements
                        .filter(a => a.attachments && a.attachments.length > 0)
                        .map((announcement, index) => (
                          <div key={announcement._id || index} className="mb-3">
                            <div className="d-flex align-items-center mb-2">
                              <div className="fw-bold me-2">{announcement.teacher}</div>
                              <small className="text-muted">
                                {new Date(announcement.date).toLocaleDateString()} - "{announcement.message}"
                              </small>
                            </div>
                            <div className="ms-3">
                              {announcement.attachments.map((attachment, attachIndex) => (
                                <div key={attachIndex} className="d-flex align-items-center justify-content-between bg-light p-2 rounded mb-1">
                                  <div className="d-flex align-items-center">
                                    <span className="me-2">📎</span>
                                    <span>{attachment.originalName}</span>
                                    <small className="text-muted ms-2">({(attachment.fileSize / 1024 / 1024).toFixed(2)} MB)</small>
                                  </div>
                                  <div className="d-flex gap-2">
                                    <Button 
                                      variant="outline-primary" 
                                      size="sm"
                                      onClick={() => window.open(`${API_BASE_URL}/${attachment.filePath}`, '_blank')}
                                    >
                                      View
                                    </Button>
                                    <Button 
                                      variant="outline-success" 
                                      size="sm"
                                      onClick={() => {
                                        const link = document.createElement('a');
                                        link.href = `${API_BASE_URL}/${attachment.filePath}`;
                                        link.download = attachment.originalName;
                                        document.body.appendChild(link);
                                        link.click();
                                        document.body.removeChild(link);
                                      }}
                                    >
                                      Download
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                    </Card.Body>
                  </Card>
                )}
              </div>

              <Row>
                <Col md={12}>
                  <h5 className="mb-3">📊 Exams</h5>
                  {exams.length === 0 ? (
                    <Card className="text-center p-4">
                      <p className="text-muted">No exams yet</p>
                    </Card>
                  ) : (
                    exams.map((exam) => (
                      <Card key={exam._id} className="mb-3">
                        <Card.Body>
                          <div className="d-flex justify-content-between align-items-start">
                            <div>
                              <h6 className="fw-bold">{exam.title}</h6>
                              <p className="text-muted small mb-2">{exam.description}</p>
                              <Badge bg="info" className="me-2">
                                {exam.questions?.length || 0} {(exam.questions?.length || 0) === 1 ? 'question' : 'questions'}
                              </Badge>
                              {exam.dueDate && (
                                <Badge bg="warning">
                                  Due: {new Date(exam.dueDate).toLocaleDateString()}
                                </Badge>
                              )}
                              {submittedExams.includes(exam._id) && (
                                <Badge bg="success" className="ms-2">
                                  <i className="bi bi-check-circle-fill me-1"></i>
                                  Completed
                                </Badge>
                              )}
                            </div>
                            {submittedExams.includes(exam._id) ? (
                              <div className="d-flex align-items-center">
                                <Badge 
                                  bg="success" 
                                  className="d-flex align-items-center px-3 py-2"
                                  style={{ fontSize: '0.875rem' }}
                                >
                                  <i className="bi bi-check-circle-fill me-2"></i>
                                  Exam Taken
                                </Badge>
                              </div>
                            ) : (
                              <div className="d-flex align-items-center">
                                {exam.due && new Date(exam.due) < new Date() ? (
                                  <Badge bg="secondary" className="me-2">Expired</Badge>
                                ) : null}
                                <Button 
                                  variant="primary" 
                                  size="sm"
                                  onClick={() => handleTakeExam(exam)}
                                  disabled={examLoading === exam._id || (exam.due && new Date(exam.due) < new Date())}
                                  data-exam-id={exam._id}
                                  data-status="not-submitted"
                                >
                                  {examLoading === exam._id ? (
                                    <><span className="spinner-border spinner-border-sm me-1" /> Checking...</>
                                  ) : (
                                    "Take Exam"
                                  )}
                                </Button>
                              </div>
                            )}
                          </div>
                        </Card.Body>
                      </Card>
                    ))
                  )}
                </Col>
              </Row>
            </Tab>

            {/* People Tab */}
            <Tab eventKey="people" title="People">
              <Row>
                <Col md={6}>
                  <h5 className="mb-3">👨‍🏫 Teacher</h5>
                  <Card>
                    <Card.Body>
                      <div className="d-flex align-items-center">
                        <div className="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center me-3" 
                             style={{ width: 50, height: 50 }}>
                          {teacher ? teacher[0].toUpperCase() : 'T'}
                        </div>
                        <div>
                          <h6 className="mb-0">{teacher}</h6>
                          <small className="text-muted">Class Teacher</small>
                        </div>
                      </div>
                    </Card.Body>
                  </Card>
                </Col>
                <Col md={6}>
                  <h5 className="mb-3">👥 Students ({classmates.length})</h5>
                  <Card style={{ maxHeight: '400px', overflowY: 'auto' }}>
                    <Card.Body>
                      {classmates.map((student, index) => (
                        <div key={index} className="d-flex align-items-center mb-2">
                          <div className="bg-secondary text-white rounded-circle d-flex align-items-center justify-content-center me-3" 
                               style={{ width: 35, height: 35 }}>
                            {student[0].toUpperCase()}
                          </div>
                          <span>{student}</span>
                        </div>
                      ))}
                    </Card.Body>
                  </Card>
                </Col>
              </Row>
            </Tab>

            {/* Materials Tab */}
            <Tab eventKey="materials" title="Materials">
              {materials.length === 0 ? (
                <Card className="text-center p-4">
                  <p className="text-muted">No materials shared yet</p>
                </Card>
              ) : (
                <Row>
                  {materials.map((material) => (
                    <Col md={4} key={material._id} className="mb-3">
                      <Card>
                        <Card.Body>
                          <div className="text-center mb-3">
                            {material.type === 'file' && (
                              <div className="text-primary fs-1">📄</div>
                            )}
                            {material.type === 'video' && (
                              <div className="text-danger fs-1">🎥</div>
                            )}
                            {material.type === 'link' && (
                              <div className="text-info fs-1">🔗</div>
                            )}
                          </div>
                          <h6 className="text-center">{material.title}</h6>
                          {material.description && (
                            <p className="text-muted small text-center">{material.description}</p>
                          )}
                          {material.type === 'file' && (
                            <div className="d-flex gap-2">
                              <Button
                                variant="outline-primary"
                                size="sm"
                                className="flex-grow-1"
                                onClick={() => handleFilePreview(
                                  material.content.startsWith('http') ? material.content : `${API_BASE_URL}/${material.content}`,
                                  material.title,
                                  null
                                )}
                              >
                                View
                              </Button>
                              <Button
                                variant="outline-secondary"
                                size="sm"
                                className="flex-grow-1"
                                as="a"
                                href={material.content.startsWith('http') ? material.content : `${API_BASE_URL}/${material.content}`}
                                target="_blank"
                                download
                              >
                                Download
                              </Button>
                            </div>
                          )}
                          {(material.type === 'video' || material.type === 'link') && (
                            <Button
                              variant="outline-primary"
                              size="sm"
                              className="w-100"
                              as="a"
                              href={material.content}
                              target="_blank"
                            >
                              Open
                            </Button>
                          )}
                        </Card.Body>
                      </Card>
                    </Col>
                  ))}
                </Row>
              )}
            </Tab>


          </Tabs>
        </Col>
      </Row>

      {/* Assignment Submission Modal */}
      <Modal show={showSubmissionModal} onHide={() => setShowSubmissionModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Submit Assignment: {selectedAssignment?.title}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Submission Text</Form.Label>
              <Form.Control
                as="textarea"
                rows={5}
                value={submissionText}
                onChange={(e) => setSubmissionText(e.target.value)}
                placeholder="Enter your submission text here..."
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Upload File (optional)</Form.Label>
              <Form.Control
                type="file"
                onChange={(e) => setSubmissionFile(e.target.files[0])}
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowSubmissionModal(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmitAssignment}>
            Submit Assignment
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Leave Class Confirmation Modal */}
      <Modal 
        show={showLeaveModal} 
        onHide={() => setShowLeaveModal(false)} 
        centered
        size="sm"
      >
        <Modal.Header closeButton>
          <Modal.Title>Leave class?</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="text-center">
            <div className="mb-3">
              <i className="bi bi-exclamation-triangle text-warning" style={{ fontSize: '48px' }}></i>
            </div>
            <p className="mb-2">
              <strong>{className}</strong>
            </p>
            <p className="text-muted">
              You'll no longer have access to class posts, assignments, and materials. 
              You can rejoin this class if your teacher shares the class code again.
            </p>
          </div>
        </Modal.Body>
        <Modal.Footer className="d-flex flex-column w-100">
          <div className="d-flex justify-content-between w-100">
            <Button 
              variant="outline-secondary" 
              onClick={() => setShowLeaveModal(false)}
            >
              Cancel
            </Button>
            <Button 
              variant="danger" 
              onClick={async () => {
                setShowLeaveModal(false);
                
                try {
                  // If we have class data, try API call
                  if (currentClass) {
                    const classId = currentClass._id || currentClass.id;
                    if (classId) {
                      const token = getAuthToken();
                      await axios.delete(`${API_BASE_URL}/api/leave-class/${classId}`, {
                        headers: { Authorization: `Bearer ${token}` }
                      });
                      console.log(`✅ Successfully left class ${className} via API`);
                    }
                  }
                } catch (err) {
                  console.error("❌ Leave class API error:", err);
                  // Continue anyway - we'll force navigation
                }
                
                // Update local storage to remove the class
                try {
                  const cachedClasses = localStorage.getItem('studentClasses');
                  if (cachedClasses) {
                    const classes = JSON.parse(cachedClasses);
                    const updatedClasses = classes.filter(c => c.name !== className);
                    localStorage.setItem('studentClasses', JSON.stringify(updatedClasses));
                  }
                } catch (storageErr) {
                  console.error("❌ Local storage error:", storageErr);
                }
                
                // Always navigate back to dashboard
                navigate('/student/dashboard');
              }}
            >
              Leave class
            </Button>
          </div>
          
          {/* Emergency force leave option */}
          <div className="mt-2 text-center w-100">
            <hr className="my-2" />
            <small className="text-muted mb-2 d-block">
              If you're having trouble leaving the class:
            </small>
            <Button 
              variant="outline-secondary" 
              size="sm"
              className="w-100 text-muted"
              onClick={() => {
                setShowLeaveModal(false);
                // Update local storage to remove the class
                try {
                  const cachedClasses = localStorage.getItem('studentClasses');
                  if (cachedClasses) {
                    const classes = JSON.parse(cachedClasses);
                    const updatedClasses = classes.filter(c => c.name !== className);
                    localStorage.setItem('studentClasses', JSON.stringify(updatedClasses));
                  }
                } catch (err) {
                  console.error("❌ Local storage error:", err);
                }
                navigate('/student/dashboard');
              }}
            >
              <small>Force remove from my classes</small>
            </Button>
          </div>
        </Modal.Footer>
      </Modal>

      {/* Take Exam Modal */}
      <Modal show={showExamModal} onHide={() => setShowExamModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            {examSubmitted ? 'Exam Submitted' : `Take Exam: ${selectedExam?.title}`}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ maxHeight: '70vh', overflowY: 'auto' }}>
          {selectedExam ? (
            <div>
              {examSubmitted ? (
                <div className="text-center py-4">
                  <div className="animate__animated animate__fadeIn">
                    <div className="d-flex justify-content-center mb-3">
                      <div className="bg-success text-white rounded-circle p-3" style={{ width: '80px', height: '80px' }}>
                        <i className="bi bi-check-lg" style={{ fontSize: '3rem' }}></i>
                      </div>
                    </div>
                    <h4 className="text-success mb-4">Exam Submitted Successfully!</h4>
                    <p className="lead">Your answers have been recorded.</p>
                    <p>You can now close this window.</p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="mb-3">
                    <p><strong>Description:</strong> {selectedExam.description}</p>
                    <p><strong>Total Questions:</strong> {selectedExam.questions?.length || 0} {(selectedExam.questions?.length || 0) === 1 ? 'question' : 'questions'}</p>
                    <hr />
                  </div>
                  
                  {selectedExam.questions && selectedExam.questions.map((question, index) => (
                    <div key={index} className="mb-4 p-3 border rounded">
                      <h6 className="fw-bold">Question {index + 1}</h6>
                      <p>{question.text}</p>
                      
                      {question.type === 'multiple' && question.options ? (
                        <div>
                          {question.options.map((option, optionIndex) => (
                            <div key={optionIndex} className="form-check">
                              <input
                                className="form-check-input"
                                type="radio"
                                name={`question_${index}`}
                                id={`q${index}_opt${optionIndex}`}
                                value={option}
                                onChange={(e) => handleAnswerChange(index, e.target.value)}
                                checked={examAnswers[index] === option}
                              />
                              <label className="form-check-label" htmlFor={`q${index}_opt${optionIndex}`}>
                                {option}
                              </label>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div>
                          <textarea
                            className="form-control"
                            rows="3"
                            placeholder="Enter your answer here..."
                            value={examAnswers[index] || ''}
                            onChange={(e) => handleAnswerChange(index, e.target.value)}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </>
              )}
            </div>
          ) : (
            <p>Loading exam...</p>
          )}
        </Modal.Body>
        <Modal.Footer>
          {!examSubmitted ? (
            <>
              <div className="d-flex align-items-center me-auto gap-2">
                <Form.Label className="mb-0 fw-bold">
                  Credit Points (Available: {userCreditPoints} ⭐)
                </Form.Label>
                <Form.Control
                  type="number"
                  min="0"
                  max={userCreditPoints}
                  value={useCreditPoints}
                  onChange={(e) => {
                    const value = parseInt(e.target.value) || 0;
                    setUseCreditPoints(Math.min(Math.max(value, 0), userCreditPoints));
                  }}
                  placeholder="0"
                  disabled={userCreditPoints === 0}
                  style={{ width: '100px' }}
                />
                <small className="text-muted">
                  {useCreditPoints > 0 ? `Using ${useCreditPoints} point${useCreditPoints !== 1 ? 's' : ''}` : 'Enter points to use'}
                </small>
              </div>
              <Button variant="secondary" onClick={() => setShowExamModal(false)}>
                Cancel
              </Button>
              <Button 
                variant="primary" 
                onClick={handleSubmitExam}
                disabled={!selectedExam?.questions || Object.keys(examAnswers).length === 0}
              >
                Submit Exam
              </Button>
            </>
          ) : (
            <Button variant="primary" onClick={() => setShowExamModal(false)}>
              Close
            </Button>
          )}
        </Modal.Footer>
      </Modal>
    </Container>
  );

  {/* File Preview Modal */}
  <Modal 
    show={showFilePreview} 
    onHide={() => setShowFilePreview(false)} 
    size="lg"
    centered
  >
    <Modal.Header closeButton>
      <Modal.Title>{previewFile?.name || 'File Preview'}</Modal.Title>
    </Modal.Header>
    <Modal.Body>
      {previewFile && (
        <div className="text-center">
          {previewFile.type === 'image' && (
            <img 
              src={previewFile.url} 
              alt={previewFile.name} 
              className="img-fluid" 
              style={{ maxHeight: '70vh' }}
            />
          )}
          
          {previewFile.type === 'video' && (
            <video 
              src={previewFile.url} 
              controls 
              className="w-100" 
              style={{ maxHeight: '70vh' }}
            >
              Your browser does not support the video tag.
            </video>
          )}
          
          {previewFile.type === 'audio' && (
            <audio 
              src={previewFile.url} 
              controls 
              className="w-100"
            >
              Your browser does not support the audio tag.
            </audio>
          )}
          
          {previewFile.type === 'document' && previewFile.extension === 'pdf' && (
            <iframe
              src={`${previewFile.url}#toolbar=0`}
              width="100%"
              height="500px"
              title={previewFile.name}
              frameBorder="0"
            />
          )}
          
          {(previewFile.type === 'document' && previewFile.extension !== 'pdf') && (
            <div className="text-center p-5">
              <div className="display-1 mb-3">📄</div>
              <p>This document cannot be previewed directly.</p>
              <Button
                variant="primary"
                as="a"
                href={previewFile.url}
                target="_blank"
                download
              >
                Download to view
              </Button>
            </div>
          )}
          
          {previewFile.type === 'spreadsheet' && (
            <div className="text-center p-5">
              <div className="display-1 mb-3">📊</div>
              <p>This spreadsheet cannot be previewed directly.</p>
              <Button
                variant="primary"
                as="a"
                href={previewFile.url}
                target="_blank"
                download
              >
                Download to view
              </Button>
            </div>
          )}
          
          {previewFile.type === 'presentation' && (
            <div className="text-center p-5">
              <div className="display-1 mb-3">🖼️</div>
              <p>This presentation cannot be previewed directly.</p>
              <div className="mb-3">
                <small className="text-muted">File: {previewFile.name}</small>
              </div>
              <Button
                variant="primary"
                as="a"
                href={previewFile.url}
                target="_blank"
                download
              >
                Download to view
              </Button>
            </div>
          )}
          
          {previewFile.type === 'other' && (
            <div className="text-center p-5">
              <div className="display-1 mb-3">📄</div>
              <p>This file type cannot be previewed.</p>
              <Button
                variant="primary"
                as="a"
                href={previewFile.url}
                target="_blank"
                download
              >
                Download to view
              </Button>
            </div>
          )}
        </div>
      )}
    </Modal.Body>
    <Modal.Footer>
      <Button variant="secondary" onClick={() => setShowFilePreview(false)}>
        Close
      </Button>
      <Button
        variant="primary"
        as="a"
        href={previewFile?.url}
        download
        target="_blank"
      >
        Download
      </Button>
    </Modal.Footer>
  </Modal>
}

// ================= Student Grades =================
function StudentGrades() {
  const [grades, setGrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showToast, setShowToast] = useState(false);
  

  useEffect(() => {
    fetchGrades();
  }, []);

  const fetchGrades = async () => {
    setLoading(true);
    try {
      const token = getAuthToken();
      const username = getUsername();
      const response = await axios.get(`${API_BASE_URL}/api/student-grades/${username}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setGrades(response.data || []);
      
    } catch (err) {
      console.error("Error fetching grades:", err);
      setError(err.response?.data?.error || "Failed to fetch grades");
      setShowToast(true);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-4">
        <Spinner animation="border" role="status" aria-label="Loading grades" />
        <p>Loading your grades...</p>
      </div>
    );
  }

  return (
    <div className="dashboard-content">
      <h2 className="fw-bold mb-4">My Grades</h2>
      
      {error && (
        <Toast
          show={showToast}
          onClose={() => setShowToast(false)}
          delay={5000}
          autohide
          bg="danger"
          style={{ position: "fixed", top: "20px", right: "20px", zIndex: 10000 }}
        >
          <Toast.Body className="text-white">{error}</Toast.Body>
        </Toast>
      )}
      
      {grades.length === 0 ? (
        <Card className="p-4 text-center text-muted">
          <h5>No grades available yet</h5>
          <p>Your grades will appear here once your teachers have graded your assignments and exams.</p>
        </Card>
      ) : (
        <Row>
          {grades.map((grade, index) => (
            <Col key={grade._id || index} md={6} lg={4} className="mb-3">
              <Card className="h-100">
                <Card.Body>
                  <div className="d-flex justify-content-between align-items-start">
                    <div>
                      <div className="fw-bold">{grade.class}</div>
                      <div className="text-muted" style={{ fontSize: 12 }}>
                        {grade.assignment || 'Assignment'}
                      </div>
                    </div>
                    <span className={`badge ${grade.grade >= 90 ? 'bg-success' : grade.grade >= 80 ? 'bg-warning' : 'bg-danger'}`}>
                      {grade.grade}
                    </span>
                  </div>
                  {grade.feedback && (
                    <div className="mt-2">
                      <small className="text-muted">Feedback:</small>
                      <div style={{ whiteSpace: "pre-wrap", fontSize: 14 }}>{grade.feedback}</div>
                    </div>
                  )}
                  {grade.submittedAt && (
                    <div className="mt-2">
                      <small className="text-muted">
                        Submitted: {new Date(grade.submittedAt).toLocaleDateString()}
                      </small>
                    </div>
                  )}
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>
      )}
    </div>
  );
}

// ================= Student Profile =================
function StudentProfile() {
  const [profile, setProfile] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [showToast, setShowToast] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    email: ''
  });
  const [stats, setStats] = useState({
    totalClasses: 0,
    totalMaterials: 0,
    totalExams: 0
  });

  const navigate = useNavigate();

  useEffect(() => {
    fetchProfile();
    fetchStats();
  }, []);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const token = getAuthToken();
      const response = await axios.get(`${API_BASE_URL}/api/profile`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProfile(response.data);
    } catch (err) {
      console.error("Error fetching profile:", err);
      setError(err.response?.data?.error || "Failed to load profile");
      setShowToast(true);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const token = getAuthToken();
      const username = getUsername();
      
      // Fetch student's enrolled classes
      const classesResponse = await axios.get(`${API_BASE_URL}/api/student-classes/${username}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const classes = classesResponse.data || [];
      
      // Fetch materials and exams for all classes
      let totalMaterials = 0;
      let totalExams = 0;
      
      for (const cls of classes) {
        try {
          // Fetch materials for this class
          const materialsResponse = await axios.get(`${API_BASE_URL}/api/materials?className=${encodeURIComponent(cls.name)}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          totalMaterials += materialsResponse.data?.length || 0;
          
          // Fetch exams for this class
          const examsResponse = await axios.get(`${API_BASE_URL}/api/exams?className=${encodeURIComponent(cls.name)}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          totalExams += examsResponse.data?.length || 0;
        } catch (err) {
          console.warn(`Failed to fetch data for class ${cls.name}:`, err);
          // Continue with other classes
        }
      }
      
      setStats({
        totalClasses: classes.length,
        totalMaterials: totalMaterials,
        totalExams: totalExams
      });
    } catch (err) {
      console.error("Error fetching stats:", err);
      // Set default stats on error
      setStats({
        totalClasses: 0,
        totalMaterials: 0,
        totalExams: 0
      });
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    navigate('/login');
  };

  const handleEditProfile = () => {
    // Allow adding email only if the account was not created via Google
    if (profile && profile.googleId) {
      setEditForm({ name: profile.name || '' });
    } else {
      setEditForm({ name: profile.name || '', email: profile.email || '' });
    }
    setShowEditModal(true);
  };

  const handleSaveProfile = async () => {
    try {
      const token = getAuthToken();
      const response = await axios.put(`${API_BASE_URL}/api/profile`, editForm, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProfile(response.data);
      setShowEditModal(false);
      setSuccessMessage("Profile updated successfully!");
      setShowToast(true);
    } catch (err) {
      console.error("Error updating profile:", err);
      setError(err.response?.data?.error || "Failed to update profile");
      setShowToast(true);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" role="status" aria-label="Loading profile" className="mb-3" />
        <h5>Loading your profile...</h5>
      </div>
    );
  }

  return (
    <div>
      {(error || successMessage) && (
        <Toast
          show={showToast}
          onClose={() => {
            setShowToast(false);
            setError("");
            setSuccessMessage("");
          }}
          delay={5000}
          autohide
          bg={successMessage ? "success" : "danger"}
          style={{ position: "fixed", top: "20px", right: "20px", zIndex: 10000 }}
        >
          <Toast.Body className="text-white">
            {successMessage || error}
          </Toast.Body>
        </Toast>
      )}

      {/* Header Section */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2 className="fw-bold text-primary">My Profile</h2>
        <div className="d-flex align-items-center gap-3">
          {/* Notifications are shown at the dashboard/account level, not per-class */}
          {/* Leave class dropdown menu */}
        </div>
      </div>

      <Row>
        {/* Profile Information Card */}
        <Col lg={8} className="mb-4">
          <Card className="h-100 modern-card">
            <Card.Header className="modern-card-header d-flex align-items-center justify-content-between">
              <h5 className="mb-0">
                <i className="bi bi-person-circle me-2"></i>Personal Information
              </h5>
              <div>
                <Button variant="outline-light" size="sm" onClick={handleEditProfile} aria-label="Edit profile settings">
                  <i className="bi bi-gear-fill"></i>
                </Button>
              </div>
            </Card.Header>
            <Card.Body>
              <Row>
                <Col md={6} className="mb-3">
                  <div className="p-3 bg-light rounded">
                    <div className="d-flex align-items-center mb-2">
                      <i className="bi bi-person-badge text-primary me-2"></i>
                      <strong className="text-muted">Full Name</strong>
                    </div>
                    <h6 className="mb-0">{profile.name || "Not provided"}</h6>
                  </div>
                </Col>
                <Col md={6} className="mb-3">
                  <div className="p-3 bg-light rounded">
                    <div className="d-flex align-items-center mb-2">
                      <i className="bi bi-at text-primary me-2"></i>
                      <strong className="text-muted">Username</strong>
                    </div>
                    <h6 className="mb-0">{profile.username || "N/A"}</h6>
                  </div>
                </Col>
                <Col md={6} className="mb-3">
                  <div className="p-3 bg-light rounded">
                    <div className="d-flex align-items-center mb-2">
                      <i className="bi bi-envelope text-primary me-2"></i>
                      <strong className="text-muted">Email</strong>
                    </div>
                    <h6 className="mb-0">{profile.email || "Not provided"}</h6>
                  </div>
                </Col>
                <Col md={6} className="mb-3">
                  <div className="p-3 bg-light rounded">
                    <div className="d-flex align-items-center mb-2">
                      <i className="bi bi-shield-check text-primary me-2"></i>
                      <strong className="text-muted">Role</strong>
                    </div>
                    <span className="badge bg-success fs-6">{profile.role || "Student"}</span>
                  </div>
                </Col>
                <Col md={6} className="mb-3">
                  <div className="p-3 bg-warning bg-opacity-10 rounded">
                    <div className="d-flex align-items-center mb-2">
                      <i className="bi bi-star-fill text-warning me-2"></i>
                      <strong className="text-muted">Credit Points</strong>
                    </div>
                    <h6 className="mb-0 text-warning fw-bold">{profile.creditPoints || 0} ⭐</h6>
                  </div>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Col>

        {/* Statistics Card */}
        <Col lg={4} className="mb-4">
          <Card className="h-100 modern-card">
            <Card.Header className="modern-card-header">
              <h5 className="mb-0">
                <i className="bi bi-graph-up me-2"></i>Academic Statistics
              </h5>
            </Card.Header>
            <Card.Body>
              <div className="row g-3">
                <div className="col-6">
                  <div className="text-center p-3 bg-primary bg-opacity-10 rounded">
                    <i className="bi bi-journal-bookmark-fill text-primary fs-3"></i>
                    <h3 className="fw-bold text-primary mb-0">{stats.totalClasses}</h3>
                    <small className="text-muted">Enrolled Classes</small>
                  </div>
                </div>
                <div className="col-6">
                  <div className="text-center p-3 bg-success bg-opacity-10 rounded">
                    <i className="bi bi-book-fill text-success fs-3"></i>
                    <h3 className="fw-bold text-success mb-0">{stats.totalMaterials}</h3>
                    <small className="text-muted">Materials</small>
                  </div>
                </div>
                <div className="col-12">
                  <div className="text-center p-3 bg-info bg-opacity-10 rounded">
                    <i className="bi bi-clipboard-check-fill text-info fs-3"></i>
                    <h3 className="fw-bold text-info mb-0">{stats.totalExams}</h3>
                    <small className="text-muted">Available Exams</small>
                  </div>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Quick Actions removed to match Teacher profile; Settings button moved to profile header */}

      {/* Edit Profile Modal */}
      <Modal show={showEditModal} onHide={() => setShowEditModal(false)} centered>
        <Modal.Header closeButton className="border-0">
          <Modal.Title>⚙️ Edit Profile</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Name</Form.Label>
              <Form.Control
                type="text"
                value={editForm.name}
                onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                placeholder="Enter your name"
              />
            </Form.Group>
            {!profile?.googleId && (
              <Form.Group className="mb-3">
                <Form.Label>Email</Form.Label>
                <Form.Control
                  type="email"
                  value={editForm.email || ''}
                  onChange={(e) => setEditForm({...editForm, email: e.target.value})}
                  placeholder="Enter your email"
                />
              </Form.Group>
            )}
          </Form>
        </Modal.Body>
        <Modal.Footer className="border-0">
          <Button variant="outline-secondary" onClick={() => setShowEditModal(false)}>
            Cancel
          </Button>
          <Button className="btn-modern-primary" onClick={handleSaveProfile}>
            <i className="bi bi-check-circle me-2"></i>
            Save Changes
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Logout Confirmation Modal */}
      <Modal show={showLogoutModal} onHide={() => setShowLogoutModal(false)} centered>
        <Modal.Header closeButton className="border-0">
          <Modal.Title>🚪 Confirm Logout</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="text-center py-3">
            <i className="bi bi-question-circle text-warning" style={{ fontSize: '3rem' }}></i>
            <h5 className="mt-3 mb-2">Are you sure you want to logout?</h5>
            <p className="text-muted">You will need to login again to access your account.</p>
          </div>
        </Modal.Body>
        <Modal.Footer className="border-0">
          <Button variant="outline-secondary" onClick={() => setShowLogoutModal(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleLogout}>
            <i className="bi bi-box-arrow-right me-2"></i>
            Logout
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}

export default StudentDashboard;
