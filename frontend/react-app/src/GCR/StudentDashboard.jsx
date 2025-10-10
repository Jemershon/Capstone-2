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
              aria-label="Dashboard and Classes"
            >
              🏠 Dashboard & Classes
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
                  aria-label="Dashboard and Classes"
                >
                  🏠 Dashboard & Classes
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
          {/* Account-level notifications (absolute so it doesn't add vertical gap) */}
          <div style={{ position: 'absolute', top: 12, right: 18, zIndex: 1050 }}>
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
      <h2 className="fw-bold mb-4">Dashboard & Classes</h2>
      
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
              <Card.Footer className="d-flex justify-content-end">
                <Button 
                  variant="primary" 
                  size="sm" 
                  aria-label={`Enter class ${cls.name}`}
                  as={Link}
                  to={`/student/class/${encodeURIComponent(cls.name)}`}
                >
                  Enter Class
                </Button>
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

  const handleTakeExam = (exam) => {
    window.location.href = `/student/exam/${exam._id}`;
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
    <Container fluid className="p-4">
      <Row>
        <Col>
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h2 className="fw-bold text-primary">{className}</h2>
            <div className="d-flex align-items-center gap-3">
              {/* Leave class dropdown menu */}
              <Dropdown align="end">
                <Dropdown.Toggle 
                  variant="outline-secondary" 
                  size="sm"
                  className="d-flex align-items-center px-2"
                  style={{ minWidth: '35px' }}
                >
                  •••
                </Dropdown.Toggle>
                
                <Dropdown.Menu>
                  <Dropdown.Item 
                    className="text-danger d-flex align-items-center"
                    onClick={() => setShowLeaveModal(true)}
                  >
                    <span style={{ marginRight: '8px' }}>🚪</span>
                    Leave class
                  </Dropdown.Item>
                </Dropdown.Menu>
              </Dropdown>
            </div>
          </div>

          <Tabs activeKey={activeTab} onSelect={(tab) => setActiveTab(tab)} className="mb-4">
            {/* Stream Tab */}
            <Tab eventKey="stream" title="Stream">
              <div className="stream-content">
                {announcements.length === 0 ? (
                  <Card className="text-center p-4">
                    <p className="text-muted">No announcements yet</p>
                  </Card>
                ) : (
                  announcements.map((announcement, index) => (
                    <Card key={index} className="mb-3">
                      <Card.Body>
                        <div className="d-flex align-items-center mb-2">
                          <div className="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center me-3" 
                               style={{ width: 40, height: 40 }}>
                            {teacher ? teacher[0].toUpperCase() : 'T'}
                          </div>
                          <div>
                            <strong>{teacher}</strong>
                            <br />
                            <small className="text-muted">{new Date(announcement.date).toLocaleString()}</small>
                          </div>
                        </div>
                        <p>{announcement.text}</p>
                        {announcement.examId && (
                          <Badge bg="info" className="me-2">Exam Posted</Badge>
                        )}
                      </Card.Body>
                    </Card>
                  ))
                )}
              </div>
            </Tab>

            {/* Other tabs... */}
            <Tab eventKey="classwork" title="Classwork">
              {/* Tab content... */}
            </Tab>
            <Tab eventKey="people" title="People">
              {/* Tab content... */}
            </Tab>
            <Tab eventKey="materials" title="Materials">
              {/* Tab content... */}
            </Tab>
            <Tab eventKey="grades" title="Grades">
              {/* Tab content... */}
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
          {/* Form content... */}
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
    </Container>
  );
}

// ================= Student Grades =================
function StudentGrades() {
  // Implementation...
  return <div>Student Grades Component</div>;
}

// ================= Student Profile =================
function StudentProfile() {
  // Implementation...
  return <div>Student Profile Component</div>;
}

export default StudentDashboard;
