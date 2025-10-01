import React, { useState, useEffect } from "react";
import { Routes, Route, NavLink, useNavigate, useParams, Link } from "react-router-dom";
import axios from "axios";
import { Container, Row, Col, Nav, Navbar, Card, Button, Table, Modal, Form, Tab, Tabs, Badge, Alert, Spinner, Toast, ListGroup, Dropdown } from "react-bootstrap";
import { getAuthToken, getUsername, getUserRole, checkAuth, clearAuthData, API_BASE_URL } from "../api";
import NotificationsDropdown from "./components/NotificationsDropdown";
import Comments from "./components/Comments";

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
  const [lastAuthCheck, setLastAuthCheck] = useState(0); // Add auth caching
  const navigate = useNavigate();

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
  const [debugData, setDebugData] = useState(null);
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
      setDebugData({ classes: fetchedClasses });
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
                  <strong>Class Code:</strong> {cls.code}
                </p>
              </Card.Body>
              <Card.Footer className="d-flex justify-content-between align-items-center">
                <Button 
                  variant="primary" 
                  size="sm" 
                  aria-label={`Enter class ${cls.name}`}
                  as={Link}
                  to={`/student/class/${encodeURIComponent(cls.name)}`}
                >
                  Enter Class
                </Button>
                <Dropdown align="end">
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
  const [showFilePreview, setShowFilePreview] = useState(false);
  const [previewFile, setPreviewFile] = useState(null);
  const [teacher, setTeacher] = useState("");
  const [grades, setGrades] = useState([]);
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
  const [submittedExams, setSubmittedExams] = useState([]);
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
        fetchSubmittedExams(token),
        fetchGrades(token, username)
      ]);
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
      console.log("🔍 Fetching people data for class:", className);
      
      // Use the new people endpoint that returns teacher and classmates details
      const peopleResponse = await axios.get(`${API_BASE_URL}/api/classes/${className}/people`, {
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
      const classResponse = await axios.get(`${API_BASE_URL}/api/classes/${className}`, {
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
          const response = await axios.get(`${API_BASE_URL}/api/classes/${className}`, {
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
      const response = await axios.get(`${API_BASE_URL}/api/exam-submissions/student`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSubmittedExams(response.data.map(submission => submission.examId));
    } catch (err) {
      console.error("Error fetching submitted exams:", err);
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
    console.log("Take Exam clicked:", exam);
    setSelectedExam(exam);
    setExamAnswers({});
    setExamSubmitted(false);
    setShowExamModal(true);
    console.log("Modal should show now");
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
        }))
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
      setExamSubmitted(true);
      setSubmittedExams(prev => [...prev, selectedExam._id]);
      alert(`Exam submitted successfully! Your score: ${response.data.score}%`);
    } catch (err) {
      console.error("Error submitting exam:", err);
      console.error("Error response:", err.response?.data);
      console.error("Error status:", err.response?.status);
      alert(`Error submitting exam: ${err.response?.data?.error || err.message}`);
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
                              {submittedExams.includes(exam._id) && (
                                <Badge bg="success" className="ms-2">
                                  Submitted
                                </Badge>
                              )}
                            </div>
                            {submittedExams.includes(exam._id) ? (
                              <Button 
                                variant="secondary" 
                                size="sm"
                                disabled
                              >
                                Already Submitted
                              </Button>
                            ) : (
                              <Button 
                                variant="success" 
                                size="sm"
                                onClick={() => handleTakeExam(exam)}
                              >
                                Take Exam
                              </Button>
                            )}
                          </div>
                          
                          {/* Comments and Reactions Section for Exams */}
                          <Comments 
                            referenceType="exam"
                            referenceId={exam._id}
                            className={className}
                          />
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
                                onClick={() => handleFilePreview(material.url, material.title, null)}
                              >
                                View
                              </Button>
                              <Button
                                variant="outline-secondary"
                                size="sm"
                                className="flex-grow-1"
                                as="a"
                                href={material.url}
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
              {!examSubmitted ? (
                <>
                  <div className="mb-3">
                    <p><strong>Description:</strong> {selectedExam.description}</p>
                    <p><strong>Total Questions:</strong> {selectedExam.questions?.length || 0}</p>
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
              ) : (
                <div className="text-center">
                  <div className="display-4 text-success mb-3">✓</div>
                  <h5>Exam Submitted Successfully!</h5>
                  <p>Your answers have been recorded. You can close this window.</p>
                </div>
              )}
            </div>
          ) : (
            <p>Loading exam...</p>
          )}
        </Modal.Body>
        <Modal.Footer>
          {!examSubmitted ? (
            <>
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
  const [debugData, setDebugData] = useState(null);

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
      setDebugData({ grades: response.data });
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
  const [debugData, setDebugData] = useState(null);

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
      setDebugData({ profile: response.data });
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