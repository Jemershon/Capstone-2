import React, { useState, useEffect } from "react";
import axios from "axios";
import { NavLink, Link, Routes, Route, useNavigate } from "react-router-dom";
import {
  Container,
  Row,
  Col,
  Nav,
  Navbar,
  Card,
  Button,
  Form,
  Table,
  Modal,
  Toast,
} from "react-bootstrap";

// ================= Dashboard & Classes =================
function DashboardAndClasses() {
  const [classes, setClasses] = useState([]);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [user, setUser] = useState({ email: "" });

  useEffect(() => {
    // Fetch classes from backend
    axios.get("http://localhost:4000/api/classes").then((res) => setClasses(res.data));
    // Fetch user profile
    axios
      .get("http://localhost:4000/api/profile", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      })
      .then((res) => setUser(res.data));
  }, []);

  const handleJoinClass = async () => {
    if (!joinCode) return;
    try {
      await axios.post(
        "http://localhost:4000/api/classes/join",
        {
          code: joinCode.toUpperCase(),
          studentEmail: user.email,
        },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }
      );
      // Refresh classes list
      const res = await axios.get("http://localhost:4000/api/classes");
      setClasses(res.data);
      setShowJoinModal(false);
      setJoinCode("");
      alert("Joined class!");
    } catch (err) {
      alert(err.response?.data?.error || "Failed to join class.");
    }
  };

  return (
    <div>
      <h2 className="fw-bold mb-4">Dashboard & Classes</h2>
      <Row className="mb-4">
        <Col md={4}>
          <Card className="p-3 bg-primary text-white">
            <h5>Total Classes</h5>
            <h3>{classes.length}</h3>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="p-3 bg-success text-white">
            <h5>Assignments Due</h5>
            <h3>2</h3>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="p-3 bg-warning text-dark">
            <h5>Quizzes Pending</h5>
            <h3>1</h3>
          </Card>
        </Col>
      </Row>
      <h4 className="fw-bold mb-3 d-flex justify-content-between align-items-center">
        <span>Your enrolled classes:</span>
        <Button size="sm" variant="outline-primary" onClick={() => setShowJoinModal(true)}>
          + Join Class
        </Button>
      </h4>
      <Row>
        {classes.map((cls) => (
          <Col key={cls._id || cls.id} md={4} className="mb-3">
            <Card className="p-3 h-100" style={{ backgroundColor: cls.bg || "#FFF0D8", border: "1px solid #ccc", borderRadius: "8px" }}>
              <Card.Body>
                <Card.Title className="fw-bold">{cls.name}</Card.Title>
                <Card.Subtitle className="mb-2 text-muted">{cls.teacher}</Card.Subtitle>
                <p className="mb-1"><strong>Class Code:</strong> {cls.code}</p>
                <p className="mb-0"><strong>Students:</strong> {cls.students}</p>
              </Card.Body>
              <Card.Footer className="text-end">
                <Button variant="primary" size="sm">
                  Enter Class
                </Button>
              </Card.Footer>
            </Card>
          </Col>
        ))}
      </Row>
      <Modal show={showJoinModal} onHide={() => setShowJoinModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Join Class</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group>
            <Form.Label>Enter Class Code</Form.Label>
            <Form.Control
              type="text"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
              placeholder="ABC123"
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowJoinModal(false)}>
            Cancel
          </Button>
          <Button variant="success" onClick={handleJoinClass} disabled={!joinCode}>
            Join
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}

