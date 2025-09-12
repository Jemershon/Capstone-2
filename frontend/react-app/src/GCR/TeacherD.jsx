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
  Modal,
  Table,
  Form,
  Toast,
} from "react-bootstrap";

// ================= Dashboard & Manage Classes =================
function DashboardAndClasses() {
  const [classes, setClasses] = useState([]);
  const [showCreateClassModal, setShowCreateClassModal] = useState(false);
  const [newClass, setNewClass] = useState({ name: "", section: "" });
  const [user, setUser] = useState({ name: "" });

  useEffect(() => {
    axios.get("http://localhost:4000/api/classes").then(res => setClasses(res.data));
    axios.get("http://localhost:4000/api/profile", {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
    }).then(res => setUser(res.data));
  }, []);

  const handleCreateClass = async (e) => {
    e.preventDefault();
    if (!newClass.name.trim() || !newClass.section.trim()) return;
    const createdClass = await axios.post("http://localhost:4000/api/classes", {
      name: newClass.name,
      section: newClass.section,
      students: 0,
      code: Math.random().toString(36).substring(2, 8).toUpperCase(),
      teacher: user.name,
      bg: "#FFF0D8",
    }, {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
    });
    setClasses([createdClass.data, ...classes]);
    setNewClass({ name: "", section: "" });
    setShowCreateClassModal(false);
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2 className="fw-bold">Dashboard & Manage Classes</h2>
        <Button variant="primary" onClick={() => setShowCreateClassModal(true)}>
          + Create Class
        </Button>
      </div>
      <Table striped bordered hover>
        <thead>
          <tr>
            <th>Class Name</th>
            <th>Section</th>
            <th>Code</th>
            <th>Students</th>
            <th>Teacher</th>
          </tr>
        </thead>
        <tbody>
          {classes.map((cls) => (
            <tr key={cls._id || cls.id}>
              <td>{cls.name}</td>
              <td>{cls.section}</td>
              <td>{cls.code}</td>
              <td>{cls.students}</td>
              <td>{cls.teacher}</td>
            </tr>
          ))}
        </tbody>
      </Table>
      <Modal show={showCreateClassModal} onHide={() => setShowCreateClassModal(false)} centered>
        <Form onSubmit={handleCreateClass}>
          <Modal.Header closeButton>
            <Modal.Title>Create Class</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Class Name</Form.Label>
              <Form.Control
                value={newClass.name}
                onChange={e => setNewClass(c => ({ ...c, name: e.target.value }))}
                placeholder="Enter class name"
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Section</Form.Label>
              <Form.Control
                value={newClass.section}
                onChange={e => setNewClass(c => ({ ...c, section: e.target.value }))}
                placeholder="Enter section"
                required
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowCreateClassModal(false)}>Cancel</Button>
            <Button type="submit" variant="primary" disabled={!newClass.name.trim() || !newClass.section.trim()}>
              Create
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </div>
  );
}

