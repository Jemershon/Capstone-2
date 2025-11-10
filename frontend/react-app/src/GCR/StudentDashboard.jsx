import React, { useState, useEffect } from "react";
import { Routes, Route, NavLink, useNavigate, useParams, Link } from "react-router-dom";
import axios from "axios";
import { Container, Row, Col, Nav, Navbar, Card, Button, Table, Modal, Form, Tab, Tabs, Badge, Alert, Spinner, Toast, ListGroup, Dropdown } from "react-bootstrap";
import { getAuthToken, getUsername, getUserRole, checkAuth, clearAuthData, API_BASE_URL } from "../api";
import NotificationsDropdown from "./components/NotificationsDropdown";

// Add custom styles for responsive design
const customStyles = `
  .main-content-responsive {
    margin-left: 0;
    padding: 20px;
  }
  
  @media (min-width: 768px) {
    .main-content-responsive {
      margin-left: 16.666667%;
      padding: 20px;
    }
  }
  
  .nav-link-custom {
    border-radius: 4px;
    margin-bottom: 5px;
    transition: background-color 0.2s;
  }
  
  .nav-link-custom:hover {
    background-color: rgba(255, 255, 255, 0.1);
  }
  
  .nav-link-custom.active {
    background-color: rgba(255, 255, 255, 0.2);
  }

  /* Three-dot menu dropdown (match teacher) */
  .dropdown-toggle::after {
    display: none !important;
  }
  
  /* Force remove all hover effects from dropdown toggle button */
  button.btn-link.dropdown-toggle,
  button.btn-link.dropdown-toggle:hover,
  button.btn-link.dropdown-toggle:focus,
  button.btn-link.dropdown-toggle:active,
  button.btn-link.dropdown-toggle:focus-visible,
  .btn-link:hover,
  .btn-link:focus,
  .btn-link:active {
    color: #6c757d !important;
    text-decoration: none !important;
    background: transparent !important;
    background-color: transparent !important;
    border: none !important;
    box-shadow: none !important;
    outline: none !important;
    -webkit-box-shadow: none !important;
  }
  
  .dropdown-menu {
    border-radius: 12px;
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.15);
    border: none;
    padding: 8px 0;
  }
  
  .dropdown-item {
    padding: 10px 20px;
    transition: all 0.2s ease;
    font-size: 0.95rem;
  }
  
  .dropdown-item:hover {
    background-color: rgba(163, 12, 12, 0.08);
    color: #a30c0c;
    transform: translateX(3px);
  }
  
  .dropdown-item.text-danger:hover {
    background-color: rgba(220, 53, 69, 0.1);
    color: #dc3545;
  }
  
  .dropdown-divider {
    margin: 8px 0;
    border-color: rgba(0, 0, 0, 0.1);
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
  const navigate = useNavigate();

  useEffect(() => {
    const verifyToken = async () => {
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

    if (isAuthenticated) {
      verifyToken();
    } else {
      setLoading(false);
    }
  }, [navigate, isAuthenticated]);

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
          <p>🔐 Verifying authentication... (Token: {getAuthToken() ? "✅ Present" : "❌ Missing"})</p>
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
    <Container fluid>
      <Row>
        {/* Sidebar for desktop */}
        <Col md={2} className="d-none d-md-block bg-dark text-white vh-100 p-3 position-fixed" style={{top: 0, left: 0, zIndex: 1000}}>
          <h4 className="text-center mb-4">Student Panel</h4>
          <Nav className="flex-column">
            <Nav.Link
              as={NavLink}
              to="/student/dashboard"
              className="text-white nav-link-custom"
              aria-label="Classes"
            >
              🏠 Classes
            </Nav.Link>
            <Nav.Link
              as={NavLink}
              to="/student/grades"
              className="text-white nav-link-custom"
              aria-label="My Grades"
            >
              📊 My Grades
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
        <div className="d-md-none position-fixed w-100" style={{top: 0, zIndex: 1000}}>
          <Navbar bg="dark" variant="dark" expand="md">
            <Navbar.Brand className="ms-2">Student Panel</Navbar.Brand>
            <Navbar.Toggle aria-controls="mobile-nav" />
            <Navbar.Collapse id="mobile-nav">
              <Nav className="flex-column p-2">
                <Nav.Link
                  as={Link}
                  to="/student/dashboard"
                  className="text-white"
                  aria-label="Classes"
                >
                  🏠 Classes
                </Nav.Link>
                <Nav.Link
                  as={Link}
                  to="/student/grades"
                  className="text-white"
                  aria-label="My Grades"
                >
                  📊 My Grades
                </Nav.Link>
                <Nav.Link
                  as={Link}
                  to="/student/profile"
                  className="text-white"
                  aria-label="Profile"
                >
                  👤 Profile
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
        <Col md={10} className="main-content-responsive" style={{ position: 'relative' }}>
          {/* Account-level notifications (absolute so it doesn't add vertical gap) - hide on small screens */}
          <div className="d-none d-md-block" style={{ position: 'absolute', top: 12, right: 18, zIndex: 1050 }}>
            <NotificationsDropdown />
          </div>
          <Routes>
            <Route path="/" element={<StudentMainDashboard />} />
            <Route path="/dashboard" element={<StudentMainDashboard />} />
            <Route path="/class/:className" element={<StudentClassStream />} />
            <Route path="/grades" element={<StudentGrades />} />
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
    <div style={{ marginTop: '60px', padding: '20px' }}>
  <h2 className="fw-bold mb-4">Classes</h2>
      
      {error && (
        <Toast
          show={showToast}
          onClose={() => setShowToast(false)}
          delay={5000}
          autohide
          bg={error.includes("successfully") ? "success" : "danger"}
          style={{ position: "fixed", top: "20px", right: "20px", zIndex: 10000 }}
        >
          <Toast.Body className="text-white">{error}</Toast.Body>
        </Toast>
      )}
      
      {debugData && (
        <Alert variant="info" className="mb-4">
          <strong>Debug Info:</strong> Classes: {JSON.stringify(debugData.classes?.length || 0)} items
        </Alert>
      )}
      
      {/* Statistics Cards */}
      <Row className="mb-4">
        <Col md={4}>
          <Card className="p-3 bg-primary text-white">
            <h5>Enrolled Classes</h5>
            <h3>{classes.length}</h3>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="p-3 bg-success text-white">
            <h5>Total Assignments</h5>
            <h3>{classes.reduce((acc, cls) => acc + (cls.assignments?.length || 0), 0)}</h3>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="p-3 bg-info text-white">
            <h5>Active Exams</h5>
            <h3>{classes.reduce((acc, cls) => acc + (cls.exams?.length || 0), 0)}</h3>
          </Card>
        </Col>
      </Row>

      <h4 className="fw-bold mb-3 d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center gap-2">
        <span>My Classes:</span>
        <Button
          size="sm"
          variant="outline-primary"
          onClick={() => setShowJoinModal(true)}
          aria-label="Join a new class"
          className="w-100 w-sm-auto"
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
              className="p-3 h-100"
              style={{ backgroundColor: cls.bg || "#F8F9FA", border: "1px solid #ccc", borderRadius: "8px" }}
            >
              <Card.Body>
                <div className="mb-2">
                  <Card.Title className="fw-bold">{cls.name}</Card.Title>
                  <Card.Subtitle className="mb-2 text-muted">{cls.section}</Card.Subtitle>
                </div>
                <p className="mb-1">
                  <strong>Teacher:</strong> {cls.teacher}
                </p>
                <p className="mb-0">
                  <strong>Classmates:</strong> {(cls.students?.length || 1) - 1}
                </p>
              </Card.Body>
              <Card.Footer className="d-flex justify-content-end align-items-center gap-2">
                <Dropdown align="end" onClick={(e) => e.stopPropagation()}>
                  <Dropdown.Toggle 
                    variant="link" 
                    size="sm" 
                    className="text-muted p-0"
                    style={{ boxShadow: 'none', border: 'none' }}
                  >
                    <i className="bi bi-three-dots-vertical" style={{ fontSize: '1.2rem' }}></i>
                  </Dropdown.Toggle>
                  <Dropdown.Menu>
                    <Dropdown.Item 
                      className="text-danger"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm(`Are you sure you want to leave "${cls.name}"?`)) {
                          // Handle unenroll
                        }
                      }}
                    >
                      <i className="bi bi-box-arrow-right me-2"></i> Leave Class
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
        <Modal.Header closeButton>
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
          <Button variant="primary" onClick={handleJoinClass} disabled={!joinCode.trim()}>
            Join Class
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Unenroll Confirmation Modal - Google Classroom Style */}
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
          <div className="text-center">
            <div className="mb-3">
              <i className="bi bi-exclamation-triangle text-warning" style={{ fontSize: '48px' }}></i>
            </div>
            <p className="mb-2">
              <strong>{selectedClassToUnenroll?.name}</strong>
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
              onClick={() => setShowUnenrollModal(false)}
            >
              Cancel
            </Button>
            <Button 
              variant="danger" 
              onClick={handleUnenrollClass}
              disabled={!selectedClassToUnenroll}
            >
              Leave class
            </Button>
          </div>
          
          {/* Emergency force leave option - Google Classroom has something similar */}
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
                // Force remove class locally
                if (selectedClassToUnenroll) {
                  const updatedClasses = classes.filter(c => c !== selectedClassToUnenroll);
                  setClasses(updatedClasses);
                  localStorage.setItem('studentClasses', JSON.stringify(updatedClasses));
                  setError(`Class removed from your view`);
                  setShowToast(true);
                }
                setShowUnenrollModal(false);
              }}
            >
              <small>Force remove from my classes</small>
            </Button>
          </div>
        </Modal.Footer>
      </Modal>
    </div>
  );
}

function StudentClassStream() {
  const { className } = useParams();
  const [announcements, setAnnouncements] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [exams, setExams] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [classmates, setClassmates] = useState([]);
  const [teacher, setTeacher] = useState("");
  const [grades, setGrades] = useState([]);
  const [activeTab, setActiveTab] = useState("stream");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [submissionText, setSubmissionText] = useState("");
  const [submissionFile, setSubmissionFile] = useState(null);
  const [showSubmissionModal, setShowSubmissionModal] = useState(false);
  const [currentClass, setCurrentClass] = useState(null);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchClassData();
  }, [className]);

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
        fetchClassmates(token),
        fetchGrades(token, username)
      ]);
    } catch (err) {
      console.error("Error fetching class data:", err);
      setError("Failed to load class data");
    } finally {
      setLoading(false);
    }
  };

  const fetchAnnouncements = async (token) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/classes/${className}/announcements`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAnnouncements(response.data);
    } catch (err) {
      console.error("Error fetching announcements:", err);
    }
  };

  const fetchAssignments = async (token) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/assignments?className=${className}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAssignments(response.data);
    } catch (err) {
      console.error("Error fetching assignments:", err);
    }
  };

  const fetchExams = async (token) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/exams?className=${className}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setExams(response.data);
    } catch (err) {
      console.error("Error fetching exams:", err);
    }
  };

  const fetchMaterials = async (token) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/materials?className=${className}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMaterials(response.data);
    } catch (err) {
      console.error("Error fetching materials:", err);
    }
  };

  const fetchClassmates = async (token) => {
    try {
      console.log("🔍 Fetching class data for:", className);
      const response = await axios.get(`${API_BASE_URL}/api/classes/${className}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      console.log("📚 Class data fetched:", response.data);
      
      if (!response.data) {
        console.error("❌ No class data returned from API");
        return;
      }
      
      setClassmates(response.data.students || []);
      setTeacher(response.data.teacher);
      
      // Check if the class data has an ID before setting
      if (!response.data._id && !response.data.id) {
        console.warn("⚠️ Class data missing ID property:", response.data);
        
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
            response.data._id = matchingClass._id || matchingClass.id;
          }
        } catch (backupErr) {
          console.error("❌ Failed to fetch backup class data:", backupErr);
        }
      }
      
      setCurrentClass(response.data); // Store the current class data
      console.log("✅ Current class set:", response.data);
    } catch (err) {
      console.error("Error fetching classmates:", err);
    }
  };

  const handleLeaveClass = () => {
    console.log("🚪 Attempting to leave class...", { currentClass });
    
    // Always show the leave modal instead of trying to handle leave here
    setShowLeaveModal(true);
  };

  const fetchGrades = async (token, username) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/grades?class=${className}&student=${username}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setGrades(response.data);
    } catch (err) {
      console.error("Error fetching grades:", err);
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

      setSubmissionText("");
      setSubmissionFile(null);
      setSelectedAssignment(null);
      setShowSubmissionModal(false);
      setError("Assignment submitted successfully!");
      setShowToast(true);
      
      // Refresh assignments and grades
      fetchAssignments(token);
      fetchGrades(token, username);
    } catch (err) {
      console.error("Error submitting assignment:", err);
      setError(err.response?.data?.error || "Failed to submit assignment. Please try again.");
      setShowToast(true);
    }
  };

  const handleConfirmLeaveClass = async () => {
    setShowLeaveModal(false);
    
    try {
      const token = getAuthToken();
      const classId = currentClass._id || currentClass.id;
      
      if (!classId) {
        throw new Error("Class ID not found");
      }
      
      // Leave class API call
      await axios.delete(`${API_BASE_URL}/api/leave-class/${classId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Navigate back to dashboard
      navigate("/student/dashboard");
    } catch (err) {
      console.error("Error leaving class:", err);
      setError(err.response?.data?.error || "Failed to leave class. Please try again.");
      setShowToast(true);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-4">
        <Spinner animation="border" role="status" aria-label="Loading class data" />
        <p>Loading class details...</p>
      </div>
    );
  }

  return (
    <div style={{ marginTop: '60px', padding: '20px' }}>
      <h2 className="fw-bold mb-4">
        <i className="bi bi-class"></i> {currentClass?.name || className}
      </h2>
      
      {error && (
        <Toast
          show={true}
          onClose={() => setError("")}
          delay={5000}
          autohide
          bg="danger"
          style={{ position: "fixed", top: "20px", right: "20px", zIndex: 10000 }}
        >
          <Toast.Body className="text-white">{error}</Toast.Body>
        </Toast>
      )}
      
      {/* Class details header */}
      <Row className="mb-4">
        <Col>
          <Card className="bg-light p-3">
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <h5 className="mb-0">{currentClass?.name}</h5>
                <small className="text-muted">{currentClass?.section}</small>
              </div>
              <div>
                <Button
                  variant="outline-danger"
                  size="sm"
                  onClick={handleLeaveClass}
                  aria-label="Leave class"
                >
                  <i className="bi bi-box-arrow-right"></i> Leave Class
                </Button>
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Tabs for stream, assignments, exams, materials, classmates, grades */}
      <Tabs
        activeKey={activeTab}
        onSelect={(k) => setActiveTab(k)}
        className="mb-4"
        fill
      >
        <Tab eventKey="stream" title={<span><i className="bi bi-house-door"></i> Stream</span>}>
          {/* Stream content - announcements */}
          <Card className="p-3">
            <h5 className="mb-3">Announcements</h5>
            {announcements.length === 0 ? (
              <p className="text-muted">No announcements yet.</p>
            ) : (
              <ListGroup>
                {announcements.map((ann, idx) => (
                  <ListGroup.Item key={ann._id} className="border-0 ps-0 pe-0">
                    <div className="d-flex justify-content-between align-items-start">
                      <div>
                        <strong>{ann.title}</strong>
                        <div className="text-muted" style={{ fontSize: '0.9rem' }}>
                          {new Date(ann.date).toLocaleString()}
                        </div>
                      </div>
                      <div>
                        <Button
                          variant="link"
                          size="sm"
                          className="text-muted"
                          onClick={() => {
                            // TODO: Add mark as read functionality
                          }}
                        >
                          <i className="bi bi-check-circle"></i>
                        </Button>
                      </div>
                    </div>
                    <div className="mt-2">
                      <p className="mb-1" style={{ whiteSpace: 'pre-wrap' }}>
                        {ann.content}
                      </p>
                    </div>
                  </ListGroup.Item>
                ))}
              </ListGroup>
            )}
          </Card>
        </Tab>
        <Tab eventKey="assignments" title={<span><i className="bi bi-file-earmark-text"></i> Assignments</span>}>
          {/* Assignments content */}
          <Card className="p-3">
            <h5 className="mb-3">Assignments</h5>
            {assignments.length === 0 ? (
              <p className="text-muted">No assignments due.</p>
            ) : (
              <ListGroup>
                {assignments.map((assign) => (
                  <ListGroup.Item key={assign._id} className="border-0 ps-0 pe-0">
                    <div className="d-flex justify-content-between align-items-center">
                      <div>
                        <strong>{assign.title}</strong>
                        <div className="text-muted" style={{ fontSize: '0.9rem' }}>
                          Due: {new Date(assign.dueDate).toLocaleString()}
                        </div>
                      </div>
                      <div>
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => {
                            setSelectedAssignment(assign);
                            setShowSubmissionModal(true);
                          }}
                        >
                          <i className="bi bi-pencil"></i> Submit
                        </Button>
                      </div>
                    </div>
                  </ListGroup.Item>
                ))}
              </ListGroup>
            )}
          </Card>
        </Tab>
        <Tab eventKey="exams" title={<span><i className="bi bi-journal-check"></i> Exams</span>}>
          {/* Exams content */}
          <Card className="p-3">
            <h5 className="mb-3">Exams</h5>
            {exams.length === 0 ? (
              <p className="text-muted">No upcoming exams.</p>
            ) : (
              <ListGroup>
                {exams.map((exam) => (
                  <ListGroup.Item key={exam._id} className="border-0 ps-0 pe-0">
                    <div className="d-flex justify-content-between align-items-center">
                      <div>
                        <strong>{exam.title}</strong>
                        <div className="text-muted" style={{ fontSize: '0.9rem' }}>
                          Date: {new Date(exam.date).toLocaleString()}
                        </div>
                      </div>
                      <div>
                        <Button
                          variant="outline-primary"
                          size="sm"
                          onClick={() => {
                            // TODO: Add view exam functionality
                          }}
                        >
                          <i className="bi bi-eye"></i> View Exam
                        </Button>
                      </div>
                    </div>
                  </ListGroup.Item>
                ))}
              </ListGroup>
            )}
          </Card>
        </Tab>
        <Tab eventKey="materials" title={<span><i className="bi bi-file-earmark-text"></i> Materials</span>}>
          {/* Materials content */}
          <Card className="p-3">
            <h5 className="mb-3">Materials</h5>
            {materials.length === 0 ? (
              <p className="text-muted">No materials uploaded yet.</p>
            ) : (
              <ListGroup>
                {materials.map((material) => (
                  <ListGroup.Item key={material._id} className="border-0 ps-0 pe-0">
                    <div className="d-flex justify-content-between align-items-center">
                      <div>
                        <strong>{material.title}</strong>
                        <div className="text-muted" style={{ fontSize: '0.9rem' }}>
                          Uploaded on: {new Date(material.uploadDate).toLocaleString()}
                        </div>
                      </div>
                      <div>
                        <Button
                          variant="outline-success"
                          size="sm"
                          onClick={() => {
                            // TODO: Add download material functionality
                          }}
                        >
                          <i className="bi bi-download"></i> Download
                        </Button>
                      </div>
                    </div>
                  </ListGroup.Item>
                ))}
              </ListGroup>
            )}
          </Card>
        </Tab>
        <Tab eventKey="classmates" title={<span><i className="bi bi-people"></i> Classmates</span>}>
          {/* Classmates content */}
          <Card className="p-3">
            <h5 className="mb-3">Classmates</h5>
            {classmates.length === 0 ? (
              <p className="text-muted">No classmates found.</p>
            ) : (
              <ListGroup>
                {classmates.map((student) => (
                  <ListGroup.Item key={student._id} className="border-0 ps-0 pe-0">
                    <div className="d-flex justify-content-between align-items-center">
                      <div>
                        <strong>{student.name}</strong>
                        <div className="text-muted" style={{ fontSize: '0.9rem' }}>
                          {student.email}
                        </div>
                      </div>
                      <div>
                        <Button
                          variant="outline-info"
                          size="sm"
                          onClick={() => {
                            // TODO: Add message or view profile functionality
                          }}
                        >
                          <i className="bi bi-info-circle"></i> Info
                        </Button>
                      </div>
                    </div>
                  </ListGroup.Item>
                ))}
              </ListGroup>
            )}
          </Card>
        </Tab>
        <Tab eventKey="grades" title={<span><i className="bi bi-bar-chart"></i> Grades</span>}>
          {/* Grades content */}
          <Card className="p-3">
            <h5 className="mb-3">Grades</h5>
            {grades.length === 0 ? (
              <p className="text-muted">No grades available.</p>
            ) : (
              <Table striped bordered hover size="sm">
                <thead>
                  <tr>
                    <th>Assignment/Exam</th>
                    <th>Grade</th>
                    <th>Weight</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {grades.map((grade) => (
                    <tr key={grade._id}>
                      <td>{grade.title}</td>
                      <td>{grade.grade !== undefined ? grade.grade : "N/A"}</td>
                      <td>{grade.weight !== undefined ? `${grade.weight}%` : "N/A"}</td>
                      <td>
                        {grade.submitted ? (
                          <Badge bg="success" text="white">
                            Submitted
                          </Badge>
                        ) : (
                          <Badge bg="danger" text="white">
                            Not Submitted
                          </Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Card>
        </Tab>
      </Tabs>

      {/* Submission Modal for assignments */}
      <Modal
        show={showSubmissionModal}
        onHide={() => setShowSubmissionModal(false)}
        centered
        size="lg"
      >
        <Modal.Header closeButton>
          <Modal.Title>Submit Assignment: {selectedAssignment?.title}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group controlId="formSubmissionText">
              <Form.Label>Submission Comments</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                placeholder="Optional: Add any comments about your submission"
                value={submissionText}
                onChange={(e) => setSubmissionText(e.target.value)}
              />
            </Form.Group>

            <Form.Group controlId="formFileUpload">
              <Form.Label>Upload File</Form.Label>
              <Form.Control
                type="file"
                accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,.jpg,.jpeg,.png"
                onChange={(e) => setSubmissionFile(e.target.files[0])}
              />
              <Form.Text className="text-muted">
                Max file size: 10MB. Accepted formats: PDF, DOC, PPT, TXT, JPG, PNG.
              </Form.Text>
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
          <Modal.Title>Leave Class Confirmation</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>Are you sure you want to leave the class <strong>{currentClass?.name}</strong>?</p>
          <p className="text-danger">
            Warning: You will lose access to all class materials, assignments, and announcements.
          </p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowLeaveModal(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleConfirmLeaveClass}>
            Leave Class
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}

export default StudentDashboard;
