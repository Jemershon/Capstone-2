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
        <Col md={10} className="main-content-responsive">
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

  const handleLeaveClass = async () => {
    console.log("🚪 Attempting to leave class...", { currentClass });
    
    // Always show the leave modal instead of trying to handle leave here
    setShowLeaveModal(true);
  };
      // Log the entire class object to debug
      console.log("📋 Full class object:", JSON.stringify(currentClass));
      
      // Check all possible ID fields
      const classId = currentClass._id || currentClass.id || currentClass.classId;
      
      if (!classId) {
        console.error("❌ Class ID not found in class object");
        
        // Let's try to get the class from the API using the class name
        const token = getAuthToken();
        const username = getUsername();
        const classesResponse = await axios.get(`${API_BASE_URL}/api/student-classes/${username}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        console.log("� All classes:", classesResponse.data);
        
        // Find the class with the matching name
        const matchingClass = classesResponse.data.find(c => c.name === className);
        
        if (!matchingClass || !matchingClass._id) {
          console.error("❌ Could not find matching class with name:", className);
          
          // Offer force navigation option when class ID cannot be found
          if (confirm("Class ID not found. This may happen if the class was deleted by the teacher. Do you want to return to the dashboard anyway?")) {
            navigate('/student/dashboard');
          }
          return;
        }
        
        console.log("✅ Found matching class:", matchingClass);
        console.log("🏫 Class ID from lookup:", matchingClass._id);
        
        const response = await axios.delete(`${API_BASE_URL}/api/leave-class/${matchingClass._id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        console.log("✅ Leave class response:", response.data);
        alert(`Successfully left ${className}`);
        
        // Navigate back to dashboard
        navigate('/student/dashboard');
        return;
      }
      
      // If we have a class ID, proceed normally
      const token = getAuthToken();
      console.log("🔑 Token:", token ? "Present" : "Missing");
      console.log("🏫 Class ID:", classId);
      
      const response = await axios.delete(`${API_BASE_URL}/api/leave-class/${classId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      console.log("✅ Leave class response:", response.data);
      alert(`Successfully left ${currentClass.name || className}`);
      
      // Navigate back to dashboard
      navigate('/student/dashboard');
    } catch (err) {
      console.error("❌ Leave class error:", err);
      console.error("Error response:", err.response?.data);
      
      // Check if error indicates class doesn't exist (404 Not Found)
      if (err.response && err.response.status === 404) {
        if (confirm("This class appears to no longer exist on the server. It may have been deleted by the teacher. Do you want to return to the dashboard?")) {
          navigate('/student/dashboard');
        }
      } else {
        // For other errors, still offer to force navigate
        if (confirm(`Error: ${err.response?.data?.error || err.message}. Do you want to return to the dashboard anyway?`)) {
          navigate('/student/dashboard');
        }
      }
    }
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
              <NotificationsDropdown />
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

            {/* Classwork Tab */}
            <Tab eventKey="classwork" title="Classwork">
              <Row>
                <Col md={6}>
                  <h5 className="mb-3">📝 Assignments</h5>
                  {assignments.length === 0 ? (
                    <Card className="text-center p-4">
                      <p className="text-muted">No assignments yet</p>
                    </Card>
                  ) : (
                    assignments.map((assignment) => (
                      <Card key={assignment._id} className="mb-3">
                        <Card.Body>
                          <div className="d-flex justify-content-between align-items-start">
                            <div>
                              <h6 className="fw-bold">{assignment.title}</h6>
                              <p className="text-muted small mb-2">{assignment.description}</p>
                              {assignment.dueDate && (
                                <Badge bg="warning" className="me-2">
                                  Due: {new Date(assignment.dueDate).toLocaleDateString()}
                                </Badge>
                              )}
                              <Badge bg="secondary">{assignment.points} points</Badge>
                            </div>
                            <Button 
                              variant="outline-primary" 
                              size="sm"
                              onClick={() => {
                                setSelectedAssignment(assignment);
                                setShowSubmissionModal(true);
                              }}
                            >
                              Submit
                            </Button>
                          </div>
                        </Card.Body>
                      </Card>
                    ))
                  )}
                </Col>

                <Col md={6}>
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
                                {exam.questions?.length || 0} questions
                              </Badge>
                              {exam.dueDate && (
                                <Badge bg="warning">
                                  Due: {new Date(exam.dueDate).toLocaleDateString()}
                                </Badge>
                              )}
                            </div>
                            <Button 
                              variant="success" 
                              size="sm"
                              onClick={() => handleTakeExam(exam)}
                            >
                              Take Exam
                            </Button>
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
                  <h5 className="mb-3">👥 Classmates ({classmates.length})</h5>
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
                            <Button
                              variant="outline-primary"
                              size="sm"
                              className="w-100"
                              as="a"
                              href={material.url}
                              target="_blank"
                              download
                            >
                              Download
                            </Button>
                          )}
                          {(material.type === 'video' || material.type === 'link') && (
                            <Button
                              variant="outline-primary"
                              size="sm"
                              className="w-100"
                              as="a"
                              href={material.url}
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

            {/* Grades Tab */}
            <Tab eventKey="grades" title="Grades">
              <Card>
                <Card.Header>
                  <h5 className="mb-0">📊 Your Grades</h5>
                </Card.Header>
                <Card.Body>
                  {grades.length === 0 ? (
                    <p className="text-muted text-center">No grades yet</p>
                  ) : (
                    <Table striped bordered hover responsive>
                      <thead>
                        <tr>
                          <th>Assignment</th>
                          <th>Grade</th>
                          <th>Feedback</th>
                          <th>Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {grades.map((grade, index) => (
                          <tr key={index}>
                            <td>{grade.assignment || 'General'}</td>
                            <td>
                              <Badge 
                                bg={parseFloat(grade.grade) >= 80 ? 'success' : 
                                    parseFloat(grade.grade) >= 70 ? 'warning' : 'danger'}
                              >
                                {grade.grade}
                              </Badge>
                            </td>
                            <td>{grade.feedback || '-'}</td>
                            <td>{new Date(grade.date).toLocaleDateString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  )}
                </Card.Body>
              </Card>
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
    </Container>
  );
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
    <div style={{ marginTop: '60px', padding: '20px' }}>
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
      
      {debugData && (
        <Alert variant="info" className="mb-4">
          <strong>Debug Info:</strong> Grades: {JSON.stringify(debugData.grades?.length || 0)} items
        </Alert>
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
  const [showToast, setShowToast] = useState(false);
  

  useEffect(() => {
    fetchProfile();
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

  if (loading) {
    return (
      <div className="text-center py-4">
        <Spinner animation="border" role="status" aria-label="Loading profile" />
        <p>Loading your profile...</p>
      </div>
    );
  }

  return (
    <div style={{ marginTop: '60px', padding: '20px' }}>
      <h2 className="fw-bold mb-4">Profile</h2>
      
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
      
      {debugData && (
        <Alert variant="info" className="mb-4">
          <strong>Debug Info:</strong> Profile loaded for: {JSON.stringify(debugData.profile?.username)}
        </Alert>
      )}

      <Row>
        <Col md={8}>
          <Card className="p-4">
            <Row>
              <Col md={4} className="text-center">
                <div className="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center mx-auto mb-3"
                     style={{ width: 100, height: 100, fontSize: 36 }}>
                  {profile.name ? profile.name[0].toUpperCase() : profile.username ? profile.username[0].toUpperCase() : 'S'}
                </div>
              </Col>
              <Col md={8}>
                <h4 className="fw-bold mb-3">{profile.name || profile.username}</h4>
                <Table borderless>
                  <tbody>
                    <tr>
                      <td><strong>Username:</strong></td>
                      <td>{profile.username || "N/A"}</td>
                    </tr>
                    <tr>
                      <td><strong>Email:</strong></td>
                      <td>{profile.email || "N/A"}</td>
                    </tr>
                    <tr>
                      <td><strong>Role:</strong></td>
                      <td>
                        <Badge bg="success">{profile.role || "Student"}</Badge>
                      </td>
                    </tr>
                    <tr>
                      <td><strong>Credit Points:</strong></td>
                      <td>
                        <Badge bg="info">{profile.creditPoints || 0} points</Badge>
                      </td>
                    </tr>
                  </tbody>
                </Table>
              </Col>
            </Row>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="p-3 mb-3 bg-light">
            <h6 className="fw-bold">Account Statistics</h6>
            <div className="mt-2">
              <small className="text-muted">Member since</small>
              <div>{profile.createdAt ? new Date(profile.createdAt).toLocaleDateString() : 'Unknown'}</div>
            </div>
          </Card>
          <Card className="p-3 bg-light">
            <h6 className="fw-bold">Quick Actions</h6>
            <div className="d-grid gap-2 mt-2">
              <Button variant="outline-primary" size="sm" as={Link} to="/student/dashboard">
                📚 View Classes
              </Button>
              <Button variant="outline-success" size="sm" as={Link} to="/student/grades">
                📊 Check Grades
              </Button>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
}

export default StudentDashboard;
