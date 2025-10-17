import React, { useState, useEffect, useCallback, useRef } from "react";
import axios from "axios";
import { API_BASE_URL, getAuthToken, getUsername, checkAuth, updateExam, deleteExam } from "../api";
import { NavLink, Link, Routes, Route, useNavigate, useParams } from "react-router-dom";
import { io } from "socket.io-client";
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
  Spinner,
  Alert,
  Tabs,
  Tab,
  ListGroup,
  Badge
} from "react-bootstrap";
import { useLocation } from 'react-router-dom';

// Import components
import NotificationsDropdown from "./components/NotificationsDropdown";
import Materials from "./components/Materials";
import Comments from "./components/Comments";
import ExamCreator from "./components/ExamCreator";

// Add custom styles for responsive design and modern UI
const customStyles = `
  /* Modern Gradient Background (brand colors) */
  :root { --brand-red: #a30c0c; --brand-red-dark: #780606; --brand-gold: #ffcc00; --brand-gold-light: #ffd54a; }
  .dashboard-modern-bg {
    background: linear-gradient(135deg, var(--brand-red) 0%, var(--brand-red-dark) 100%);
    min-height: 100vh;
  }
  
  .main-content-responsive {
    margin-left: 0;
    padding: 0;
    min-height: 100vh;
  background: linear-gradient(135deg, rgba(163,12,12,0.04) 0%, rgba(120,20,20,0.04) 100%);
  }
  
  @media (min-width: 768px) {
    .main-content-responsive {
      margin-left: 16.666667%;
      padding: 20px;
    }
  }
  
  /* Glassmorphism Sidebar */
  .modern-sidebar {
    background: linear-gradient(180deg, var(--brand-red) 0%, var(--brand-red-dark) 100%) !important;
    box-shadow: 4px 0 20px rgba(0, 0, 0, 0.1);
    border-right: 1px solid rgba(255, 255, 255, 0.1);
  }
  
  .modern-sidebar h4 {
    color: white;
    text-shadow: 0 2px 10px rgba(0,0,0,0.2);
    font-weight: 700;
    padding: 20px;
    margin: 0;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }
  
  /* Mobile navbar styles */
  @media (max-width: 991px) {
    .mobile-nav-link {
      text-align: center !important;
      padding: 12px 20px !important;
      transition: all 0.3s ease;
      border-radius: 12px;
      margin: 5px 10px;
      color: white !important;
      background: rgba(255, 255, 255, 0.1);
    }
    
    .mobile-nav-link:hover {
      background-color: rgba(255, 255, 255, 0.2) !important;
      transform: translateX(5px);
      color: white !important;
    }
    
    .mobile-nav-link.active,
    .nav-link.mobile-nav-link.active {
      background-color: rgba(255, 255, 255, 0.3) !important;
      color: white !important;
      font-weight: 600;
    }
    
    .navbar-collapse {
      text-align: center;
    }
    
    .navbar-nav {
      width: 100%;
    }
    
    .modern-mobile-navbar {
      background: linear-gradient(135deg, var(--brand-red) 0%, var(--brand-red-dark) 100%) !important;
      box-shadow: 0 4px 20px rgba(0,0,0,0.1);
    }
    
    .modern-mobile-navbar .navbar-brand {
      color: white !important;
      font-weight: 700;
    }
  }
  
  .nav-link-custom {
    border-radius: 12px;
    margin: 8px 15px;
    padding: 12px 20px !important;
    transition: all 0.3s ease;
    color: rgba(255, 255, 255, 0.9) !important;
    text-decoration: none;
    font-weight: 500;
  }
  
  .nav-link-custom:hover {
    background-color: rgba(255, 255, 255, 0.15);
    color: #fff !important;
    transform: translateX(5px);
  }
  
  .nav-link-custom.active {
    background-color: rgba(255, 255, 255, 0.25);
    color: white !important;
    font-weight: 600;
    box-shadow: 0 4px 15px rgba(0,0,0,0.1);
  }
  
  /* Modern Cards */
  .modern-card {
    border-radius: 20px;
    border: none;
    box-shadow: 0 10px 30px rgba(0,0,0,0.08);
    transition: all 0.3s ease;
    background: white;
    overflow: hidden;
  }
  
  .modern-card:hover {
    transform: translateY(-5px);
    box-shadow: 0 15px 40px rgba(0,0,0,0.12);
  }
  
  .modern-card-header {
    background: linear-gradient(135deg, var(--brand-red) 0%, var(--brand-red-dark) 100%);
    color: white;
    padding: 20px 25px;
    font-weight: 700;
    font-size: 1.2rem;
    border: none;
  }
  
  .modern-card-body {
    padding: 25px;
  }
  
  /* Profile Card Enhancement */
  .profile-card-modern {
    background: linear-gradient(135deg, var(--brand-red) 0%, var(--brand-red-dark) 100%);
    border-radius: 20px;
    padding: 30px;
    color: white;
    box-shadow: 0 15px 35px rgba(102, 126, 234, 0.3);
    border: none;
  }
  
  .profile-card-modern h3 {
    font-weight: 700;
    margin-bottom: 10px;
    text-shadow: 0 2px 10px rgba(0,0,0,0.2);
  }
  
  .profile-card-modern p {
    opacity: 0.95;
    font-size: 1.1rem;
  }
  
  .profile-stats {
    display: flex;
    justify-content: space-around;
    margin-top: 25px;
    flex-wrap: wrap;
    gap: 15px;
  }
  
  .profile-stat-item {
    text-align: center;
    background: rgba(255, 255, 255, 0.15);
    backdrop-filter: blur(10px);
    padding: 15px 20px;
    border-radius: 15px;
    min-width: 120px;
  }
  
  .profile-stat-number {
    font-size: 2rem;
    font-weight: 700;
    display: block;
    margin-bottom: 5px;
  }
  
  .profile-stat-label {
    font-size: 0.9rem;
    opacity: 0.9;
    font-weight: 500;
  }
  
  /* Class Cards Modern */
  .class-card-modern {
    border-radius: 20px;
    border: none;
    overflow: hidden;
    transition: all 0.3s ease;
    box-shadow: 0 10px 25px rgba(0,0,0,0.08);
    background: white;
  }
  
  .class-card-modern:hover {
    transform: translateY(-8px);
    box-shadow: 0 15px 35px rgba(0,0,0,0.15);
    cursor: pointer;
  }
  
  .class-card-modern .card-body {
    padding: 25px;
  }
  
  /* Modern Buttons */
  .btn-modern-primary {
    background: linear-gradient(135deg, var(--brand-gold) 0%, var(--brand-gold-light) 100%);
    border: none;
    border-radius: 12px;
    padding: 12px 24px;
    font-weight: 600;
    color: var(--brand-red);
    transition: all 0.3s ease;
    box-shadow: 0 4px 15px rgba(163, 12, 12, 0.15);
  }
  
  .btn-modern-primary:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
    color: white;
  }
  
  .btn-modern-secondary {
    background: rgba(163, 12, 12, 0.06);
    border: 2px solid var(--brand-red);
    border-radius: 12px;
    padding: 12px 24px;
    font-weight: 600;
    color: var(--brand-red);
    transition: all 0.3s ease;
  }
  
  .btn-modern-secondary:hover {
    background: var(--brand-red);
    color: white;
    transform: translateY(-2px);
    box-shadow: 0 4px 15px rgba(163, 12, 12, 0.25);
  }
  
  /* Modal Modern */
  .modal-content {
    border-radius: 20px;
    border: none;
    box-shadow: 0 20px 60px rgba(0,0,0,0.3);
  }
  
  .modal-header {
    background: linear-gradient(135deg, var(--brand-red) 0%, var(--brand-red-dark) 100%);
    color: white;
    border-radius: 20px 20px 0 0 !important;
    padding: 20px 30px;
    border: none;
  }
  
  .modal-header .btn-close {
    filter: brightness(0) invert(1);
  }
  
  .modal-title {
    font-weight: 700;
    font-size: 1.5rem;
  }
  
  .modal-body {
    padding: 30px;
  }
  
  /* Form Controls Modern */
  .form-control, .form-select {
    border-radius: 12px;
    border: 2px solid #e2e8f0;
    padding: 12px 16px;
    transition: all 0.3s ease;
  }
  
  .form-control:focus, .form-select:focus {
    border-color: var(--brand-red);
    box-shadow: 0 0 0 0.2rem rgba(163, 12, 12, 0.12);
  }
  
  /* Toast Notifications */
  .toast {
    border-radius: 15px;
    box-shadow: 0 10px 30px rgba(0,0,0,0.2);
  }
  
  /* Table Modern */
  .table {
    border-radius: 15px;
    overflow: hidden;
  }
  
  .table thead {
    background: linear-gradient(135deg, var(--brand-red) 0%, var(--brand-red-dark) 100%);
    color: white;
  }
  
  .table tbody tr {
    transition: all 0.2s ease;
  }
  
  .table tbody tr:hover {
    background-color: rgba(163, 12, 12, 0.04);
    transform: scale(1.01);
  }
  
  /* Badge Modern */
  .badge {
    border-radius: 8px;
    padding: 6px 12px;
    font-weight: 600;
  }
  
  /* Fix container gaps */
  .container-fluid {
    padding: 0;
  }
  
  /* Scrollbar styling */
  ::-webkit-scrollbar {
    width: 10px;
    height: 10px;
  }
  
  ::-webkit-scrollbar-track {
    background: #f1f1f1;
    border-radius: 10px;
  }
  
  ::-webkit-scrollbar-thumb {
    background: linear-gradient(135deg, var(--brand-red) 0%, var(--brand-red-dark) 100%);
    border-radius: 10px;
  }
  
  ::-webkit-scrollbar-thumb:hover {
    background: linear-gradient(135deg, var(--brand-red-dark) 0%, var(--brand-red) 100%);
  }
  
  /* Animations */
  @keyframes fadeInUp {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  .fade-in-up {
    animation: fadeInUp 0.6s ease-out;
  }
`;

// Inject styles
if (typeof document !== 'undefined') {
  const styleElement = document.createElement('style');
  styleElement.textContent = customStyles;
  document.head.appendChild(styleElement);
}