// ================= Assignments =================
function Assignments() {
  const [assignments, setAssignments] = useState([]);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [submitFile, setSubmitFile] = useState(null);

  useEffect(() => {
    axios.get("http://localhost:4000/api/assignments").then((res) => setAssignments(res.data));
  }, []);

  const handleOpenSubmit = (assignment) => {
    setSelectedAssignment(assignment);
    setShowSubmitModal(true);
    setSubmitFile(null);
  };

  const handleSubmitAssignment = async () => {
    if (!submitFile) return;
    try {
      // Upload file
      const formData = new FormData();
      formData.append("file", submitFile);
      const uploadRes = await axios.post("http://localhost:4000/api/assignments/upload", formData);
      // Update assignment status
      await axios.put(
        `http://localhost:4000/api/assignments/${selectedAssignment._id}`,
        {
          status: "Submitted",
          submittedFile: uploadRes.data.filename,
        },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }
      );
      // Refresh assignments
      const res = await axios.get("http://localhost:4000/api/assignments");
      setAssignments(res.data);
      setShowSubmitModal(false);
    } catch (err) {
      alert("Failed to submit assignment.");
    }
  };

  return (
    <div>
      <h2 className="fw-bold mb-3">Assignments</h2>
      <Table striped bordered hover>
        <thead>
          <tr>
            <th>Class</th>
            <th>Task</th>
            <th>Description</th>
            <th>Due</th>
            <th>Status</th>
            <th>Submission</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {assignments.length === 0 ? (
            <tr>
              <td colSpan={7} className="text-center text-muted">No assignments.</td>
            </tr>
          ) : (
            assignments.map((a) => (
              <tr key={a._id || a.id}>
                <td>{a.class}</td>
                <td>{a.title}</td>
                <td>{a.description}</td>
                <td>{a.due}</td>
                <td className={a.status === "Submitted" ? "text-success" : "text-warning"}>{a.status}</td>
                <td>{a.submittedFile ? <span className="badge bg-success">{a.submittedFile}</span> : <span className="text-muted">Not submitted</span>}</td>
                <td>
                  {a.status === "Pending" ? (
                    <Button size="sm" variant="primary" onClick={() => handleOpenSubmit(a)}>Submit</Button>
                  ) : <span className="text-success">Done</span>}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </Table>
      <Modal show={showSubmitModal} onHide={() => setShowSubmitModal(false)} centered>
        <Modal.Header closeButton><Modal.Title>Submit Assignment</Modal.Title></Modal.Header>
        <Modal.Body>
          {selectedAssignment && (
            <>
              <p><strong>Task:</strong> {selectedAssignment.title}</p>
              <p><strong>Description:</strong> {selectedAssignment.description}</p>
              <p><strong>Due:</strong> {selectedAssignment.due}</p>
              <Form.Group className="mb-3">
                <Form.Label>Upload your work</Form.Label>
                <Form.Control type="file" onChange={(e) => setSubmitFile(e.target.files[0])} accept="image/*,application/pdf" />
              </Form.Group>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowSubmitModal(false)}>Cancel</Button>
          <Button variant="success" onClick={handleSubmitAssignment} disabled={!submitFile}>Submit</Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}

// ================= Announcements / Stream =================
function Announcements() {
  const [announcements, setAnnouncements] = useState([]);
  useEffect(() => {
    axios.get("http://localhost:4000/api/announcements").then((res) => setAnnouncements(res.data));
  }, []);
  return (
    <div>
      <h2 className="fw-bold mb-3">Announcements / Stream</h2>
      <Table striped bordered hover>
        <thead>
          <tr>
            <th>Teacher</th>
            <th>Date</th>
            <th>Message</th>
            <th>Likes</th>
          </tr>
        </thead>
        <tbody>
          {announcements.map((a) => (
            <tr key={a._id || a.id}>
              <td>{a.teacher}</td>
              <td>{a.date}</td>
              <td>{a.message}</td>
              <td>{a.likes}</td>
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  );
}

// ================= Grades =================
function Grades() {
  const [grades, setGrades] = useState([]);
  useEffect(() => {
    axios.get("http://localhost:4000/api/grades").then((res) => setGrades(res.data));
  }, []);
  return (
    <div>
      <h2 className="fw-bold">Grades</h2>
      <Table striped bordered hover>
        <thead>
          <tr>
            <th>Class</th>
            <th>Grade</th>
            <th>Feedback</th>
          </tr>
        </thead>
        <tbody>
          {grades.map((g, idx) => (
            <tr key={idx}>
              <td>{g.class}</td>
              <td>{g.grade}</td>
              <td>{g.feedback}</td>
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  );
}

// ================= Profile =================
function Profile() {
  const [profile, setProfile] = useState({});
  useEffect(() => {
    axios
      .get("http://localhost:4000/api/profile", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      })
      .then((res) => setProfile(res.data));
  }, []);
  return (
    <div>
      <h2 className="fw-bold">Profile</h2>
      <Card className="p-3 mt-3">
        <p><strong>Name:</strong> {profile.name}</p>
        <p><strong>Email:</strong> {profile.email}</p>
        <p><strong>Role:</strong> {profile.role}</p>
      </Card>
    </div>
  );
}

// ================= Student Dashboard =================
export default function StudentDashboard() {
  const navigate = useNavigate();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showToast, setShowToast] = useState(false);

  return (
    <Container fluid>
      <Row>
        {/* Sidebar for desktop */}
        <Col md={2} className="d-none d-md-block bg-dark text-white vh-100 p-3">
          <h4 className="text-center mb-4">Student Panel</h4>
          <Nav className="flex-column">
            <Nav.Link as={NavLink} to="/student/dashboard" className="nav-link-custom">🏠 Dashboard & Classes</Nav.Link>
            <Nav.Link as={NavLink} to="/student/assignments" className="nav-link-custom">📝 Assignments</Nav.Link>
            <Nav.Link as={NavLink} to="/student/grades" className="nav-link-custom">📊 Grades</Nav.Link>
            <Nav.Link as={NavLink} to="/student/announcements" className="nav-link-custom">📢 Announcements / Stream</Nav.Link>
            <Nav.Link as={NavLink} to="/student/profile" className="nav-link-custom">👤 Profile</Nav.Link>
            <Nav.Link onClick={() => setShowLogoutModal(true)} className="text-danger nav-link-custom">🚪 Logout</Nav.Link>
          </Nav>
        </Col>
        {/* Mobile navbar */}
        <Navbar bg="dark" variant="dark" expand="md" className="d-md-none">
          <Navbar.Brand className="ms-2">Student Panel</Navbar.Brand>
          <Navbar.Toggle aria-controls="mobile-nav" />
          <Navbar.Collapse id="mobile-nav">
            <Nav className="flex-column p-2">
              <Nav.Link as={Link} to="/student/dashboard" className="text-white">🏠 Dashboard & Classes</Nav.Link>
              <Nav.Link as={Link} to="/student/assignments" className="text-white">📝 Assignments</Nav.Link>
              <Nav.Link as={Link} to="/student/grades" className="text-white">📊 Grades</Nav.Link>
              <Nav.Link as={Link} to="/student/announcements" className="text-white">📢 Announcements / Stream</Nav.Link>
              <Nav.Link as={Link} to="/student/profile" className="text-white">👤 Profile</Nav.Link>
              <Nav.Link onClick={() => setShowLogoutModal(true)} className="text-danger">🚪 Logout</Nav.Link>
            </Nav>
          </Navbar.Collapse>
        </Navbar>
        {/* Main Content */}
        <Col md={10} className="p-4">
          <Routes>
            <Route path="dashboard" element={<DashboardAndClasses />} />
            <Route path="assignments" element={<Assignments />} />
            <Route path="grades" element={<Grades />} />
            <Route path="announcements" element={<Announcements />} />
            <Route path="profile" element={<Profile />} />
          </Routes>
        </Col>
      </Row>
      {/* Logout Confirmation Modal */}
      <Modal show={showLogoutModal} onHide={() => setShowLogoutModal(false)} centered>
        <Modal.Header closeButton><Modal.Title>Confirm Logout</Modal.Title></Modal.Header>
        <Modal.Body>Are you sure you want to log out?</Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowLogoutModal(false)}>Cancel</Button>
          <Button variant="danger" onClick={() => { 
            setShowLogoutModal(false); 
            setShowToast(true); 
            localStorage.removeItem("token");
            setTimeout(() => navigate("/"), 1500); 
          }}>Logout</Button>
        </Modal.Footer>
      </Modal>
      {/* Toast Notification */}
      <Toast show={showToast} onClose={() => setShowToast(false)} delay={1500} autohide bg="success" style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)", minWidth: "250px", textAlign: "center", zIndex: 9999 }}>
        <Toast.Body className="text-white fw-bold">✅ Logged out successfully!</Toast.Body>
      </Toast>
    </Container>
  );
}