// ================= Assignments =================
function Assignments() {
  const [assignments, setAssignments] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [form, setForm] = useState({
    class: "",
    title: "",
    description: "",
    due: "",
  });

  useEffect(() => {
    axios.get("http://localhost:4000/api/assignments").then(res => setAssignments(res.data));
  }, []);

  const handleCreateAssignment = async (e) => {
    e.preventDefault();
    if (!form.class || !form.title || !form.due) return;
    const created = await axios.post("http://localhost:4000/api/assignments", {
      ...form,
      status: "Pending",
      submittedFile: "",
    }, {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
    });
    setAssignments([created.data, ...assignments]);
    setForm({ class: "", title: "", description: "", due: "" });
    setShowCreateModal(false);
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2 className="fw-bold">Assignments</h2>
        <Button variant="primary" onClick={() => setShowCreateModal(true)}>
          + Create Assignment
        </Button>
      </div>
      <Table striped bordered hover>
        <thead>
          <tr>
            <th>Class</th>
            <th>Title</th>
            <th>Description</th>
            <th>Due</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {assignments.map((a) => (
            <tr key={a._id || a.id}>
              <td>{a.class}</td>
              <td>{a.title}</td>
              <td>{a.description}</td>
              <td>{a.due}</td>
              <td>{a.status}</td>
            </tr>
          ))}
        </tbody>
      </Table>
      <Modal show={showCreateModal} onHide={() => setShowCreateModal(false)} centered>
        <Form onSubmit={handleCreateAssignment}>
          <Modal.Header closeButton>
            <Modal.Title>Create Assignment</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Class</Form.Label>
              <Form.Control
                value={form.class}
                onChange={e => setForm(f => ({ ...f, class: e.target.value }))}
                placeholder="Class name"
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Title</Form.Label>
              <Form.Control
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="Assignment title"
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Description</Form.Label>
              <Form.Control
                as="textarea"
                rows={2}
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Assignment description"
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Due Date</Form.Label>
              <Form.Control
                type="date"
                value={form.due}
                onChange={e => setForm(f => ({ ...f, due: e.target.value }))}
                required
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowCreateModal(false)}>Cancel</Button>
            <Button type="submit" variant="primary" disabled={!form.class || !form.title || !form.due}>
              Create
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </div>
  );
}

// ================= Announcements =================
function Announcements() {
  const [announcements, setAnnouncements] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [form, setForm] = useState({
    teacher: "",
    date: "",
    message: "",
    likes: 0,
    likedByMe: false,
    saved: false,
  });

  useEffect(() => {
    axios.get("http://localhost:4000/api/announcements").then(res => setAnnouncements(res.data));
    axios.get("http://localhost:4000/api/profile", {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
    }).then(res => setForm(f => ({ ...f, teacher: res.data.name })));
  }, []);

  const handleCreateAnnouncement = async (e) => {
    e.preventDefault();
    if (!form.message || !form.date) return;
    const created = await axios.post("http://localhost:4000/api/announcements", form, {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
    });
    setAnnouncements([created.data, ...announcements]);
    setForm({ teacher: form.teacher, date: "", message: "", likes: 0, likedByMe: false, saved: false });
    setShowCreateModal(false);
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2 className="fw-bold">Announcements / Stream</h2>
        <Button variant="primary" onClick={() => setShowCreateModal(true)}>
          + Create Announcement
        </Button>
      </div>
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
      <Modal show={showCreateModal} onHide={() => setShowCreateModal(false)} centered>
        <Form onSubmit={handleCreateAnnouncement}>
          <Modal.Header closeButton>
            <Modal.Title>Create Announcement</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Date</Form.Label>
              <Form.Control
                type="date"
                value={form.date}
                onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Message</Form.Label>
              <Form.Control
                as="textarea"
                rows={2}
                value={form.message}
                onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                placeholder="Announcement message"
                required
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowCreateModal(false)}>Cancel</Button>
            <Button type="submit" variant="primary" disabled={!form.message || !form.date}>
              Create
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </div>
  );
}