// Enhanced retry function for API calls with exponential backoff
const retry = async (fn, retries = 3, initialDelay = 1000) => {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (err) {
      if (i === retries - 1) throw err;
      const delay = initialDelay * Math.pow(2, i); // Exponential backoff
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
};

// ================= Dashboard & Classes =================
function DashboardAndClasses() {
  const navigate = useNavigate();
  const [classes, setClasses] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createdCode, setCreatedCode] = useState("");
  const [showCreatedCodeModal, setShowCreatedCodeModal] = useState(false);
  const [classData, setClassData] = useState({ name: "", section: "", code: "", bg: "#FFF0D8", course: "", year: "", room: "" });
  const [selectedClass, setSelectedClass] = useState(null);
  const [showManageModal, setShowManageModal] = useState(false);
  const [user, setUser] = useState({ username: "" });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showToast, setShowToast] = useState(false);
  const [editingClass, setEditingClass] = useState(null);
  const [successMessage, setSuccessMessage] = useState("");
  
  // Stat card modals
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [statsModalType, setStatsModalType] = useState('');
  const [statsModalTitle, setStatsModalTitle] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${localStorage.getItem("token")}` };
      const [classesRes, userRes] = await Promise.all([
        retry(() => axios.get(`${API_BASE_URL}/api/classes?page=1&limit=100`, { headers })),
        retry(() => axios.get(`${API_BASE_URL}/api/profile`, { headers })),
      ]);
      setClasses(classesRes.data || []);
      setUser(userRes.data);
      
    } catch (err) {
      console.error("Fetch error:", err.response?.data || err.message);
      setError(err.response?.data?.error || "Failed to load classes or profile. Check network or login status.");
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

  const handleCreateClass = async () => {
    if (!classData.name || !(classData.section || classData.year)) {
      setError("Name and year/section are required");
      setShowToast(true);
      return;
    }
    try {
      const res = await retry(() =>
        axios.post(
          `${API_BASE_URL}/api/classes`,
          { 
            name: classData.name,
            section: classData.section || classData.year,
            bg: classData.bg,
            course: classData.course,
            year: classData.year,
            room: classData.room,
            teacher: user.username // backend will ignore this and use token, but keep for compatibility
          },
          { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
        )
      );
      const created = res.data.cls || res.data;
      const newCode = created.code || (created.cls && created.cls.code) || '';
      await fetchData();
      setShowCreateModal(false);
  setClassData({ name: "", section: "", code: "", bg: "#FFF0D8", course: "", year: "", room: "" });
      setCreatedCode(newCode);
      setShowCreatedCodeModal(true);
      setError("");
    } catch (err) {
      console.error("Create class error:", err.response?.data || err.message);
      setError(err.response?.data?.error || "Failed to create class. Check network or try again.");
      setShowToast(true);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-4">
        <Spinner animation="border" role="status" aria-label="Loading classes" />
        <p>Loading classes...</p>
      </div>
    );
  }

  return (
    <div className="dashboard-content">
      <h2 className="fw-bold mb-4">Dashboard & Classes</h2>
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
          <Toast.Body className="text-white">{successMessage || error}</Toast.Body>
        </Toast>
      )}
      
      <h4 className="fw-bold mb-3 d-flex justify-content-between align-items-center">
        <span>Your classes:</span>
        <Button
          size="sm"
          variant="outline-primary"
          onClick={() => setShowCreateModal(true)}
          aria-label="Create a new class"
        >
          + Create Class
        </Button>
      </h4>
      <Row>
        {classes.length === 0 && (
          <Col xs={12}>
            <Card className="p-4 text-center text-muted">
              No classes found. Create a class to get started!
            </Card>
          </Col>
        )}
        {classes.map((cls) => (
          <Col key={cls._id || cls.id} md={4} className="mb-3">
            <Card
              className="class-card-modern h-100"
              onClick={() => navigate(`/teacher/class/${encodeURIComponent(cls.name)}`)}
            >
              <Card.Body>
                <div className="d-flex align-items-center justify-content-between">
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
                <Button 
                  variant="outline-danger" 
                  size="sm" 
                  aria-label={`Delete class ${cls.name}`}
                  onClick={async (e) => {
                    e.stopPropagation();
                    if (window.confirm(`Are you sure you want to delete the class "${cls.name}"? This action cannot be undone.`)) {
                      try {
                        await retry(() => 
                          axios.delete(`${API_BASE_URL}/api/classes/${cls._id || cls.id}`, 
                          { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } })
                        );
                        await fetchData();
                        setError("Class deleted successfully!");
                        setShowToast(true);
                      } catch (err) {
                        console.error("Delete class error:", err.response?.data || err.message);
                        setError(err.response?.data?.error || "Failed to delete class. Please try again.");
                        setShowToast(true);
                      }
                    }
                  }}
                >
                  Delete
                </Button>
              </Card.Footer>
            </Card>
          </Col>
        ))}
      </Row>
      {/* Removed inline Manage Class modal; navigation goes to per-class stream */}
      <Modal
        show={showCreateModal}
        onHide={() => {
          setShowCreateModal(false);
          setClassData({ name: "", section: "", code: "", bg: "#FFF0D8", course: "", year: "" });
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
                id="floatingClassName"
                type="text"
                placeholder="Class Name"
                value={classData.name}
                onChange={(e) => setClassData({ ...classData, name: e.target.value })}
                required
                aria-required="true"
              />
              <label htmlFor="floatingClassName">Class Name</label>
            </Form.Floating>

            <Form.Floating className="mb-3" style={{ position: 'relative' }}>
              <Form.Control
                id="floatingCourse"
                type="text"
                placeholder="Course"
                value={classData.course}
                onChange={(e) => setClassData({ ...classData, course: e.target.value })}
                aria-label="Course"
              />
              <label htmlFor="floatingCourse">Course</label>
            </Form.Floating>

            <Form.Floating className="mb-3" style={{ position: 'relative' }}>
              <Form.Control
                id="floatingYear"
                type="text"
                placeholder="Year / Section"
                value={classData.year}
                onChange={(e) => setClassData({ ...classData, year: e.target.value })}
                aria-label="Year and Section"
              />
              <label htmlFor="floatingYear">Year / Section</label>
            </Form.Floating>

            <Form.Floating className="mb-3" style={{ position: 'relative' }}>
              <Form.Control
                id="floatingRoom"
                type="text"
                placeholder="Room"
                value={classData.room}
                onChange={(e) => setClassData({ ...classData, room: e.target.value })}
                aria-label="Room"
              />
              <label htmlFor="floatingRoom">Room</label>
            </Form.Floating>

            {/* Background color removed per user request */}
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => {
              setShowCreateModal(false);
              setClassData({ name: "", section: "", code: "", bg: "#FFF0D8", course: "", year: "" });
              setError("");
            }}
          >
            Cancel
          </Button>
          <Button
            className="btn-modern-primary"
            onClick={handleCreateClass}
            disabled={!classData.name || !classData.year}
            aria-label="Create class"
          >
            Create
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Created Class Code Modal */}
      <Modal show={showCreatedCodeModal} onHide={() => setShowCreatedCodeModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Class Created</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p className="mb-2">Share this class code with your students so they can join:</p>
          <h4><code>{createdCode}</code></h4>
          <div className="mt-3">
            <Button variant="primary" onClick={() => { navigator.clipboard?.writeText(createdCode); setShowCreatedCodeModal(false); setError('Class code copied to clipboard'); setShowToast(true); }}>Copy</Button>
            <Button variant="secondary" className="ms-2" onClick={() => setShowCreatedCodeModal(false)}>Close</Button>
          </div>
        </Modal.Body>
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
                  <th>Code</th>
                  <th>Students</th>
                </tr>
              </thead>
              <tbody>
                {classes.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="text-center text-muted">No classes found</td>
                  </tr>
                ) : (
                  classes.map((cls, index) => (
                    <tr key={cls._id || cls.id}>
                      <td>{index + 1}</td>
                      <td>{cls.name}</td>
                      <td>{cls.section}</td>
                      <td><code>{cls.code}</code></td>
                      <td>{cls.students?.length || 0}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </Table>
          )}

          {statsModalType === 'students' && (
            <Table striped bordered hover responsive>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Class</th>
                </tr>
              </thead>
              <tbody>
                {classes.flatMap(cls => 
                  (cls.students || []).map(student => ({ ...student, className: `${cls.name} - ${cls.section}` }))
                ).length === 0 ? (
                  <tr>
                    <td colSpan="4" className="text-center text-muted">No students found</td>
                  </tr>
                ) : (
                  classes.flatMap(cls => 
                    (cls.students || []).map((student, idx) => ({
                      ...student,
                      className: `${cls.name} - ${cls.section}`,
                      globalIndex: idx
                    }))
                  ).map((student, index) => (
                    <tr key={student._id || `${student.username}-${index}`}>
                      <td>{index + 1}</td>
                      <td>{student.name || student.username}</td>
                      <td>{student.email || 'N/A'}</td>
                      <td>{student.className}</td>
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
                  <th>Time Limit</th>
                  <th>Questions</th>
                  <th>Submissions</th>
                </tr>
              </thead>
              <tbody>
                {classes.flatMap(cls => 
                  (cls.exams || []).map(exam => ({ 
                    ...exam, 
                    className: `${cls.name} - ${cls.section}`,
                    totalStudents: cls.students?.length || 0
                  }))
                ).length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center text-muted">No exams found</td>
                  </tr>
                ) : (
                  classes.flatMap(cls => 
                    (cls.exams || []).map(exam => ({
                      ...exam,
                      className: `${cls.name} - ${cls.section}`,
                      totalStudents: cls.students?.length || 0,
                      submittedCount: exam.submissions?.length || 0
                    }))
                  ).map((exam, index) => (
                    <tr key={exam._id || `exam-${index}`}>
                      <td>{index + 1}</td>
                      <td>{exam.title}</td>
                      <td>{exam.className}</td>
                      <td>{exam.timeLimit} min</td>
                      <td>{exam.questions?.length || 0}</td>
                      <td>
                        <span className={exam.submittedCount < exam.totalStudents ? 'text-warning' : 'text-success'}>
                          {exam.submittedCount} / {exam.totalStudents}
                        </span>
                      </td>
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

  // ================= Teacher Class Stream (per class) =================
function TeacherClassStream() {
  const { name } = useParams();
  const className = decodeURIComponent(name || "");
  console.log('TeacherClassStream initialized with className:', className);
  const [announcements, setAnnouncements] = useState([]);
  const [message, setMessage] = useState("");
  const [showMaterialsModal, setShowMaterialsModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [showToast, setShowToast] = useState(false);
  const [showExamModal, setShowExamModal] = useState(false);
  const [showViewExamModal, setShowViewExamModal] = useState(false);
  const [showEditExamModal, setShowEditExamModal] = useState(false);
  const [showDeleteExamModal, setShowDeleteExamModal] = useState(false);
  const [showSubmissionsModal, setShowSubmissionsModal] = useState(false);
  const [examSubmissions, setExamSubmissions] = useState([]);
  const [selectedExam, setSelectedExam] = useState(null);
  const [deletingExam, setDeletingExam] = useState(false);
  const [examData, setExamData] = useState({ 
    title: "", 
    description: "", 
    due: "",
    questions: [{ text: "", type: "short", options: [], correctAnswer: "" }] 
  });
  const [activeTab, setActiveTab] = useState("stream");
  const [classInfo, setClassInfo] = useState(null);
  const [students, setStudents] = useState([]);
  const [exams, setExams] = useState([]);
  // Invite modal removed: invite functionality deprecated
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [studentToRemove, setStudentToRemove] = useState(null);
  
  // File upload state
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  
  // Reference to socket.io connection
  const socketRef = useRef(null);  // Fetch class announcements
  const fetchAnnouncements = useCallback(async () => {
    setLoading(true);
    try {
      const res = await retry(() =>
        axios.get(`${API_BASE_URL}/api/announcements?page=1&limit=100&className=${encodeURIComponent(className)}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        })
      );
      setAnnouncements(res.data || []);
      console.log("Fetched announcements:", res.data);
    } catch (err) {
      console.error("Fetch announcements error:", err.response?.data || err.message);
      setError(err.response?.data?.error || "Failed to load class stream.");
      setShowToast(true);
    } finally {
      setLoading(false);
    }
  }, [className]);

  const handleMaterialCreated = useCallback(async (material) => {
    try {
      console.debug('handleMaterialCreated received material:', material);
      // Transform material into an announcement-like object to show in stream
      const safeTitle = material && (material.title || material.name || material.originalName || 'Untitled Material');
      const safeDescription = material && (material.description || material.summary || '');

      const newAnnouncement = {
        teacher: getUsername() || 'You',
        class: className,
        date: (material && (material.createdAt || material.date)) || new Date().toISOString(),
        message: `New material: ${safeTitle} ${safeDescription ? '- ' + safeDescription : ''}`,
        attachments: material && material.type === 'file' ? [{ originalName: safeTitle, filePath: material.content, fileSize: material.fileSize || 0 }] : [],
        materialRef: material || null,
      };

      // Post to backend so students see it
      await axios.post(`${API_BASE_URL}/api/announcements`, newAnnouncement, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });

      // Refresh announcements from backend
      await fetchAnnouncements();
      setShowMaterialsModal(false);
      setShowToast(true);
      setSuccessMessage('Material posted to stream.');
    } catch (err) {
      console.error('handleMaterialCreated error', err);
    }
  }, [className, fetchAnnouncements]);
  
  // Fetch class exams
  const fetchExams = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      console.log("Fetching exams for class:", className);
      
      const url = `${API_BASE_URL}/api/exams?className=${encodeURIComponent(className)}`;
      console.log("API URL:", url);
      
      const res = await axios.get(url, {
        headers: { Authorization: `Bearer ${getAuthToken()}` },
      });
      
      if (Array.isArray(res.data)) {
        setExams(res.data);
        console.log(`Successfully loaded ${res.data.length} exams for class ${className}`);
      } else {
        console.error("Invalid response format - expected array:", res.data);
        setExams([]);
        setError("Received invalid data format from server.");
      }
    } catch (err) {
      console.error("Fetch exams error:", err.response?.data || err.message);
      setExams([]);
      
      if (err.response?.status === 401) {
        setError("Your session has expired. Please log in again.");
      } else if (err.response?.status === 404) {
        setError("Could not find exams for this class.");
      } else if (err.response?.data?.error) {
        setError(`Error: ${err.response.data.error}`);
      } else {
        setError(`Failed to load exams: ${err.message}`);
      }
    } finally {
      setLoading(false);
    }
  }, [className]);

  // Fetch exam submissions for a specific exam
  const fetchExamSubmissions = async (examId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE_URL}/api/exam-submissions/exam/${examId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setExamSubmissions(response.data);
    } catch (error) {
      console.error("Failed to fetch exam submissions:", error);
      setError("Failed to load exam submissions");
    }
  };

  // Fetch class information
  const fetchClassInfo = useCallback(async () => {
    try {
      console.log('Fetching class info for:', className);
      const res = await retry(() =>
        axios.get(`${API_BASE_URL}/api/classes?page=1&limit=100`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        })
      );
      
      console.log('Classes API response:', res.data);
      
      if (!Array.isArray(res.data)) {
        console.error('Invalid API response format - expected an array:', res.data);
        setError('Invalid data format received from server.');
        return;
      }
      
      // Debug logging for class matching
      res.data.forEach(c => {
        console.log(`Comparing class '${c.name}' with '${className}': ${c.name === className}`);
      });
      
      const classData = res.data.find(c => c.name === className);
      
      if (classData) {
        console.log('Found class data:', classData);
        setClassInfo(classData);
      } else {
        console.log('Class not found in list, trying direct endpoint...');
        // Try to get the class directly by name
        try {
          const directRes = await axios.get(
            `${API_BASE_URL}/api/classes/${encodeURIComponent(className)}`, 
            { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
          );
          
          if (directRes.data) {
            console.log('Found class via direct API call:', directRes.data);
            setClassInfo(directRes.data);
          } else {
            console.error('Class not found via direct endpoint either');
            setError(`Class "${className}" not found.`);
          }
        } catch (directErr) {
          console.error('Error fetching class directly:', directErr);
          setError(`Could not load class "${className}".`);
        }
      }
      
      // Always fetch student information for this class (moved outside the if-else block)
      try {
        const studentsRes = await retry(() =>
          axios.get(`${API_BASE_URL}/api/classes/${encodeURIComponent(className)}/students`, {
            headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
          })
        );
        
        console.log("Fetched students:", studentsRes.data);
        setStudents(studentsRes.data);
      } catch (err) {
        console.error("Fetch students error:", err.response?.data || err.message);
        // If students fetch fails, set empty array
        setStudents([]);
      }
    } catch (err) {
      console.error("Fetch class info error:", err.response?.data || err.message);
    }
  }, [className]);

  // Show remove confirmation modal
  const showRemoveConfirmation = (student) => {
    setStudentToRemove(student);
    setShowRemoveModal(true);
  };

  // Remove student from class
  const handleRemoveStudent = async () => {
    try {
      if (!classInfo?._id || !studentToRemove) {
        setError("Class information not available");
        setShowToast(true);
        return;
      }

      const studentUsername = studentToRemove.username;

      const response = await axios.delete(
        `${API_BASE_URL}/api/remove-student/${classInfo._id}/${studentUsername}`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
        }
      );

      if (response.data) {
        // Update local students state
        setStudents(prevStudents => 
          prevStudents.filter(student => student.username !== studentUsername)
        );
        
        // Update class info if needed
        setClassInfo(prevClassInfo => ({
          ...prevClassInfo,
          students: prevClassInfo.students.filter(username => username !== studentUsername)
        }));

        setSuccessMessage(`Successfully removed ${studentUsername} from the class`);
        setError("");
        setShowToast(true);
        setShowRemoveModal(false);
        setStudentToRemove(null);
      }
    } catch (err) {
      console.error("Remove student error:", err);
      setError(err.response?.data?.error || "Failed to remove student");
      setShowToast(true);
      setShowRemoveModal(false);
      setStudentToRemove(null);
    }
  };

  useEffect(() => {
    let cancelled = false;
    if (!cancelled) {
      fetchAnnouncements();
      fetchExams();
      fetchClassInfo();
      
      // Setup Socket.IO connection for real-time updates
      const token = getAuthToken();
      
      // Cleanup any existing connection first
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      
      if (token) {
        try {
          console.log('Connecting to socket server at:', API_BASE_URL);
          // Connect to socket server with explicit options
          const socket = io(API_BASE_URL, {
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
            timeout: 10000,
            transports: ['websocket', 'polling']
          });
          
          socketRef.current = socket;
          
          socket.on('connect_error', (err) => {
            console.error('Socket connection error:', err.message);
          });
          
          socket.on('connect', () => {
            console.log('Socket connected successfully');
            // Authenticate and join class room for class-specific events
            socket.emit('authenticate', token);
            socket.emit('join-class', className);
            console.log('Joined class room:', className);
          });
          
          // Listen for exam updates
          socket.on('exam-created', (newExam) => {
            if (!cancelled && newExam && newExam.class === className) {
              console.log('Received new exam:', newExam);
              setExams(prev => [newExam, ...prev]);
            }
          });
          
          // Listen for exam updates
          socket.on('exam-updated', (updatedExam) => {
            if (!cancelled && updatedExam && updatedExam.class === className) {
              console.log('Received exam update:', updatedExam);
              setExams(prev => prev.map(exam => 
                exam._id === updatedExam._id ? updatedExam : exam
              ));
            }
          });
          
          // Listen for exam deletions
          socket.on('exam-deleted', (data) => {
            if (!cancelled && data && data.examId) {
              console.log('Received exam deletion:', data);
              setExams(prev => prev.filter(exam => exam._id !== data.examId));
              
              // Show notification
              setSuccessMessage(data.message || 'An assignment was deleted');
              setShowToast(true);
            }
          });
          
          // Listen for announcement updates
          socket.on('announcement-created', (newAnnouncement) => {
            if (!cancelled && newAnnouncement && newAnnouncement.class === className) {
              console.log('Received new announcement:', newAnnouncement);
              setAnnouncements(prev => [newAnnouncement, ...prev]);
            }
          });
        } catch (err) {
          console.error('Error initializing socket connection:', err);
        }
      }
    }
    
    return () => {
      cancelled = true;
      // Cleanup socket connection
      if (socketRef.current) {
        // Unsubscribe from all events to prevent memory leaks
        socketRef.current.off('announcement-created');
        socketRef.current.off('exam-created');
        socketRef.current.off('exam-updated');
        socketRef.current.off('exam-deleted');
        
        // Leave the class room before disconnecting
        socketRef.current.emit('leave-class', className);
        socketRef.current.disconnect();
        socketRef.current = null;
        console.log('Socket connection closed and events unsubscribed');
      }
    };
  }, [fetchAnnouncements, fetchExams, fetchClassInfo, className, API_BASE_URL]);

  
  // File handling functions
  const handleFileSelect = (event) => {
    const files = Array.from(event.target.files);
    setSelectedFiles(files);
  };

  const removeFile = (index) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const uploadFiles = async (files) => {
    if (!files.length) return [];
    
    setUploading(true);
    try {
      const uploadedFiles = [];
      
      for (const file of files) {
        const formData = new FormData();
        formData.append('file', file);
        
        const response = await axios.post(
          `${API_BASE_URL}/api/upload?type=material`,
          formData,
          {
            headers: {
              'Content-Type': 'multipart/form-data',
              Authorization: `Bearer ${localStorage.getItem("token")}`
            }
          }
        );
        
        uploadedFiles.push({
          filename: response.data.file.filename,
          originalName: response.data.file.originalname,
          filePath: response.data.filePath,
          fileSize: response.data.file.size,
          mimeType: response.data.file.mimetype
        });
      }
      
      return uploadedFiles;
    } catch (err) {
      console.error("File upload error:", err);
      throw new Error("Failed to upload files");
    } finally {
      setUploading(false);
    }
  };

  // Post an announcement
  const handlePost = async () => {
    if (!message.trim() && selectedFiles.length === 0) return;
    setPosting(true);
    try {
      let attachments = [];
      
      // Upload files if any are selected
      if (selectedFiles.length > 0) {
        attachments = await uploadFiles(selectedFiles);
      }
      
      await retry(() =>
        axios.post(
          `${API_BASE_URL}/api/announcements`,
          { 
            message: message.trim() || "Shared files", 
            date: new Date().toISOString(), 
            teacher: localStorage.getItem("username"), 
            class: className,
            attachments: attachments
          },
          { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
        )
      );
      
      setMessage("");
      setSelectedFiles([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      await fetchAnnouncements();
    } catch (err) {
      console.error("Post announcement error:", err.response?.data || err.message);
      setError(err.response?.data?.error || "Failed to post.");
      setShowToast(true);
    } finally {
      setPosting(false);
    }
  };

  // Exam creation functions
  const handleAddQuestion = () => {
    setExamData({
      ...examData,
      questions: [...examData.questions, { text: "", type: "short", options: [], correctAnswer: "" }],
    });
  };

  const handleQuestionChange = (index, field, value) => {
    const newQuestions = [...examData.questions];
    newQuestions[index] = { ...newQuestions[index], [field]: value };
    setExamData({ ...examData, questions: newQuestions });
  };

  const handleCreateExam = async () => {
    if (!examData.title || examData.questions.some((q) => !q.text)) {
      setError("Title and question text are required");
      setShowToast(true);
      return;
    }
    
    setPosting(true);
    try {
      console.log("Creating exam with data:", { ...examData, class: className });
      
      const createRes = await retry(() =>
        axios.post(
          `${API_BASE_URL}/api/exams`,
          { ...examData, class: className, createdBy: localStorage.getItem("username") },
          { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
        )
      );
      
      console.log("Exam creation response:", createRes.data);
      const createdExam = createRes.data?.exam;
      
      if (!createdExam || !createdExam._id) {
        console.error("Created exam has no ID:", createRes.data);
        throw new Error("Failed to get exam ID from response");
      }
      
      // Announce the new exam to the stream with examId
      const announcementData = { 
        message: `New exam posted: ${examData.title}`, 
        date: new Date().toISOString(), 
        teacher: localStorage.getItem("username"), 
        class: className, 
        examId: createdExam._id 
      };
      
      console.log("Creating announcement with data:", announcementData);
      
      const announceRes = await retry(() =>
        axios.post(
          `${API_BASE_URL}/api/announcements`,
          announcementData,
          { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
        )
      );
      
      console.log("Announcement creation response:", announceRes.data);
      
      setShowExamModal(false);
      setExamData({ title: "", description: "", due: "", questions: [{ text: "", type: "short", options: [], correctAnswer: "" }] });
      
      // Refresh both announcements and exams to show the new exam
      await Promise.all([
        fetchAnnouncements(),
        fetchExams()
      ]);
      
      // If we're not on the classwork tab, switch to it to show the new exam
      if (activeTab !== "classwork") {
        setActiveTab("classwork");
      }
      
      // Show success message
      setSuccessMessage("Exam created successfully!");
      setShowToast(true);
    } catch (err) {
      console.error("Create exam error:", err.response?.data || err.message);
      setError(err.response?.data?.error || "Failed to create exam.");
      setShowToast(true);
    } finally {
      setPosting(false);
    }
  };

  // Debug information to trace loading state
  console.log('Teacher Dashboard Status:', {
    loading,
    className,
    classInfoExists: !!classInfo,
    announcementsCount: announcements.length,
    examsCount: exams.length,
    activeTab
  });
  
  if (loading && !classInfo) {
    return (
      <div className="text-center py-4">
        <Spinner animation="border" role="status" aria-label="Loading class" />
        <p>Loading class information...</p>
      </div>
    );
  }
  
  if (!classInfo) {
    console.error('Class information not loaded:', { className });
    return (
      <div className="text-center py-4">
        <Alert variant="danger">
          <h4>Error Loading Class</h4>
          <p>Could not load information for class: {className}</p>
          <Button variant="outline-primary" onClick={fetchClassInfo}>Retry</Button>
        </Alert>
      </div>
    );
  }

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2 className="fw-bold">{className}</h2>
        {/* removed class code display per user request */}
      </div>

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
          <Toast.Body className="text-white">{successMessage || error}</Toast.Body>
        </Toast>
      )}

      <Nav variant="tabs" className="mb-3">
        <Nav.Item>
          <Nav.Link 
            active={activeTab === "stream"} 
            onClick={() => setActiveTab("stream")}
          >
            Stream
          </Nav.Link>
        </Nav.Item>
        <Nav.Item>
          <Nav.Link 
            active={activeTab === "classwork"} 
            onClick={() => {
              setActiveTab("classwork");
              fetchExams(); // Refresh exams when switching to this tab
            }}
          >
            Classwork
          </Nav.Link>
        </Nav.Item>
        <Nav.Item>
          <Nav.Link 
            active={activeTab === "people"} 
            onClick={() => setActiveTab("people")}
          >
            People
          </Nav.Link>
        </Nav.Item>
        <Nav.Item>
          <Nav.Link 
            active={activeTab === "materials"} 
            onClick={() => setActiveTab("materials")}
          >
            Materials
          </Nav.Link>
        </Nav.Item>
      </Nav>

      {activeTab === "stream" && (
        <div>
          <Card className="p-3 mb-3">
            <Form>
              <Form.Group className="mb-2">
                <Form.Label className="fw-bold">Share something with your class</Form.Label>
                <Form.Control as="textarea" rows={3} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Announce something to your class" />
              </Form.Group>
              
              {/* File upload section */}
              <Form.Group className="mb-2">
                <Form.Label className="fw-bold">Attach files (optional)</Form.Label>
                <Form.Control 
                  type="file" 
                  multiple 
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.zip,.rar,.jpg,.jpeg,.png,.mp4,.mov,.mp3,.wav"
                />
                {selectedFiles.length > 0 && (
                  <div className="mt-2">
                    <small className="text-muted">Selected files:</small>
                    {selectedFiles.map((file, index) => (
                      <div key={index} className="d-flex align-items-center justify-content-between bg-light p-2 rounded mt-1">
                        <span className="small">{file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
                        <Button 
                          variant="outline-danger" 
                          size="sm" 
                          onClick={() => removeFile(index)}
                        >
                          ×
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </Form.Group>
              
              <div className="d-flex gap-2 align-items-center">
                <Button onClick={handlePost} disabled={(!message.trim() && selectedFiles.length === 0) || posting || uploading}>
                  {posting ? "Posting..." : uploading ? "Uploading..." : "Post"}
                </Button>
                <Button variant="outline-primary" onClick={() => setShowExamModal(true)} aria-label="Create exam for this class">
                  + Create Exam
                </Button>
                <Button type="button" variant="outline-secondary" onClick={() => { console.log('Stream Add Material clicked'); setShowMaterialsModal(true); }} aria-label="Add material for this class">
                  + Add Material
                </Button>
              </div>
            </Form>
          </Card>

          {announcements.length === 0 ? (
            <Card className="p-4 text-center text-muted">No posts yet. Start the conversation!</Card>
          ) : (
            announcements.map((a) => (
              <Card key={a._id || a.id} className="mb-3">
                <Card.Body>
                  <div className="d-flex justify-content-between align-items-start">
                    <div>
                      <div className="fw-bold">{a.teacher}</div>
                      <div className="text-muted" style={{ fontSize: 12 }}>{new Date(a.date).toLocaleString()}</div>
                    </div>
                    <div className="d-flex gap-2">
                      <Button
                        variant="outline-danger"
                        size="sm"
                        onClick={async () => {
                          try {
                            await retry(() => axios.delete(`${API_BASE_URL}/api/announcements/${a._id || a.id}`, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }));
                            await fetchAnnouncements();
                          } catch (err) {
                            console.error("Delete announcement error:", err.response?.data || err.message);
                            setError(err.response?.data?.error || "Failed to delete post.");
                            setShowToast(true);
                          }
                        }}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                  <div className="mt-2" style={{ whiteSpace: "pre-wrap" }}>{a.message}</div>
                  
                  {/* Display file attachments */}
                  {a.attachments && a.attachments.length > 0 && (
                    <div className="mt-3">
                      <div className="fw-bold mb-2">Attachments:</div>
                      {a.attachments.map((attachment, index) => (
                        <div key={index} className="d-flex align-items-center justify-content-between bg-light p-2 rounded mb-1">
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
                  {a.materialRef && (
                    <div className="mt-3">
                      <div className="fw-bold mb-2">Material:</div>
                      <Card className="mb-2">
                        <Card.Body>
                          <h6 className="text-center">{a.materialRef.title}</h6>
                          {a.materialRef.description && (
                            <p className="text-muted small text-center">{a.materialRef.description}</p>
                          )}
                          {a.materialRef.type === 'file' && a.materialRef.content && (
                            <div className="d-flex gap-2">
                              <Button
                                variant="outline-primary"
                                size="sm"
                                className="flex-grow-1"
                                onClick={() => window.open(
                                  a.materialRef.content.startsWith('http') ? a.materialRef.content : `${API_BASE_URL}/${a.materialRef.content}`,
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
                                href={a.materialRef.content.startsWith('http') ? a.materialRef.content : `${API_BASE_URL}/${a.materialRef.content}`}
                                target="_blank"
                                download
                              >
                                Download
                              </Button>
                            </div>
                          )}
                          {(a.materialRef.type === 'video' || a.materialRef.type === 'link') && a.materialRef.content && (
                            <Button
                              variant="outline-primary"
                              size="sm"
                              className="w-100"
                              as="a"
                              href={a.materialRef.content}
                              target="_blank"
                            >
                              Open
                            </Button>
                          )}
                        </Card.Body>
                      </Card>
                    </div>
                  )}
                  
                  {/* Add comments section to announcements */}
                  <Comments 
                    referenceType="announcement"
                    referenceId={a._id || a.id}
                    className={className}
                  />
                </Card.Body>
              </Card>
            ))
          )}
        </div>
      )}

      {activeTab === "classwork" && (
        <div className="p-3 border rounded bg-white">
          <h3>Classwork</h3>
          
          {/* Uploaded Files Section */}
          <div className="mb-4">
            <h5 className="mb-3">📎 Uploaded Files</h5>
            {announcements.filter(a => a.attachments && a.attachments.length > 0).length === 0 ? (
              <Card className="text-center p-4">
                <p className="text-muted">No files uploaded yet. Upload files in the Stream tab to see them here.</p>
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
          
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h5 className="mb-0">Exams</h5>
          </div>
          
          {loading ? (
            <div className="text-center p-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
              <p className="mt-2">Loading exams...</p>
            </div>
          ) : (
            <div className="mb-4">
              {exams && exams.length > 0 ? (
                <Card>
                  <Card.Header>
                    <h6 className="mb-0 py-2">Active Exams</h6>
                  </Card.Header>
                  <Card.Body>
                    <ListGroup>
                      {exams.map(exam => (
                        <ListGroup.Item 
                          key={exam._id || `exam-${Math.random()}`}
                          className="d-flex justify-content-between align-items-center"
                        >
                          <div>
                            <h6 className="mb-1">{exam.title || "Untitled Exam"}</h6>
                            <small className="text-muted">
                              {exam.createdBy && `Posted by ${exam.createdBy}`} 
                              {exam.description && ` • ${exam.description}`}
                              {exam.createdAt && ` • Created: ${new Date(exam.createdAt).toLocaleDateString()}`}
                                {exam.due && ` • Due: ${new Date(exam.due).toLocaleString()}`}
                            </small>
                          </div>
                          <div>
                            <Button 
                              variant="outline-info" 
                              size="sm" 
                              className="me-2"
                              onClick={async () => {
                                setSelectedExam(exam);
                                await fetchExamSubmissions(exam._id);
                                setShowSubmissionsModal(true);
                              }}
                              title="View student submissions"
                            >
                              <i className="bi bi-file-text me-1"></i> Submissions
                            </Button>
                            <Button 
                              variant="outline-primary" 
                              size="sm" 
                              className="me-2"
                              onClick={() => {
                                // View exam details
                                console.log("View exam:", exam);
                                setSelectedExam(exam);
                                setShowViewExamModal(true);
                              }}
                              title="View exam details"
                            >
                              <i className="bi bi-eye me-1"></i> View
                            </Button>
                            <Button 
                              variant="outline-secondary" 
                              size="sm"
                              className="me-2"
                              onClick={() => {
                                // Edit exam 
                                console.log("Edit exam:", exam);
                                setSelectedExam(exam);
                                setExamData({
                                  title: exam.title || "",
                                  description: exam.description || "",
                                  questions: exam.questions || [{ text: "", type: "short", options: [], correctAnswer: "" }]
                                });
                                setShowEditExamModal(true);
                              }}
                              title="Edit this exam"
                            >
                              <i className="bi bi-pencil-square me-1"></i> Edit
                            </Button>
                            <Button 
                              variant="outline-danger" 
                              size="sm"
                              onClick={() => {
                                // Delete exam 
                                console.log("Delete exam:", exam);
                                setSelectedExam(exam);
                                setShowDeleteExamModal(true);
                              }}
                              title="Delete this exam"
                            >
                              <i className="bi bi-trash me-1"></i> Delete
                            </Button>
                          </div>
                        </ListGroup.Item>
                      ))}
                    </ListGroup>
                  </Card.Body>
                </Card>
              ) : (
                <Alert variant="info" className="text-center">
                  <p className="mb-0">No exams created yet for this class.</p>
                  <p className="mb-0">Click "Create Exam" to add your first exam.</p>
                </Alert>
              )}
            </div>
          )}
          
          {/* Exam Creation Modal */}
          <Modal show={showExamModal} onHide={() => setShowExamModal(false)} size="lg">
            <Modal.Header closeButton>
              <Modal.Title>Create New Exam</Modal.Title>
            </Modal.Header>
            <Modal.Body>
              <ExamCreator 
                className={className} 
                onExamCreated={(newExam) => {
                  console.log("New exam created:", newExam);
                  setShowExamModal(false);
                  fetchExams(); // Refresh exams list
                  setError(""); // Clear any errors
                }} 
              />
            </Modal.Body>
          </Modal>
          
          {/* View Exam Modal */}
          <Modal show={showViewExamModal} onHide={() => setShowViewExamModal(false)} size="lg">
            <Modal.Header closeButton>
              <Modal.Title>{selectedExam?.title || "Exam Details"}</Modal.Title>
            </Modal.Header>
            <Modal.Body>
              {selectedExam ? (
                <div>
                  <h5>{selectedExam.title}</h5>
                  {selectedExam.description && (
                    <p className="text-muted">{selectedExam.description}</p>
                  )}
                  
                  <div className="mt-3">
                    <h6>Questions:</h6>
                    {selectedExam.questions && selectedExam.questions.map((question, index) => (
                      <Card key={index} className="mb-3">
                        <Card.Body>
                          <Card.Title>Question {index + 1}</Card.Title>
                          <Card.Text>{question.text}</Card.Text>
                          
                          {question.type === "multiple" && question.options && (
                            <div className="mt-2">
                              <p><strong>Options:</strong></p>
                              <ListGroup>
                                {question.options.map((option, optIndex) => (
                                  <ListGroup.Item key={optIndex} className={
                                    option === question.correctAnswer ? "list-group-item-success" : ""
                                  }>
                                    {option} {option === question.correctAnswer && 
                                      <Badge bg="success" className="ms-2">Correct</Badge>
                                    }
                                  </ListGroup.Item>
                                ))}
                              </ListGroup>
                            </div>
                          )}
                          
                          {question.type === "short" && (
                            <div className="mt-2">
                              <p><strong>Answer Type:</strong> Short Answer</p>
                              {question.correctAnswer && (
                                <p><strong>Correct Answer:</strong> {question.correctAnswer}</p>
                              )}
                            </div>
                          )}
                        </Card.Body>
                      </Card>
                    ))}
                  </div>
                  
                  <div className="mt-3">
                    <p><strong>Created By:</strong> {selectedExam.createdBy}</p>
                    {selectedExam.createdAt && (
                      <p><strong>Created On:</strong> {new Date(selectedExam.createdAt).toLocaleString()}</p>
                    )}
                  </div>
                </div>
              ) : (
                <Alert variant="warning">No exam details available</Alert>
              )}
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onClick={() => setShowViewExamModal(false)}>
                Close
              </Button>
              <Button 
                variant="danger" 
                className="me-2"
                onClick={() => {
                  setShowViewExamModal(false);
                  setShowDeleteExamModal(true);
                }}
              >
                <i className="bi bi-trash me-1"></i> Delete
              </Button>
              <Button 
                variant="primary" 
                onClick={() => {
                  setShowViewExamModal(false);
                  setSelectedExam(selectedExam);
                  setExamData({
                    title: selectedExam?.title || "",
                    description: selectedExam?.description || "",
                    questions: selectedExam?.questions || [{ text: "", type: "short", options: [], correctAnswer: "" }]
                  });
                  setShowEditExamModal(true);
                }}
              >
                <i className="bi bi-pencil-square me-1"></i> Edit
              </Button>
            </Modal.Footer>
          </Modal>
          
          {/* Edit Exam Modal */}
          <Modal show={showEditExamModal} onHide={() => setShowEditExamModal(false)} size="lg">
            <Modal.Header closeButton>
              <Modal.Title>Edit Exam</Modal.Title>
            </Modal.Header>
            <Modal.Body>
              {selectedExam ? (
                <Form>
                  <Form.Group className="mb-3">
                    <Form.Label>Title</Form.Label>
                    <Form.Control 
                      type="text" 
                      value={examData.title} 
                      onChange={(e) => setExamData({...examData, title: e.target.value})}
                    />
                  </Form.Group>
                  
                  <Form.Group className="mb-3">
                    <Form.Label>Description</Form.Label>
                    <Form.Control 
                      as="textarea" 
                      rows={3} 
                      value={examData.description} 
                      onChange={(e) => setExamData({...examData, description: e.target.value})}
                    />
                  </Form.Group>
                  
                  <h5 className="mt-4">Questions</h5>
                  {examData.questions.map((question, index) => (
                    <Card key={index} className="mb-3">
                      <Card.Body>
                        <div className="d-flex justify-content-between">
                          <h6>Question {index + 1}</h6>
                          <Button 
                            variant="outline-danger" 
                            size="sm"
                            onClick={() => {
                              const updatedQuestions = [...examData.questions];
                              updatedQuestions.splice(index, 1);
                              setExamData({...examData, questions: updatedQuestions});
                            }}
                            disabled={examData.questions.length === 1}
                          >
                            Remove
                          </Button>
                        </div>
                        
                        <Form.Group className="mb-3">
                          <Form.Label>Question Text</Form.Label>
                          <Form.Control 
                            as="textarea" 
                            value={question.text} 
                            onChange={(e) => {
                              const updatedQuestions = [...examData.questions];
                              updatedQuestions[index] = {...question, text: e.target.value};
                              setExamData({...examData, questions: updatedQuestions});
                            }}
                          />
                        </Form.Group>
                        
                        <Form.Group className="mb-3">
                          <Form.Label>Question Type</Form.Label>
                          <Form.Select 
                            value={question.type} 
                            onChange={(e) => {
                              const updatedQuestions = [...examData.questions];
                              updatedQuestions[index] = {...question, type: e.target.value};
                              setExamData({...examData, questions: updatedQuestions});
                            }}
                          >
                            <option value="short">Short Answer</option>
                            <option value="multiple">Multiple Choice</option>
                          </Form.Select>
                        </Form.Group>
                        
                        {question.type === "multiple" && (
                          <div>
                            <Form.Group className="mb-3">
                              <Form.Label>Options (one per line)</Form.Label>
                              <Form.Control 
                                as="textarea" 
                                rows={4}
                                value={(question.options || []).join('\n')} 
                                onChange={(e) => {
                                  const options = e.target.value.split('\n').filter(opt => opt.trim());
                                  const updatedQuestions = [...examData.questions];
                                  updatedQuestions[index] = {...question, options};
                                  setExamData({...examData, questions: updatedQuestions});
                                }}
                              />
                            </Form.Group>
                            
                            <Form.Group className="mb-3">
                              <Form.Label>Correct Answer</Form.Label>
                              <Form.Select 
                                value={question.correctAnswer || ""}
                                onChange={(e) => {
                                  const updatedQuestions = [...examData.questions];
                                  updatedQuestions[index] = {...question, correctAnswer: e.target.value};
                                  setExamData({...examData, questions: updatedQuestions});
                                }}
                              >
                                <option value="">Select correct answer</option>
                                {(question.options || []).map((option, optIndex) => (
                                  <option key={optIndex} value={option}>{option}</option>
                                ))}
                              </Form.Select>
                            </Form.Group>
                          </div>
                        )}
                        
                        {question.type === "short" && (
                          <Form.Group className="mb-3">
                            <Form.Label>Correct Answer (optional)</Form.Label>
                            <Form.Control 
                              type="text" 
                              value={question.correctAnswer || ""} 
                              onChange={(e) => {
                                const updatedQuestions = [...examData.questions];
                                updatedQuestions[index] = {...question, correctAnswer: e.target.value};
                                setExamData({...examData, questions: updatedQuestions});
                              }}
                              placeholder="Correct answer for grading reference"
                            />
                          </Form.Group>
                        )}
                      </Card.Body>
                    </Card>
                  ))}
                  
                  <div className="text-center mt-3 mb-3">
                    <Button 
                      variant="outline-primary"
                      onClick={() => {
                        setExamData({
                          ...examData,
                          questions: [
                            ...examData.questions,
                            { text: "", type: "short", options: [], correctAnswer: "" }
                          ]
                        });
                      }}
                    >
                      Add Question
                    </Button>
                  </div>
                </Form>
              ) : (
                <Alert variant="warning">No exam selected for editing</Alert>
              )}
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onClick={() => setShowEditExamModal(false)}>
                Cancel
              </Button>
              <Button 
                variant="primary" 
                onClick={async () => {
                  try {
                    setPosting(true);
                    
                    // Ensure we have the required data
                    if (!examData.title) {
                      setError("Exam title is required");
                      setShowToast(true);
                      setPosting(false);
                      return;
                    }
                    
                    // Validate questions
                    if (!examData.questions || examData.questions.length === 0) {
                      setError("At least one question is required");
                      setShowToast(true);
                      setPosting(false);
                      return;
                    }
                    
                    // Check each question for required fields
                    const invalidQuestion = examData.questions.findIndex(q => 
                      !q.text || 
                      (q.type === "multiple" && (!q.options || q.options.length < 2))
                    );
                    
                    if (invalidQuestion !== -1) {
                      setError(`Question #${invalidQuestion + 1} is invalid. Ensure it has text and at least 2 options for multiple choice.`);
                      setShowToast(true);
                      setPosting(false);
                      return;
                    }
                    
                    // Prepare data for API call
                    const updateData = {
                      ...examData,
                      class: className, // Ensure class field is set correctly
                      className: className // Include both formats for compatibility
                    };
                    
                    // Make API call to update the exam using the helper function
                    const response = await updateExam(selectedExam._id, updateData);
                    
                    console.log("Updated exam:", response.data);
                    
                    // Close modal and refresh data
                    setShowEditExamModal(false);
                    setSelectedExam(null);
                    fetchExams(); // Refresh exams list
                    
                    // Show success message
                    setSuccessMessage("Exam updated successfully");
                    setShowToast(true);
                  } catch (err) {
                    console.error("Error updating exam:", err.response?.data || err.message);
                    setError(err.response?.data?.error || "Failed to update exam");
                    setShowToast(true);
                  } finally {
                    setPosting(false);
                  }
                }}
                disabled={posting}
              >
                {posting ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                    Saving...
                  </>
                ) : "Save Changes"}
              </Button>
            </Modal.Footer>
          </Modal>
          
          {/* Delete Exam Confirmation Modal */}
          <Modal show={showDeleteExamModal} onHide={() => setShowDeleteExamModal(false)}>
            <Modal.Header closeButton className="bg-danger text-white">
              <Modal.Title>
                <i className="bi bi-exclamation-triangle-fill me-2"></i>
                Confirm Delete
              </Modal.Title>
            </Modal.Header>
            <Modal.Body>
              {selectedExam ? (
                <div className="text-center">
                  <div className="d-flex justify-content-center mb-3">
                    <div className="text-danger" style={{ fontSize: '3rem' }}>
                      <i className="bi bi-trash3"></i>
                    </div>
                  </div>
                  <p>Are you sure you want to delete this exam?</p>
                  <h5 className="fw-bold mb-3">{selectedExam.title}</h5>
                  <div className="alert alert-warning">
                    <small>
                      <i className="bi bi-exclamation-triangle-fill me-2"></i>
                      This action cannot be undone. All student submissions for this assignment will also be deleted.
                    </small>
                  </div>
                </div>
              ) : (
                <p>No assignment selected.</p>
              )}
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onClick={() => setShowDeleteExamModal(false)}>
                Cancel
              </Button>
              <Button 
                variant="danger" 
                onClick={async () => {
                  if (!selectedExam) return;
                  
                  try {
                    setDeletingExam(true);
                    
                    // Call API to delete the exam
                    await deleteExam(selectedExam._id);
                    
                    // Close modal and refresh data
                    setShowDeleteExamModal(false);
                    setSelectedExam(null);
                    fetchExams(); // Refresh exams list
                    
                    // Show success message with the assignment title
                    setSuccessMessage(`Assignment "${selectedExam.title}" deleted successfully`);
                    setShowToast(true);
                  } catch (err) {
                    console.error("Error deleting exam:", err.response?.data || err.message);
                    setError(err.response?.data?.error || "Failed to delete assignment");
                    setShowToast(true);
                  } finally {
                    setDeletingExam(false);
                  }
                }}
                disabled={deletingExam}
              >
                {deletingExam ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                    Deleting...
                  </>
                ) : "Delete"}
              </Button>
            </Modal.Footer>
          </Modal>

          {/* Submissions Modal */}
          <Modal show={showSubmissionsModal} onHide={() => setShowSubmissionsModal(false)} size="lg">
            <Modal.Header closeButton>
              <Modal.Title>Student Submissions</Modal.Title>
            </Modal.Header>
            <Modal.Body>
              {selectedExam && (
                <div>
                  <h5 className="mb-3">{selectedExam.title}</h5>
                  {examSubmissions.length > 0 ? (
                    <div className="table-responsive">
                      <table className="table table-striped">
                        <thead>
                          <tr>
                            <th>Student</th>
                            <th>Score</th>
                            <th>Submitted At</th>
                            <th>Total Questions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {examSubmissions.map((submission, index) => (
                            <tr key={index}>
                              <td>{submission.student}</td>
                              <td>
                                {/* Show numeric score as X/Y, but keep color thresholds based on percentage */}
                                <span className={`badge ${(((submission.finalScore || 0) / (submission.answers ? submission.answers.length : (submission.totalQuestions || 1))) * 100) >= 70 ? 'bg-success' : (((submission.finalScore || 0) / (submission.answers ? submission.answers.length : (submission.totalQuestions || 1))) * 100) >= 50 ? 'bg-warning' : 'bg-danger'}`}>
                                  {submission.finalScore}/{submission.answers ? submission.answers.length : (submission.totalQuestions || 0)}
                                </span>
                              </td>
                              <td>{new Date(submission.submittedAt).toLocaleString()}</td>
                              <td>{submission.answers ? submission.answers.length : 0}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <i className="bi bi-inbox display-4 text-muted"></i>
                      <p className="text-muted mt-2">No submissions yet</p>
                    </div>
                  )}
                </div>
              )}
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onClick={() => setShowSubmissionsModal(false)}>
                Close
              </Button>
            </Modal.Footer>
          </Modal>
        </div>
      )}

      {activeTab === "people" && (
        <div>
          <Card className="mb-3">
            <Card.Header>
              <h5 className="mb-0">Teacher</h5>
            </Card.Header>
            <Card.Body>
              <div className="d-flex align-items-center">
                <div className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center me-3" style={{ width: 40, height: 40 }}>
                  {classInfo?.teacher?.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="fw-bold">{classInfo?.teacher}</div>
                </div>
              </div>
            </Card.Body>
          </Card>

          <Card>
            <Card.Header className="d-flex align-items-center">
              <h5 className="mb-0">Students ({students.length})</h5>
            </Card.Header>
            <Card.Body>
              {students.length === 0 ? (
                <div className="text-center text-muted py-3">No students enrolled yet</div>
              ) : (
                <ListGroup variant="flush">
                  {students.map(student => (
                    <ListGroup.Item key={student._id} className="d-flex justify-content-between align-items-center py-2">
                      <div className="d-flex align-items-center">
                        <div className="rounded-circle bg-secondary text-white d-flex align-items-center justify-content-center me-3" style={{ width: 32, height: 32 }}>
                          {student.name?.charAt(0).toUpperCase() || student.username?.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div>{student.name || student.username}</div>
                          <small className="text-muted">{student.email}</small>
                        </div>
                      </div>
                      <Button 
                        variant="outline-danger" 
                        size="sm"
                        onClick={() => showRemoveConfirmation(student)}
                      >
                        Remove
                      </Button>
                    </ListGroup.Item>
                  ))}
                </ListGroup>
              )}
            </Card.Body>
          </Card>
        </div>
      )}

      {/* Always mount Materials so the Add Material button in Stream can open its modal. Hide its main content unless the Materials tab is active. */}
      <Materials
        className={className}
        showCreateModal={showMaterialsModal}
        onShowCreateModalChange={setShowMaterialsModal}
        onMaterialCreated={handleMaterialCreated}
        hideContent={activeTab !== 'materials'}
      />

      {/* Exam Creation Modal */}
      <Modal
        show={showExamModal}
        onHide={() => setShowExamModal(false)}
        size="lg"
        centered
      >
        <Modal.Header closeButton className="modern-modal-header">
          <Modal.Title>Create New Exam</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Exam Title</Form.Label>
              <Form.Control
                type="text"
                value={examData.title}
                onChange={(e) => setExamData({ ...examData, title: e.target.value })}
                placeholder="e.g., Midterm Exam"
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Description (Optional)</Form.Label>
              <Form.Control
                as="textarea"
                rows={2}
                value={examData.description}
                onChange={(e) => setExamData({ ...examData, description: e.target.value })}
                placeholder="Exam instructions or description"
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Due Date</Form.Label>
              <Form.Control
                type="datetime-local"
                value={examData.due}
                onChange={(e) => setExamData({ ...examData, due: e.target.value })}
                placeholder="Select due date and time"
              />
              <Form.Text className="text-muted">
                Students will earn +1 credit point for early submission, -2 for late submission
              </Form.Text>
            </Form.Group>

            <div className="mt-4 mb-3">
              <h5>Questions</h5>
              {examData.questions.map((q, i) => (
                <Card key={i} className="mb-3">
                  <Card.Body>
                    <Form.Group className="mb-3">
                      <Form.Label>Question {i + 1}</Form.Label>
                      <Form.Control
                        type="text"
                        value={q.text}
                        onChange={(e) => handleQuestionChange(i, "text", e.target.value)}
                        placeholder="Enter question text"
                        required
                      />
                    </Form.Group>
                    <Form.Group className="mb-3">
                      <Form.Label>Question Type</Form.Label>
                      <Form.Select
                        value={q.type}
                        onChange={(e) => handleQuestionChange(i, "type", e.target.value)}
                      >
                        <option value="short">Short Answer</option>
                        <option value="multiple">Multiple Choice</option>
                      </Form.Select>
                    </Form.Group>

                    {q.type === "multiple" && (
                      <div className="mb-3">
                        <Form.Label>Options</Form.Label>
                        <div className="ms-3">
                          {(q.options || []).map((opt, oi) => (
                            <Form.Group className="mb-2 d-flex" key={oi}>
                              <Form.Control
                                type="text"
                                value={opt}
                                onChange={(e) => {
                                  const newOptions = [...q.options];
                                  newOptions[oi] = e.target.value;
                                  handleQuestionChange(i, "options", newOptions);
                                }}
                                placeholder={`Option ${oi + 1}`}
                              />
                              <Button
                                variant="outline-danger"
                                size="sm"
                                className="ms-2"
                                onClick={() => {
                                  const newOptions = [...q.options];
                                  newOptions.splice(oi, 1);
                                  handleQuestionChange(i, "options", newOptions);
                                }}
                              >
                                <i className="bi bi-trash"></i>
                              </Button>
                            </Form.Group>
                          ))}
                          <Button
                            variant="outline-secondary"
                            size="sm"
                            onClick={() => {
                              const newOptions = [...(q.options || []), ""];
                              handleQuestionChange(i, "options", newOptions);
                            }}
                          >
                            + Add Option
                          </Button>
                        </div>

                        <Form.Group className="mt-3">
                          <Form.Label>Correct Answer</Form.Label>
                          <Form.Select
                            value={q.correctAnswer}
                            onChange={(e) => handleQuestionChange(i, "correctAnswer", e.target.value)}
                          >
                            <option value="">Select correct option</option>
                            {q.options?.map((opt, oi) => (
                              <option key={oi} value={opt}>
                                {opt}
                              </option>
                            ))}
                          </Form.Select>
                        </Form.Group>
                      </div>
                    )}

                    {q.type === "short" && (
                      <Form.Group className="mb-3">
                        <Form.Label>Answer Key (Optional)</Form.Label>
                        <Form.Control
                          type="text"
                          value={q.correctAnswer}
                          onChange={(e) => handleQuestionChange(i, "correctAnswer", e.target.value)}
                          placeholder="Correct answer (optional)"
                        />
                        <Form.Text className="text-muted">
                          Leave blank for manual grading
                        </Form.Text>
                      </Form.Group>
                    )}
                    
                    {examData.questions.length > 1 && (
                      <Button 
                        variant="outline-danger" 
                        size="sm" 
                        onClick={() => {
                          const newQuestions = [...examData.questions];
                          newQuestions.splice(i, 1);
                          setExamData({...examData, questions: newQuestions});
                        }}
                      >
                        Remove Question
                      </Button>
                    )}
                  </Card.Body>
                </Card>
              ))}
              <Button variant="outline-primary" onClick={handleAddQuestion}>
                + Add Question
              </Button>
            </div>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowExamModal(false)}>
            Cancel
          </Button>
          <Button className="btn-modern-primary" onClick={handleCreateExam}>
            Create Exam
          </Button>
        </Modal.Footer>
      </Modal>
      
      {/* Invite Students functionality removed */}

      {/* Remove Student Confirmation Modal */}
      <Modal 
        show={showRemoveModal}
        onHide={() => {
          setShowRemoveModal(false);
          setStudentToRemove(null);
        }}
        centered
      >
        <Modal.Header closeButton className="modern-modal-header">
          <Modal.Title>Remove Student</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>Are you sure you want to remove <strong>{studentToRemove?.name || studentToRemove?.username}</strong> from this class?</p>
          <p className="text-muted">This action cannot be undone. The student will lose access to all class materials and assignments.</p>
        </Modal.Body>
        <Modal.Footer>
          <Button 
            variant="secondary" 
            onClick={() => {
              setShowRemoveModal(false);
              setStudentToRemove(null);
            }}
          >
            Cancel
          </Button>
          <Button 
            variant="danger" 
            onClick={handleRemoveStudent}
          >
            Remove Student
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}

// ================= Assignments =================
function Assignments() {
  const [assignments, setAssignments] = useState([]);
  const [classes, setClasses] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [assignmentData, setAssignmentData] = useState({ class: "", title: "", description: "", due: "", status: "Pending" });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [showToast, setShowToast] = useState(false);
  

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${localStorage.getItem("token")}` };
      const [assignmentsRes, classesRes] = await Promise.all([
        retry(() => axios.get(`${API_BASE_URL}/api/assignments?page=1&limit=100`, { headers })),
        retry(() => axios.get(`${API_BASE_URL}/api/classes?page=1&limit=100`, { headers })),
      ]);
      setAssignments(assignmentsRes.data || []);
      setClasses(classesRes.data || []);
      
    } catch (err) {
      console.error("Fetch error:", err.response?.data || err.message);
      setError(err.response?.data?.error || "Failed to load assignments or classes. Check network or login status.");
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

  const handleCreateAssignment = async () => {
    if (!assignmentData.class || !assignmentData.title || !assignmentData.due) {
      setError("Class, title, and due date are required");
      setShowToast(true);
      return;
    }
    try {
      await retry(() =>
        axios.post(
          `${API_BASE_URL}/api/assignments`,
          assignmentData,
          { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
        )
      );
      await fetchData();
      setShowCreateModal(false);
      setAssignmentData({ class: "", title: "", description: "", due: "", status: "Pending" });
      setError("Assignment created successfully!");
      setShowToast(true);
    } catch (err) {
      console.error("Create assignment error:", err.response?.data || err.message);
      setError(err.response?.data?.error || "Failed to create assignment. Check inputs or network.");
      setShowToast(true);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-4">
        <Spinner animation="border" role="status" aria-label="Loading assignments" />
        <p>Loading assignments...</p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="fw-bold mb-3">Assignments</h2>
      {error && (
        <Toast
          show={showToast}
          onClose={() => setShowToast(false)}
          delay={5000}
          autohide
          bg={error.toLowerCase().includes("success") || error.toLowerCase().includes("created") || error.toLowerCase().includes("deleted") || error.toLowerCase().includes("removed") || error.toLowerCase().includes("posted") || error.toLowerCase().includes("assigned") || error.toLowerCase().includes("sent") ? "success" : "danger"}
          style={{ position: "fixed", top: "20px", right: "20px", zIndex: 10000 }}
        >
          <Toast.Body className="text-white">{error}</Toast.Body>
        </Toast>
      )}
      <Button
        variant="outline-primary"
        className="mb-3"
        onClick={() => setShowCreateModal(true)}
        aria-label="Create new assignment"
      >
        + Create Assignment
      </Button>
      <Table striped bordered hover responsive style={{ tableLayout: "fixed" }}>
        <thead>
          <tr>
            <th style={{ width: "20%" }}>Class</th>
            <th style={{ width: "20%" }}>Title</th>
            <th style={{ width: "30%" }}>Description</th>
            <th style={{ width: "15%" }}>Due</th>
            <th style={{ width: "15%" }}>Status</th>
          </tr>
        </thead>
        <tbody>
          {assignments.length === 0 ? (
            <tr>
              <td colSpan={5} className="text-center text-muted">
                No assignments found. Create an assignment to get started!
              </td>
            </tr>
          ) : (
            assignments.map((a) => (
              <tr key={a._id || a.id}>
                <td>{a.class}</td>
                <td>{a.title}</td>
                <td style={{ whiteSpace: "pre-wrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {a.description}
                </td>
                <td>{new Date(a.due).toLocaleDateString()}</td>
                <td>{a.status}</td>
              </tr>
            ))
          )}
        </tbody>
      </Table>
      <Modal
        show={showCreateModal}
        onHide={() => {
          setShowCreateModal(false);
          setAssignmentData({ class: "", title: "", description: "", due: "", status: "Pending" });
          setError("");
        }}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>Create Assignment</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Class</Form.Label>
              <Form.Select
                value={assignmentData.class}
                onChange={(e) => setAssignmentData({ ...assignmentData, class: e.target.value })}
                required
                aria-required="true"
              >
                <option value="">Select Class</option>
                {classes.map((cls) => (
                  <option key={cls._id || cls.id} value={cls.name}>
                    {cls.name}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Title</Form.Label>
              <Form.Control
                type="text"
                value={assignmentData.title}
                onChange={(e) => setAssignmentData({ ...assignmentData, title: e.target.value })}
                placeholder="e.g., Homework 1"
                required
                aria-required="true"
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Description</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={assignmentData.description}
                onChange={(e) => setAssignmentData({ ...assignmentData, description: e.target.value })}
                placeholder="Describe the assignment"
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Due Date</Form.Label>
              <Form.Control
                type="date"
                value={assignmentData.due}
                onChange={(e) => setAssignmentData({ ...assignmentData, due: e.target.value })}
                required
                aria-required="true"
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => {
              setShowCreateModal(false);
              setAssignmentData({ class: "", title: "", description: "", due: "", status: "Pending" });
              setError("");
            }}
          >
            Cancel
          </Button>
          <Button
            variant="success"
            onClick={handleCreateAssignment}
            disabled={!assignmentData.class || !assignmentData.title || !assignmentData.due}
            aria-label="Create assignment"
          >
            Create
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}

// ================= Announcements =================
function Announcements() {
  const [announcements, setAnnouncements] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [announcementData, setAnnouncementData] = useState({ message: "", date: new Date().toISOString().split("T")[0] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [showToast, setShowToast] = useState(false);
  

  const fetchAnnouncements = useCallback(async () => {
    setLoading(true);
    try {
      const res = await retry(() =>
        axios.get(`${API_BASE_URL}/api/announcements?page=1&limit=100`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        })
      );
      setAnnouncements(res.data || []);
      
    } catch (err) {
      console.error("Fetch announcements error:", err.response?.data || err.message);
      setError(err.response?.data?.error || "Failed to load announcements. Check network or login status.");
      setShowToast(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (!cancelled) fetchAnnouncements();
    return () => {
      cancelled = true;
    };
  }, [fetchAnnouncements]);

  const handleCreateAnnouncement = async () => {
    if (!announcementData.message || !announcementData.date) {
      setError("Message and date are required");
      setShowToast(true);
      return;
    }
    try {
      await retry(() =>
        axios.post(
          `${API_BASE_URL}/api/announcements`,
          { ...announcementData, teacher: localStorage.getItem("username") },
          { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
        )
      );
      await fetchAnnouncements();
      setShowCreateModal(false);
      setAnnouncementData({ message: "", date: new Date().toISOString().split("T")[0] });
      setError("Announcement posted successfully!");
      setShowToast(true);
    } catch (err) {
      console.error("Create announcement error:", err.response?.data || err.message);
      setError(err.response?.data?.error || "Failed to post announcement. Check inputs or network.");
      setShowToast(true);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-4">
        <Spinner animation="border" role="status" aria-label="Loading announcements" />
        <p>Loading announcements...</p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="fw-bold mb-3">Announcements / Stream</h2>
      {error && (
        <Toast
          show={showToast}
          onClose={() => setShowToast(false)}
          delay={5000}
          autohide
          bg={error.toLowerCase().includes("success") || error.toLowerCase().includes("created") || error.toLowerCase().includes("deleted") || error.toLowerCase().includes("removed") || error.toLowerCase().includes("posted") || error.toLowerCase().includes("assigned") || error.toLowerCase().includes("sent") ? "success" : "danger"}
          style={{ position: "fixed", top: "20px", right: "20px", zIndex: 10000 }}
        >
          <Toast.Body className="text-white">{error}</Toast.Body>
        </Toast>
      )}
      <Button
        variant="outline-primary"
        className="mb-3"
        onClick={() => setShowCreateModal(true)}
        aria-label="Post new announcement"
      >
        + Post Announcement
      </Button>
      <Table striped bordered hover responsive style={{ tableLayout: "fixed" }}>
        <thead>
          <tr>
            <th style={{ width: "20%" }}>Teacher</th>
            <th style={{ width: "20%" }}>Date</th>
            <th style={{ width: "50%" }}>Message</th>
            <th style={{ width: "10%" }}>Likes</th>
          </tr>
        </thead>
        <tbody>
          {announcements.length === 0 && (
            <tr>
              <td colSpan={4} className="text-center text-muted">
                No announcements found. Post one to get started!
              </td>
            </tr>
          )}
          {announcements.map((a) => (
            <tr key={a._id || a.id}>
              <td>{a.teacher}</td>
              <td>{new Date(a.date).toLocaleDateString()}</td>
              <td style={{ whiteSpace: "pre-wrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {a.message}
              </td>
              <td>{a.likes}</td>
            </tr>
          ))}
        </tbody>
      </Table>
      <Modal
        show={showCreateModal}
        onHide={() => {
          setShowCreateModal(false);
          setAnnouncementData({ message: "", date: new Date().toISOString().split("T")[0] });
          setError("");
        }}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>Post Announcement</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Message</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={announcementData.message}
                onChange={(e) => setAnnouncementData({ ...announcementData, message: e.target.value })}
                placeholder="Enter announcement"
                required
                aria-required="true"
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Date</Form.Label>
              <Form.Control
                type="date"
                value={announcementData.date}
                onChange={(e) => setAnnouncementData({ ...announcementData, date: e.target.value })}
                required
                aria-required="true"
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => {
              setShowCreateModal(false);
              setAnnouncementData({ message: "", date: new Date().toISOString().split("T")[0] });
              setError("");
            }}
          >
            Cancel
          </Button>
          <Button
            variant="success"
            onClick={handleCreateAnnouncement}
            disabled={!announcementData.message || !announcementData.date}
            aria-label="Post announcement"
          >
            Post
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}

// ================= Exams =================
function Exams() {
  const [exams, setExams] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [examData, setExamData] = useState({ title: "", description: "", class: "", questions: [{ text: "", type: "short", options: [], correctAnswer: "" }] });
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [showToast, setShowToast] = useState(false);
  

  const fetchExams = useCallback(async () => {
    setLoading(true);
    try {
      const [examsRes, classesRes] = await Promise.all([
        retry(() =>
          axios.get(`${API_BASE_URL}/api/exams?page=1&limit=100`, {
            headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
          })
        ),
        retry(() =>
          axios.get(`${API_BASE_URL}/api/classes?page=1&limit=100`, {
            headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
          })
        ),
      ]);
      setExams(examsRes.data || []);
      setClasses(classesRes.data || []);
      
    } catch (err) {
      console.error("Fetch exams error:", err.response?.data || err.message);
      setError(err.response?.data?.error || "Failed to load exams. Check network or login status.");
      setShowToast(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (!cancelled) fetchExams();
    return () => {
      cancelled = true;
    };
  }, [fetchExams]);

  const handleAddQuestion = () => {
    setExamData({
      ...examData,
      questions: [...examData.questions, { text: "", type: "short", options: [], correctAnswer: "" }],
    });
  };

  const handleQuestionChange = (index, field, value) => {
    const newQuestions = [...examData.questions];
    newQuestions[index] = { ...newQuestions[index], [field]: value };
    setExamData({ ...examData, questions: newQuestions });
  };

  const handleCreateExam = async () => {
    if (!examData.title || !examData.class || examData.questions.some((q) => !q.text)) {
      setError("Title, class, and question text are required");
      setShowToast(true);
      return;
    }
    try {
      await retry(() =>
        axios.post(
          `${API_BASE_URL}/api/exams`,
          { ...examData, createdBy: localStorage.getItem("username") },
          { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
        )
      );
      await fetchExams();
      setShowCreateModal(false);
      setExamData({ title: "", description: "", class: "", questions: [{ text: "", type: "short", options: [], correctAnswer: "" }] });
      setSuccessMessage("Exam created successfully!");
      setShowToast(true);
    } catch (err) {
      console.error("Create exam error:", err.response?.data || err.message);
      setError(err.response?.data?.error || "Failed to create exam. Check inputs or network.");
      setShowToast(true);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-4">
        <Spinner animation="border" role="status" aria-label="Loading exams" />
        <p>Loading exams...</p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="fw-bold mb-3">Exams</h2>
      {error && (
        <Toast
          show={showToast}
          onClose={() => setShowToast(false)}
          delay={5000}
          autohide
          bg={error.toLowerCase().includes("success") || error.toLowerCase().includes("created") || error.toLowerCase().includes("deleted") || error.toLowerCase().includes("removed") || error.toLowerCase().includes("posted") || error.toLowerCase().includes("assigned") || error.toLowerCase().includes("sent") ? "success" : "danger"}
          style={{ position: "fixed", top: "20px", right: "20px", zIndex: 10000 }}
        >
          <Toast.Body className="text-white">{error}</Toast.Body>
        </Toast>
      )}
      <Button
        variant="outline-primary"
        className="mb-3"
        onClick={() => setShowCreateModal(true)}
        aria-label="Create new exam"
      >
        + Create Exam
      </Button>
      <Table striped bordered hover responsive style={{ tableLayout: "fixed" }}>
        <thead>
          <tr>
            <th style={{ width: "20%" }}>Title</th>
            <th style={{ width: "25%" }}>Description</th>
            <th style={{ width: "20%" }}>Class</th>
            <th style={{ width: "20%" }}>Created By</th>
            <th style={{ width: "15%" }}>Questions</th>
          </tr>
        </thead>
        <tbody>
          {exams.length === 0 && (
            <tr>
              <td colSpan={5} className="text-center text-muted">
                No exams found. Create an exam to get started!
              </td>
            </tr>
          )}
          {exams.map((e) => (
            <tr key={e._id || e.id}>
              <td>{e.title}</td>
              <td style={{ whiteSpace: "pre-wrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {e.description}
              </td>
              <td>{e.class}</td>
              <td>{e.createdBy}</td>
              <td>{e.questions.length}</td>
            </tr>
          ))}
        </tbody>
      </Table>
      <Modal
        show={showCreateModal}
        onHide={() => {
          setShowCreateModal(false);
          setExamData({ title: "", description: "", class: "", questions: [{ text: "", type: "short", options: [], correctAnswer: "" }] });
          setError("");
        }}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>Create Exam</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Class</Form.Label>
              <Form.Select
                value={examData.class}
                onChange={(e) => setExamData({ ...examData, class: e.target.value })}
                required
                aria-required="true"
              >
                <option value="">Select Class</option>
                {classes.map((cls) => (
                  <option key={cls._id || cls.id} value={cls.name}>
                    {cls.name}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Title</Form.Label>
              <Form.Control
                type="text"
                value={examData.title}
                onChange={(e) => setExamData({ ...examData, title: e.target.value })}
                placeholder="e.g., Midterm"
                required
                aria-required="true"
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Description</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={examData.description}
                onChange={(e) => setExamData({ ...examData, description: e.target.value })}
                placeholder="Describe the exam"
              />
            </Form.Group>
            {examData.questions.map((q, idx) => (
              <div key={idx} className="mb-3 p-3 border rounded">
                <Form.Group className="mb-2">
                  <Form.Label>Question {idx + 1}</Form.Label>
                  <Form.Control
                    type="text"
                    value={q.text}
                    onChange={(e) => handleQuestionChange(idx, "text", e.target.value)}
                    placeholder="Enter question"
                    required
                    aria-required="true"
                  />
                </Form.Group>
                <Form.Group className="mb-2">
                  <Form.Label>Type</Form.Label>
                  <Form.Select
                    value={q.type}
                    onChange={(e) => handleQuestionChange(idx, "type", e.target.value)}
                    aria-label={`Question ${idx + 1} type`}
                  >
                    <option value="short">Short Answer</option>
                    <option value="multiple">Multiple Choice</option>
                  </Form.Select>
                </Form.Group>
                {q.type === "multiple" && (
                  <>
                    <Form.Group className="mb-2">
                      <Form.Label>Options (one per line)</Form.Label>
                      <Form.Control
                        as="textarea"
                        rows={2}
                        value={(q.options || []).join("\n")}
                        onChange={(e) => handleQuestionChange(idx, "options", e.target.value.split("\n"))}
                        placeholder={"Option A\nOption B\nOption C"}
                      />
                    </Form.Group>
                    <Form.Group className="mb-2">
                      <Form.Label>Correct Answer</Form.Label>
                      <Form.Select
                        value={q.correctAnswer || ""}
                        onChange={(e) => handleQuestionChange(idx, "correctAnswer", e.target.value)}
                      >
                        <option value="">Select correct answer</option>
                        {(q.options || []).map((opt, i) => (
                          <option key={i} value={opt}>{opt}</option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                  </>
                )}
                {q.type === "short" && (
                  <Form.Group className="mb-2">
                    <Form.Label>Correct Answer (optional)</Form.Label>
                    <Form.Control
                      type="text"
                      value={q.correctAnswer || ""}
                      onChange={(e) => handleQuestionChange(idx, "correctAnswer", e.target.value)}
                      placeholder="Enter correct answer for auto-grading"
                    />
                  </Form.Group>
                )}
                <div className="d-flex justify-content-end">
                  <Button variant="outline-secondary" size="sm" onClick={handleAddQuestion} aria-label="Add another question">
                    + Add Question
                  </Button>
                </div>
              </div>
            ))}
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => {
              setShowCreateModal(false);
              setExamData({ title: "", description: "", class: "", questions: [{ text: "", type: "short", options: [], correctAnswer: "" }] });
              setError("");
            }}
          >
            Cancel
          </Button>
          <Button
            variant="success"
            onClick={handleCreateExam}
            disabled={!examData.title || !examData.class || examData.questions.some((q) => !q.text)}
            aria-label="Create exam"
          >
            Create
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}

// ================= Grades (Leaderboard) =================
function Grades() {
  const [leaderboardData, setLeaderboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showToast, setShowToast] = useState(false);
  const [viewMode, setViewMode] = useState("all"); // all, byClass, bySection
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedSection, setSelectedSection] = useState("");
  const [sortBy, setSortBy] = useState("finalScore"); // finalScore, submittedAt, student
  const [sortOrder, setSortOrder] = useState("desc"); // desc, asc
  const [searchTerm, setSearchTerm] = useState("");

  const fetchLeaderboardData = useCallback(async () => {
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${localStorage.getItem("token")}` };
      const response = await retry(() => 
        axios.get(`${API_BASE_URL}/api/leaderboard`, { headers })
      );
      setLeaderboardData(response.data);
      
      // Set default class if available
      if (response.data?.summary?.classes?.length > 0 && !selectedClass) {
        setSelectedClass(response.data.summary.classes[0]);
      }
      
    } catch (err) {
      console.error("Fetch leaderboard error:", err.response?.data || err.message);
      setError(err.response?.data?.error || "Failed to load leaderboard data");
      setShowToast(true);
    } finally {
      setLoading(false);
    }
  }, [selectedClass]);

  // Delete a single submission
  const handleDeleteSubmission = async (submissionId) => {
    if (!window.confirm("Are you sure you want to delete this submission?")) {
      return;
    }

    try {
      const headers = { Authorization: `Bearer ${localStorage.getItem("token")}` };
      await axios.delete(`${API_BASE_URL}/api/exam-submissions/${submissionId}`, { headers });
      
      // Refresh leaderboard data
      await fetchLeaderboardData();
      
      setError("");
      setShowToast(false);
    } catch (err) {
      console.error("Delete submission error:", err.response?.data || err.message);
      setError(err.response?.data?.error || "Failed to delete submission");
      setShowToast(true);
    }
  };

  // Clear all submissions
  const handleClearAllSubmissions = async () => {
    if (!window.confirm("Are you sure you want to delete ALL submissions? This action cannot be undone!")) {
      return;
    }

    try {
      const headers = { Authorization: `Bearer ${localStorage.getItem("token")}` };
      const response = await axios.delete(`${API_BASE_URL}/api/exam-submissions`, { headers });
      
      // Refresh leaderboard data
      await fetchLeaderboardData();
      
      alert(`Successfully deleted ${response.data.deletedCount} submissions`);
      setError("");
      setShowToast(false);
    } catch (err) {
      console.error("Clear all submissions error:", err.response?.data || err.message);
      setError(err.response?.data?.error || "Failed to clear submissions");
      setShowToast(true);
    }
  };

  useEffect(() => {
    let cancelled = false;
    if (!cancelled) fetchLeaderboardData();
    return () => {
      cancelled = true;
    };
  }, [fetchLeaderboardData]);

  // Socket listener for real-time grade updates
  useEffect(() => {
    const socket = io(API_BASE_URL);
    
    // Listen for exam submissions from all classes
    socket.on('exam-submitted', (data) => {
      console.log('Exam submitted, refreshing leaderboard:', data);
      // Refresh leaderboard data when any student submits an exam
      fetchLeaderboardData();
    });

    return () => {
      socket.disconnect();
    };
  }, [fetchLeaderboardData]);

  // Get current data based on view mode
  const getCurrentData = () => {
    if (!leaderboardData) return [];
    
    let data = [];
    switch (viewMode) {
      case "byClass":
        data = selectedClass ? (leaderboardData.byClass[selectedClass] || []) : [];
        break;
      case "bySection":
        data = selectedSection ? (leaderboardData.bySection[selectedSection] || []) : [];
        break;
      default:
        data = leaderboardData.allSubmissions || [];
    }
    
    // Apply search filter
    if (searchTerm) {
      data = data.filter(item => 
        item.student.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.examTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.className.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.section.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Apply simple sorting
    data.sort((a, b) => {
      let aVal = a[sortBy];
      let bVal = b[sortBy];
      
      // Handle different data types
      if (sortBy === "finalScore") {
        aVal = Number(aVal) || 0;
        bVal = Number(bVal) || 0;
      } else if (typeof aVal === "string") {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
      }
      
      if (sortOrder === "desc") {
        return bVal > aVal ? 1 : bVal < aVal ? -1 : 0;
      } else {
        return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
      }
    });
    
    return data;
  };

  const getScoreColor = (finalScore, totalQuestions) => {
    if (!totalQuestions || totalQuestions === 0) return "secondary";
    const percentage = (finalScore / totalQuestions) * 100;
    if (percentage >= 90) return "success";
    if (percentage >= 80) return "info";
    if (percentage >= 70) return "warning";
    return "danger";
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  if (loading) {
    return (
      <div className="text-center py-4">
        <Spinner animation="border" role="status" aria-label="Loading leaderboard" />
        <p>Loading leaderboard...</p>
      </div>
    );
  }

  const currentData = getCurrentData();
  const availableClasses = leaderboardData?.summary?.classes || [];
  const availableSections = leaderboardData ? Object.keys(leaderboardData.bySection) : [];

  return (
    <div className="dashboard-content">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="fw-bold mb-0">🏆 Student Leaderboard</h2>
        <div className="d-flex gap-2">
          <Button variant="outline-danger" size="sm" onClick={handleClearAllSubmissions}>
            🗑️ Clear All
          </Button>
          <Button variant="outline-secondary" size="sm" onClick={fetchLeaderboardData}>
            🔄 Refresh
          </Button>
        </div>
      </div>

      {/* Auto-cleanup notice */}
      <Alert variant="info" className="mb-3">
        <small>
          ℹ️ <strong>Note:</strong> Submissions are automatically removed after 24 hours. 
          You can also manually delete individual submissions or clear all at once.
        </small>
      </Alert>

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

      {/* Controls */}
      <Card className="mb-4">
        <Card.Body>
          <Row className="align-items-end">
            <Col md={2} sm={6} className="mb-2">
              <Form.Label className="fw-bold">View Mode</Form.Label>
              <Form.Select
                value={viewMode}
                onChange={(e) => setViewMode(e.target.value)}
                size="sm"
              >
                <option value="all">All Submissions</option>
                <option value="byClass">By Class</option>
                <option value="bySection">By Section</option>
              </Form.Select>
            </Col>
            
            {viewMode === "byClass" && (
              <Col md={2} sm={6} className="mb-2">
                <Form.Label className="fw-bold">Class</Form.Label>
                <Form.Select
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  size="sm"
                >
                  {availableClasses.map(className => (
                    <option key={className} value={className}>{className}</option>
                  ))}
                </Form.Select>
              </Col>
            )}
            
            {viewMode === "bySection" && (
              <Col md={2} sm={6} className="mb-2">
                <Form.Label className="fw-bold">Section</Form.Label>
                <Form.Select
                  value={selectedSection}
                  onChange={(e) => setSelectedSection(e.target.value)}
                  size="sm"
                >
                  <option value="">Select Section</option>
                  {availableSections.map(section => (
                    <option key={section} value={section}>{section}</option>
                  ))}
                </Form.Select>
              </Col>
            )}
            
            <Col md={2} sm={6} className="mb-2">
              <Form.Label className="fw-bold">Sort By</Form.Label>
              <Form.Select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                size="sm"
              >
                <option value="finalScore">Score</option>
                <option value="student">Name</option>
                <option value="section">Section</option>
                <option value="className">Class</option>
              </Form.Select>
            </Col>
            
            <Col md={2} sm={6} className="mb-2">
              <Form.Label className="fw-bold">Order</Form.Label>
              <Form.Select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                size="sm"
              >
                <option value="desc">Highest First</option>
                <option value="asc">Lowest First</option>
              </Form.Select>
            </Col>
            
            <Col md={2} sm={12} className="mb-2">
              <Form.Label className="fw-bold">Search</Form.Label>
              <Form.Control
                type="text"
                placeholder="Search students, exams..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                size="sm"
              />
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Leaderboard Table */}
      {currentData.length === 0 ? (
        <Card className="p-4 text-center text-muted">
          <h5>No exam submissions found</h5>
          <p>Students haven't submitted any exams yet, or no exams match your current filters.</p>
        </Card>
      ) : (
        <Card>
          <Card.Header className="bg-light">
            <div className="d-flex justify-content-between align-items-center">
              <h5 className="mb-0">
                🎯 Showing {currentData.length} submission{currentData.length !== 1 ? 's' : ''}
              </h5>
              <div className="d-flex align-items-center gap-3">
                <small className="text-muted">
                  Updated: {new Date().toLocaleTimeString()}
                </small>
              </div>
            </div>
          </Card.Header>
          <div className="table-responsive">
            <Table striped hover className="mb-0">
              <thead className="table-dark">
                <tr>
                  <th>#</th>
                  <th>Student</th>
                  <th>Section</th>
                  <th>Class</th>
                  <th>Exam</th>
                  <th>Raw Score</th>
                  <th>Final Score</th>
                  <th>Credits Used</th>
                  <th>Credit Points</th>
                  <th>Submitted</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {currentData.map((submission, index) => (
                  <tr key={submission._id}>
                    <td>
                      <Badge bg={index < 3 ? "warning" : "secondary"}>
                        {index + 1}
                        {index === 0 && " 🥇"}
                        {index === 1 && " 🥈"}
                        {index === 2 && " 🥉"}
                      </Badge>
                    </td>
                    <td className="fw-bold">{submission.student}</td>
                    <td>
                      <Badge bg="info" className="small">
                        {submission.section}
                      </Badge>
                    </td>
                    <td className="small">{submission.className}</td>
                    <td className="small">{submission.examTitle}</td>
                    <td className="text-center">{submission.rawScore}/{submission.totalQuestions || '?'}</td>
                    <td className="text-center">
                      <Badge bg={getScoreColor(submission.finalScore, submission.totalQuestions)}>
                        {submission.finalScore}/{submission.totalQuestions || '?'}
                        {submission.creditsUsed > 0 && (
                          <span className="small"> (+{submission.creditsUsed})</span>
                        )}
                      </Badge>
                    </td>
                    <td className="text-center">
                      {submission.creditsUsed > 0 ? (
                        <Badge bg="warning">{submission.creditsUsed}</Badge>
                      ) : (
                        <span className="text-muted">-</span>
                      )}
                    </td>
                    <td className="text-center">
                      <Badge bg="primary">{submission.creditPoints}</Badge>
                    </td>
                    <td className="small">{formatDate(submission.submittedAt)}</td>
                    <td>
                      {submission.isEarly === true && (
                        <Badge bg="success" className="small">⚡ Early</Badge>
                      )}
                      {submission.isLate === true && (
                        <Badge bg="danger" className="small">⏰ Late</Badge>
                      )}
                      {submission.isEarly === false && submission.isLate === false && (
                        <Badge bg="info" className="small">✅ On Time</Badge>
                      )}
                      {submission.isEarly === null && (
                        <Badge bg="secondary" className="small">📝 No Due Date</Badge>
                      )}
                    </td>
                    <td className="text-center">
                      <Button
                        variant="outline-danger"
                        size="sm"
                        onClick={() => handleDeleteSubmission(submission._id)}
                        title="Delete this submission"
                      >
                        🗑️
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        </Card>
      )}
    </div>
  );
}

// ================= Profile =================
function Profile() {
  const [profile, setProfile] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showToast, setShowToast] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    email: ''
  });
  const [stats, setStats] = useState({
    totalClasses: 0,
    totalStudents: 0,
    totalExams: 0,
    totalMaterials: 0
  });

  const navigate = useNavigate();

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    try {
      // First, always fetch the profile - this is the critical part
      const profileRes = await retry(() =>
        axios.get(`${API_BASE_URL}/api/profile`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        })
      );
      
      setProfile(profileRes.data);
      
      // Then try to fetch classes for stats - don't fail the whole operation if this fails
      try {
        const classesRes = await retry(() =>
          axios.get(`${API_BASE_URL}/api/classes?page=1&limit=100`, {
            headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
          })
        );
        
        // Filter classes taught by this teacher
        const teacherClasses = (classesRes.data || []).filter(cls => cls.teacher === profileRes.data.username);
        
        // Calculate statistics
        const totalStudents = teacherClasses.reduce((sum, cls) => sum + (cls.students?.length || 0), 0);
        
        // Fetch exams and materials for all teacher's classes
        let totalExams = 0;
        let totalMaterials = 0;
        for (const cls of teacherClasses) {
          try {
            const examsRes = await retry(() =>
              axios.get(`${API_BASE_URL}/api/exams?className=${encodeURIComponent(cls.name)}`, {
                headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
              })
            );
            totalExams += examsRes.data?.length || 0;
            
            const materialsRes = await retry(() =>
              axios.get(`${API_BASE_URL}/api/materials?className=${encodeURIComponent(cls.name)}`, {
                headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
              })
            );
            totalMaterials += materialsRes.data?.length || 0;
          } catch (err) {
            console.warn(`Failed to fetch data for class ${cls.name}:`, err);
            // Continue with other classes
          }
        }
        
        setStats({
          totalClasses: teacherClasses.length,
          totalStudents: totalStudents,
          totalExams: totalExams,
          totalMaterials: totalMaterials
        });
      } catch (statsErr) {
        console.warn("Failed to load teacher stats, but profile loaded successfully:", statsErr);
        // Set default stats if classes fetch fails
        setStats({
          totalClasses: 0,
          totalStudents: 0,
          totalExams: 0,
          totalMaterials: 0
        });
      }
      
    } catch (err) {
      console.error("Fetch profile error:", err.response?.data || err.message);
      setError(err.response?.data?.error || "Failed to load profile. Check login status.");
      setShowToast(true);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('authToken');
    navigate('/login');
  };

  const handleEditProfile = () => {
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
      setError("Profile updated successfully!");
      setShowToast(true);
    } catch (err) {
      console.error("Error updating profile:", err);
      setError(err.response?.data?.error || "Failed to update profile");
      setShowToast(true);
    }
  };

  useEffect(() => {
    let cancelled = false;
    if (!cancelled) fetchProfile();
    return () => {
      cancelled = true;
    };
  }, [fetchProfile]);

  if (loading) {
    return (
      <div className="text-center py-4">
        <Spinner animation="border" role="status" aria-label="Loading profile" />
        <p>Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="dashboard-content">
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

      {/* Header Section */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="fw-bold mb-0">👨‍🏫 Teacher Profile</h2>
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
                    <span className="badge bg-success fs-6">{profile.role || "N/A"}</span>
                  </div>
                </Col>
                <Col md={6} className="mb-3">
                  <div className="p-3 bg-light rounded">
                    <div className="d-flex align-items-center mb-2">
                      <i className="bi bi-clock text-primary me-2"></i>
                      <strong className="text-muted">Last Login</strong>
                    </div>
                    <h6 className="mb-0">
                      {profile.lastLogin ? new Date(profile.lastLogin).toLocaleDateString() : "Today"}
                    </h6>
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
                <i className="bi bi-graph-up me-2"></i>Teaching Statistics
              </h5>
            </Card.Header>
            <Card.Body>
              <div className="row g-3">
                <div className="col-6">
                  <div className="text-center p-3 bg-primary bg-opacity-10 rounded">
                    <i className="bi bi-journal-bookmark-fill text-primary fs-3"></i>
                    <h3 className="fw-bold text-primary mb-0">{stats.totalClasses}</h3>
                    <small className="text-muted">Classes</small>
                  </div>
                </div>
                <div className="col-6">
                  <div className="text-center p-3 bg-success bg-opacity-10 rounded">
                    <i className="bi bi-people-fill text-success fs-3"></i>
                    <h3 className="fw-bold text-success mb-0">{stats.totalStudents}</h3>
                    <small className="text-muted">Students</small>
                  </div>
                </div>
                <div className="col-6">
                  <div className="text-center p-3 bg-warning bg-opacity-10 rounded">
                    <i className="bi bi-clipboard-check-fill text-warning fs-3"></i>
                    <h3 className="fw-bold text-warning mb-0">{stats.totalExams}</h3>
                    <small className="text-muted">Exams Created</small>
                  </div>
                </div>
                <div className="col-6">
                  <div className="text-center p-3 bg-info bg-opacity-10 rounded">
                    <i className="bi bi-book-fill text-info fs-3"></i>
                    <h3 className="fw-bold text-info mb-0">{stats.totalMaterials || 0}</h3>
                    <small className="text-muted">Materials</small>
                  </div>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Quick Actions removed - settings moved to profile header */}

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

// ================= Teacher Dashboard =================
export default function TeacherDashboard() {
  const location = useLocation();
  const isClassRoute = location.pathname.includes('/teacher/class/');
  const navigate = useNavigate();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(checkAuth());
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState("");
  const [lastAuthCheck, setLastAuthCheck] = useState(0); // Add timestamp for auth caching

  const verifyToken = useCallback(async () => {
    // Skip if we've verified recently (within last 5 minutes)
    const now = Date.now();
    if (now - lastAuthCheck < 5 * 60 * 1000) {
      console.log("⚡ Skipping auth check - recently verified");
      setAuthLoading(false);
      return;
    }

    setAuthLoading(true);
    
    // Add timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      console.log("⏰ Auth verification timeout - proceeding anyway");
      setAuthLoading(false);
    }, 10000); // 10 second timeout

    try {
      // Get the token using our helper function
      const token = getAuthToken();
      
      const res = await retry(() =>
        axios.get(`${API_BASE_URL}/api/profile`, {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 8000 // 8 second request timeout
        })
      );
      
      // Clear timeout since request succeeded
      clearTimeout(timeoutId);
      
      // Check if the user has the correct role
      if (res.data.role !== "Teacher") {
        throw new Error("Access denied: Not a teacher");
      }
      
      // Import helper functions
      const { setAuthData } = await import("../api");
      
      // Update auth data with the fresh information
      setAuthData(token, res.data.username, res.data.role);
      setLastAuthCheck(now); // Update last check timestamp
      console.log("✅ Authentication verified successfully");
    } catch (err) {
      clearTimeout(timeoutId);
      console.error("Auth error:", err.response?.data || err.message);
      setAuthError(err.response?.data?.error || "Authentication failed. Please log in again.");
      setIsAuthenticated(false);
      
      // Import helper function
      const { clearAuthData } = await import("../api");
      
      // Clear all auth data
      clearAuthData();
      
      // Redirect after a short delay
      setTimeout(() => navigate("/"), 3000);
    } finally {
      setAuthLoading(false);
    }
  }, [navigate, lastAuthCheck]);

  useEffect(() => {
    // Only verify token once on component mount, not on every render
    if (isAuthenticated) {
      verifyToken();
    } else {
      setAuthLoading(false);
    }
    // Remove isAuthenticated from dependencies to prevent re-verification on state changes
  }, []); // Empty dependency array - only run once on mount

  if (authLoading) {
    return (
      <div className="text-center py-4">
        <Spinner animation="border" role="status" aria-label="Verifying authentication" />
        <p>Verifying authentication...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    console.log("🔒 Not authenticated, showing login prompt");
    return (
      <div className="container text-center py-5">
        <Alert variant="danger">
          {authError || "You are not authenticated. Redirecting to login..."}
        </Alert>
        <div className="mt-4">
          <Button variant="primary" onClick={() => navigate("/")}>Return to Login</Button>
        </div>
      </div>
    );
  }

  return (
    <Container fluid className="teacher-dashboard-container">
      <Row className="g-0">
        {/* Sidebar for desktop */}
        <Col md={2} className="d-none d-md-block modern-sidebar text-white vh-100 p-3 position-fixed" style={{top: 0, left: 0, zIndex: 1000}}>
          <h4>🏫 Teacher Panel</h4>
          <Nav className="flex-column">
            <Nav.Link
              as={NavLink}
              to="/teacher/dashboard"
              className="nav-link-custom"
              aria-label="Dashboard and Classes"
            >
              🏠 Dashboard & Classes
            </Nav.Link>
            {/* Removed Assignments and Announcements from sidebar to follow per-class stream */}
            {/* Remove Exams from sidebar to merge into class stream */}
            <Nav.Link
              as={NavLink}
              to="/teacher/grades"
              className="nav-link-custom"
              aria-label="Grades"
            >
              📊 Grades
            </Nav.Link>
            <Nav.Link
              as={NavLink}
              to="/teacher/profile"
              className="nav-link-custom"
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
  {/* Mobile Navbar */}
  <div className="d-md-none w-100" style={{position: 'relative', zIndex: 1000}}>
          <Navbar expand="lg" className="modern-mobile-navbar shadow-sm" expanded={mobileNavOpen} onToggle={(val) => setMobileNavOpen(val)}>
            <Container fluid>
              <div className="d-flex align-items-center justify-content-between w-100">
                <Navbar.Brand className="fw-bold fs-4">🏫 Teacher</Navbar.Brand>
                <div className="d-flex align-items-center mobile-toggle-group">
                  {/* Mobile-only notification toggle (sits beside the hamburger) */}
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
                    to="/teacher/dashboard"
                    className="mobile-nav-link"
                    onClick={() => setMobileNavOpen(false)}
                  >
                    Dashboard
                  </Nav.Link>
                  <Nav.Link
                    as={NavLink}
                    to="/teacher/grades"
                    className="mobile-nav-link"
                    onClick={() => setMobileNavOpen(false)}
                  >
                    Grades
                  </Nav.Link>
                  <Nav.Link
                    as={NavLink}
                    to="/teacher/profile"
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
          {/* Top-right notifications (absolute so it doesn't add vertical gap) - single instance used for both desktop and mobile */}
          {/* Desktop-only top-right (keeps original desktop placement) */}
          <div className="d-none d-md-block" style={{ position: 'absolute', top: 12, right: 18, zIndex: 1050 }}>
            <NotificationsDropdown />
          </div>
          {/* Mobile/responsive notifications placement (separate) */}
          {/* mobile notifications are now rendered inside the navbar toggle group so remove the duplicate here */}
          <Routes>
            <Route path="dashboard" element={<DashboardAndClasses />} />
            {/* Removed global Assignments and Announcements to match per-class stream */}
            {/* Removed Exams route; exams are managed within class stream */}
            <Route path="grades" element={<Grades />} />
            <Route path="class/:name" element={<TeacherClassStream />} />
            <Route path="profile" element={<Profile />} />
            {/* Default route - redirect to dashboard */}
            <Route path="*" element={<DashboardAndClasses />} />
          </Routes>
        </Col>
      </Row>
      {/* Logout Confirmation Modal */}
      <Modal
        show={showLogoutModal}
        onHide={() => setShowLogoutModal(false)}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>Confirm Logout</Modal.Title>
        </Modal.Header>
        <Modal.Body>Are you sure you want to log out?</Modal.Body>
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