// ================= Exams / Quizzes (Google Form Style) =================
function Exams() {
  const [exams, setExams] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    questions: [],
  });
  const [questionText, setQuestionText] = useState("");
  const [questionType, setQuestionType] = useState("short");
  const [options, setOptions] = useState([{ text: "", correct: false }]);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewExam, setPreviewExam] = useState(null);

  useEffect(() => {
    axios.get("http://localhost:4000/api/exams").then(res => setExams(res.data));
  }, []);

  // Add question to form
  const handleAddQuestion = () => {
    if (!questionText.trim()) return;
    const newQuestion = {
      text: questionText,
      type: questionType,
      options:
        questionType === "multiple"
          ? options.filter(opt => opt.text.trim())
          : [],
    };
    setForm((prev) => ({
      ...prev,
      questions: [...prev.questions, newQuestion],
    }));
    setQuestionText("");
    setQuestionType("short");
    setOptions([{ text: "", correct: false }]);
  };

  // Remove question
  const handleRemoveQuestion = (idx) => {
    setForm((prev) => ({
      ...prev,
      questions: prev.questions.filter((_, i) => i !== idx),
    }));
  };

  // Add exam
  const handleCreateExam = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || form.questions.length === 0) return;
    const created = await axios.post("http://localhost:4000/api/exams", form, {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
    });
    setExams([created.data, ...exams]);
    setForm({ title: "", description: "", questions: [] });
    setShowCreateModal(false);
  };

  // Preview exam
  const handlePreviewExam = (exam) => {
    setPreviewExam(exam);
    setShowPreviewModal(true);
  };

  // Handle option text change
  const handleOptionTextChange = (idx, value) => {
    const newOpts = [...options];
    newOpts[idx].text = value;
    setOptions(newOpts);
  };

  // Handle option correct checkbox
  const handleOptionCorrectChange = (idx, checked) => {
    const newOpts = [...options];
    newOpts[idx].correct = checked;
    setOptions(newOpts);
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2 className="fw-bold">Exams / Quizzes</h2>
        <Button variant="primary" onClick={() => setShowCreateModal(true)}>
          + Create Exam / Quiz
        </Button>
      </div>
      <Row className="g-3">
        {exams.map((exam) => (
          <Col md={6} key={exam._id || exam.id}>
            <Card className="h-100 shadow-sm">
              <Card.Body>
                <Card.Title>{exam.title}</Card.Title>
                <Card.Subtitle className="mb-2 text-muted">
                  {exam.questions.length} questions
                </Card.Subtitle>
                <Card.Text className="text-truncate">{exam.description || "No description provided."}</Card.Text>
                <Button size="sm" variant="outline-primary" onClick={() => handlePreviewExam(exam)}>
                  Preview
                </Button>
              </Card.Body>
            </Card>
          </Col>
        ))}
        {exams.length === 0 && (
          <Col xs={12}>
            <Card className="p-4 text-center text-muted">No exams yet. Create one!</Card>
          </Col>
        )}
      </Row>
      {/* Create Exam Modal */}
      <Modal show={showCreateModal} onHide={() => setShowCreateModal(false)} centered size="lg">
        <Form onSubmit={handleCreateExam}>
          <Modal.Header closeButton>
            <Modal.Title>Create Exam / Quiz</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Title</Form.Label>
              <Form.Control
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="Exam or Quiz title"
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Description</Form.Label>
              <Form.Control
                as="textarea"
                rows={2}
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Exam description"
              />
            </Form.Group>
            <hr />
            <h5>Add Questions</h5>
            <Form.Group className="mb-2">
              <Form.Label>Question</Form.Label>
              <Form.Control
                value={questionText}
                onChange={(e) => setQuestionText(e.target.value)}
                placeholder="Enter question"
              />
            </Form.Group>
            <Form.Group className="mb-2">
              <Form.Label>Type</Form.Label>
              <Form.Select
                value={questionType}
                onChange={(e) => setQuestionType(e.target.value)}
                style={{ maxWidth: 200 }}
              >
                <option value="short">Short Answer</option>
                <option value="multiple">Multiple Choice</option>
              </Form.Select>
            </Form.Group>
            {questionType === "multiple" && (
              <div className="mb-2">
                <Form.Label>Options</Form.Label>
                {options.map((opt, idx) => (
                  <div key={idx} className="d-flex align-items-center mb-1">
                    <Form.Control
                      value={opt.text}
                      onChange={(e) => handleOptionTextChange(idx, e.target.value)}
                      placeholder={`Option ${idx + 1}`}
                      style={{ maxWidth: 300 }}
                    />
                    <Form.Check
                      type="checkbox"
                      label="Correct"
                      checked={opt.correct}
                      onChange={e => handleOptionCorrectChange(idx, e.target.checked)}
                      className="ms-2"
                    />
                    <Button
                      variant="outline-danger"
                      size="sm"
                      className="ms-2"
                      onClick={() => setOptions(options.filter((_, i) => i !== idx))}
                      disabled={options.length <= 1}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
                <Button
                  variant="outline-primary"
                  size="sm"
                  onClick={() => setOptions([...options, { text: "", correct: false }])}
                >
                  + Add Option
                </Button>
              </div>
            )}
            <Button
              variant="success"
              className="mt-2"
              onClick={handleAddQuestion}
              disabled={!questionText.trim()}
            >
              Add Question
            </Button>
            <hr />
            <h6>Questions Added</h6>
            {form.questions.length === 0 && (
              <div className="text-muted mb-2">No questions added yet.</div>
            )}
            {form.questions.map((q, idx) => (
              <Card key={idx} className="mb-2">
                <Card.Body>
                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      <strong>Q{idx + 1}:</strong> {q.text}
                      <span className="ms-2 badge bg-info">{q.type === "short" ? "Short Answer" : "Multiple Choice"}</span>
                    </div>
                    <Button variant="outline-danger" size="sm" onClick={() => handleRemoveQuestion(idx)}>
                      Remove
                    </Button>
                  </div>
                  {q.type === "multiple" && (
                    <ul className="mt-2 mb-0">
                      {q.options.map((opt, i) => (
                        <li key={i}>
                          {opt.text}
                          {opt.correct && <span className="ms-2 badge bg-success">Correct</span>}
                        </li>
                      ))}
                    </ul>
                  )}
                </Card.Body>
              </Card>
            ))}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowCreateModal(false)}>Cancel</Button>
            <Button type="submit" variant="primary" disabled={!form.title.trim() || form.questions.length === 0}>
              Create Exam
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
      {/* Preview Exam Modal */}
      <Modal show={showPreviewModal} onHide={() => setShowPreviewModal(false)} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Preview: {previewExam?.title}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p><strong>Description:</strong> {previewExam?.description}</p>
          <hr />
          {previewExam?.questions?.map((q, idx) => (
            <div key={idx} className="mb-3">
              <strong>Q{idx + 1}:</strong> {q.text}
              <div className="mt-1">
                {q.type === "short" ? (
                  <Form.Control disabled placeholder="Short answer" style={{ maxWidth: 400 }} />
                ) : (
                  q.options.map((opt, i) => (
                    <div key={i} className="d-flex align-items-center mb-1">
                      <Form.Check
                        type="checkbox"
                        label={opt.text}
                        checked={opt.correct}
                        disabled
                        style={{ maxWidth: 400 }}
                      />
                      {opt.correct && <span className="ms-2 badge bg-success">Correct</span>}
                    </div>
                  ))
                )}
              </div>
            </div>
          ))}
        </Modal.Body>
      </Modal>
    </div>
  );
}

// ================= Grades =================
function Grades() {
  const [grades, setGrades] = useState([]);
  useEffect(() => {
    axios.get("http://localhost:4000/api/grades").then(res => setGrades(res.data));
  }, []);
  return (
    <div>
      <h2 className="fw-bold">Grades</h2>
      <Table striped bordered hover>
        <thead>
          <tr>
            <th>Class</th>
            <th>Student</th>
            <th>Grade</th>
            <th>Feedback</th>
          </tr>
        </thead>
        <tbody>
          {grades.map((g, idx) => (
            <tr key={idx}>
              <td>{g.class}</td>
              <td>{g.student}</td>
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
    axios.get("http://localhost:4000/api/profile", {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
    }).then(res => setProfile(res.data));
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

// ================= Teacher Dashboard =================
export default function TeacherD() {
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const navigate = useNavigate();

  return (
    <Container fluid>
      <Row>
        {/* Desktop Sidebar */}
        <Col md={2} className="d-none d-md-block bg-dark text-white vh-100 p-3">
          <h4 className="text-center mb-4">Teacher Panel</h4>
          <Nav className="flex-column">
            <Nav.Link as={NavLink} to="/teacher/dashboard" className="nav-link-custom">📊 Dashboard & Classes</Nav.Link>
            <Nav.Link as={NavLink} to="/teacher/assignments" className="nav-link-custom">📝 Assignments</Nav.Link>
            <Nav.Link as={NavLink} to="/teacher/announcements" className="nav-link-custom">📢 Announcements / Stream</Nav.Link>
            <Nav.Link as={NavLink} to="/teacher/exams" className="nav-link-custom">📝 Exams / Quizzes</Nav.Link>
            <Nav.Link as={NavLink} to="/teacher/grades" className="nav-link-custom">🧮 Grades</Nav.Link>
            <Nav.Link as={NavLink} to="/teacher/profile" className="nav-link-custom">👤 Profile</Nav.Link>
            <Nav.Link onClick={() => setShowLogoutModal(true)} className="nav-link-custom text-danger">🚪 Logout</Nav.Link>
          </Nav>
        </Col>
        {/* Mobile Navbar */}
        <Col xs={12} className="d-md-none p-0">
          <Navbar bg="dark" variant="dark" expand="md">
            <Navbar.Brand className="ms-2">Teacher Panel</Navbar.Brand>
            <Navbar.Toggle aria-controls="mobile-nav" />
            <Navbar.Collapse id="mobile-nav">
              <Nav className="flex-column p-2">
                <Nav.Link as={Link} to="/teacher/dashboard" className="text-white">📊 Dashboard & Classes</Nav.Link>
                <Nav.Link as={Link} to="/teacher/assignments" className="text-white">📝 Assignments</Nav.Link>
                <Nav.Link as={Link} to="/teacher/announcements" className="text-white">📢 Announcements / Stream</Nav.Link>
                <Nav.Link as={Link} to="/teacher/exams" className="text-white">📝 Exams / Quizzes</Nav.Link>
                <Nav.Link as={Link} to="/teacher/grades" className="text-white">🧮 Grades</Nav.Link>
                <Nav.Link as={Link} to="/teacher/profile" className="text-white">👤 Profile</Nav.Link>
                <Nav.Link onClick={() => setShowLogoutModal(true)} className="text-danger">🚪 Logout</Nav.Link>
              </Nav>
            </Navbar.Collapse>
          </Navbar>
        </Col>
        {/* Main Content */}
        <Col md={10} xs={12} className="p-4">
          <Routes>
            <Route path="dashboard" element={<DashboardAndClasses />} />
            <Route path="assignments" element={<Assignments />} />
            <Route path="announcements" element={<Announcements />} />
            <Route path="exams" element={<Exams />} />
            <Route path="grades" element={<Grades />} />
            <Route path="profile" element={<Profile />} />
          </Routes>
        </Col>
      </Row>
      {/* Logout Modal */}
      <Modal show={showLogoutModal} onHide={() => setShowLogoutModal(false)} centered>
        <Modal.Header closeButton><Modal.Title>Logout</Modal.Title></Modal.Header>
        <Modal.Body>Are you sure you want to logout?</Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowLogoutModal(false)}>Cancel</Button>
          <Button variant="danger" onClick={() => {
            setShowLogoutModal(false);
            setShowToast(true);
            localStorage.removeItem("token");
            setTimeout(() => {
              setShowToast(false);
              navigate("/");
            }, 1500);
          }}>Logout</Button>
        </Modal.Footer>
      </Modal>
      {/* Toast Notification */}
      <Toast
        show={showToast}
        onClose={() => setShowToast(false)}
        delay={1500}
        autohide
        bg="success"
        style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)", minWidth: "250px", textAlign: "center", zIndex: 9999 }}
      >
        <Toast.Body className="text-white fw-bold">✅ Logged out successfully!</Toast.Body>
      </Toast>
    </Container>
  );
}