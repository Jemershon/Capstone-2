import React, { useState, useEffect, useCallback } from "react";
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
  Spinner,
  Alert,
} from "react-bootstrap";

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

// ================= Dashboard & Classes =================
function DashboardAndClasses() {
  const [classes, setClasses] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [classData, setClassData] = useState({ name: "", section: "", code: "", teacher: "", bg: "#FFF0D8" });
  const [user, setUser] = useState({ username: "" });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showToast, setShowToast] = useState(false);
  const [debugData, setDebugData] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${localStorage.getItem("token")}` };
      const [classesRes, userRes] = await Promise.all([
        retry(() => axios.get(`${process.env.REACT_APP_API_URL}/api/classes?page=1&limit=100`, { headers })),
        retry(() => axios.get(`${process.env.REACT_APP_API_URL}/api/profile`, { headers })),
      ]);
      setClasses(classesRes.data || []);
      setUser(userRes.data);
      setDebugData({ classes: classesRes.data, user: userRes.data });
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
    if (!classData.name || !classData.section || !classData.code || !classData.teacher) {
      setError("All fields are required");
      setShowToast(true);
      return;
    }
    try {
      await retry(() =>
        axios.post(
          `${process.env.REACT_APP_API_URL}/api/classes`,
          { ...classData, code: classData.code.toUpperCase() },
          { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
        )
      );
      await fetchData();
      setShowCreateModal(false);
      setClassData({ name: "", section: "", code: "", teacher: "", bg: "#FFF0D8" });
      setError("Class created successfully!");
      setShowToast(true);
    } catch (err) {
      console.error("Create class error:", err.response?.data || err.message);
      setError(err.response?.data?.error || "Failed to create class. Check code uniqueness or network.");
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
    <div>
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
          <strong>Debug Info:</strong> Classes: {JSON.stringify(debugData.classes.length)} items, User: {JSON.stringify(debugData.user.username)}
        </Alert>
      )}
      <Row className="mb-4">
        <Col md={4}>
          <Card className="p-3 bg-primary text-white">
            <h5>Total Classes</h5>
            <h3>{classes.length}</h3>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="p-3 bg-success text-white">
            <h5>Total Students</h5>
            <h3>{classes.reduce((acc, cls) => acc + (cls.students?.length || 0), 0)}</h3>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="p-3 bg-warning text-dark">
            <h5>Assignments Posted</h5>
            <h3>{classes.reduce((acc, cls) => acc + (cls.assignments?.length || 0), 0)}</h3>
          </Card>
        </Col>
      </Row>
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
              className="p-3 h-100"
              style={{ backgroundColor: cls.bg || "#FFF0D8", border: "1px solid #ccc", borderRadius: "8px" }}
            >
              <Card.Body>
                <Card.Title className="fw-bold">{cls.name}</Card.Title>
                <Card.Subtitle className="mb-2 text-muted">{cls.section}</Card.Subtitle>
                <p className="mb-1">
                  <strong>Class Code:</strong> {cls.code}
                </p>
                <p className="mb-0">
                  <strong>Students:</strong> {cls.students.length}
                </p>
              </Card.Body>
              <Card.Footer className="text-end">
                <Button variant="primary" size="sm" aria-label={`Manage class ${cls.name}`}>
                  Manage Class
                </Button>
              </Card.Footer>
            </Card>
          </Col>
        ))}
      </Row>
      <Modal
        show={showCreateModal}
        onHide={() => {
          setShowCreateModal(false);
          setClassData({ name: "", section: "", code: "", teacher: "", bg: "#FFF0D8" });
          setError("");
        }}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>Create Class</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Class Name</Form.Label>
              <Form.Control
                type="text"
                value={classData.name}
                onChange={(e) => setClassData({ ...classData, name: e.target.value })}
                placeholder="e.g., Math 101"
                required
                aria-required="true"
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Section</Form.Label>
              <Form.Control
                type="text"
                value={classData.section}
                onChange={(e) => setClassData({ ...classData, section: e.target.value })}
                placeholder="e.g., A"
                required
                aria-required="true"
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Class Code</Form.Label>
              <Form.Control
                type="text"
                value={classData.code}
                onChange={(e) => setClassData({ ...classData, code: e.target.value })}
                placeholder="e.g., ABC123"
                required
                aria-required="true"
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Teacher Name</Form.Label>
              <Form.Control
                type="text"
                value={classData.teacher}
                onChange={(e) => setClassData({ ...classData, teacher: e.target.value })}
                placeholder="e.g., John Doe"
                required
                aria-required="true"
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Background Color</Form.Label>
              <Form.Control
                type="color"
                value={classData.bg}
                onChange={(e) => setClassData({ ...classData, bg: e.target.value })}
                aria-label="Select background color"
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => {
              setShowCreateModal(false);
              setClassData({ name: "", section: "", code: "", teacher: "", bg: "#FFF0D8" });
              setError("");
            }}
          >
            Cancel
          </Button>
          <Button
            variant="success"
            onClick={handleCreateClass}
            disabled={!classData.name || !classData.section || !classData.code || !classData.teacher}
            aria-label="Create class"
          >
            Create
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
  const [showToast, setShowToast] = useState(false);
  const [debugData, setDebugData] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${localStorage.getItem("token")}` };
      const [assignmentsRes, classesRes] = await Promise.all([
        retry(() => axios.get(`${process.env.REACT_APP_API_URL}/api/assignments?page=1&limit=100`, { headers })),
        retry(() => axios.get(`${process.env.REACT_APP_API_URL}/api/classes?page=1&limit=100`, { headers })),
      ]);
      setAssignments(assignmentsRes.data || []);
      setClasses(classesRes.data || []);
      setDebugData({ assignments: assignmentsRes.data, classes: classesRes.data });
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
          `${process.env.REACT_APP_API_URL}/api/assignments`,
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
          bg={error.includes("successfully") ? "success" : "danger"}
          style={{ position: "fixed", top: "20px", right: "20px", zIndex: 10000 }}
        >
          <Toast.Body className="text-white">{error}</Toast.Body>
        </Toast>
      )}
      {debugData && (
        <Alert variant="info" className="mb-4">
          <strong>Debug Info:</strong> Assignments: {JSON.stringify(debugData.assignments.length)} items, Classes: {JSON.stringify(debugData.classes.length)}
        </Alert>
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
  const [showToast, setShowToast] = useState(false);
  const [debugData, setDebugData] = useState(null);

  const fetchAnnouncements = useCallback(async () => {
    setLoading(true);
    try {
      const res = await retry(() =>
        axios.get(`${process.env.REACT_APP_API_URL}/api/announcements?page=1&limit=100`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        })
      );
      setAnnouncements(res.data || []);
      setDebugData({ announcements: res.data });
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
          `${process.env.REACT_APP_API_URL}/api/announcements`,
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
          bg={error.includes("successfully") ? "success" : "danger"}
          style={{ position: "fixed", top: "20px", right: "20px", zIndex: 10000 }}
        >
          <Toast.Body className="text-white">{error}</Toast.Body>
        </Toast>
      )}
      {debugData && (
        <Alert variant="info" className="mb-4">
          <strong>Debug Info:</strong> Announcements: {JSON.stringify(debugData.announcements.length)} items
        </Alert>
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
  const [examData, setExamData] = useState({ title: "", description: "", questions: [{ text: "", type: "short", options: [] }] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showToast, setShowToast] = useState(false);
  const [debugData, setDebugData] = useState(null);

  const fetchExams = useCallback(async () => {
    setLoading(true);
    try {
      const res = await retry(() =>
        axios.get(`${process.env.REACT_APP_API_URL}/api/exams?page=1&limit=100`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        })
      );
      setExams(res.data || []);
      setDebugData({ exams: res.data });
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
      questions: [...examData.questions, { text: "", type: "short", options: [] }],
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
    try {
      await retry(() =>
        axios.post(
          `${process.env.REACT_APP_API_URL}/api/exams`,
          { ...examData, createdBy: localStorage.getItem("username") },
          { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
        )
      );
      await fetchExams();
      setShowCreateModal(false);
      setExamData({ title: "", description: "", questions: [{ text: "", type: "short", options: [] }] });
      setError("Exam created successfully!");
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
          bg={error.includes("successfully") ? "success" : "danger"}
          style={{ position: "fixed", top: "20px", right: "20px", zIndex: 10000 }}
        >
          <Toast.Body className="text-white">{error}</Toast.Body>
        </Toast>
      )}
      {debugData && (
        <Alert variant="info" className="mb-4">
          <strong>Debug Info:</strong> Exams: {JSON.stringify(debugData.exams.length)} items
        </Alert>
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
            <th style={{ width: "25%" }}>Title</th>
            <th style={{ width: "40%" }}>Description</th>
            <th style={{ width: "20%" }}>Created By</th>
            <th style={{ width: "15%" }}>Questions</th>
          </tr>
        </thead>
        <tbody>
          {exams.length === 0 && (
            <tr>
              <td colSpan={4} className="text-center text-muted">
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
          setExamData({ title: "", description: "", questions: [{ text: "", type: "short", options: [] }] });
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
              </div>
            ))}
            <Button variant="outline-secondary" onClick={handleAddQuestion} aria-label="Add another question">
              + Add Question
            </Button>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => {
              setShowCreateModal(false);
              setExamData({ title: "", description: "", questions: [{ text: "", type: "short", options: [] }] });
              setError("");
            }}
          >
            Cancel
          </Button>
          <Button
            variant="success"
            onClick={handleCreateExam}
            disabled={!examData.title || examData.questions.some((q) => !q.text)}
            aria-label="Create exam"
          >
            Create
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}

// ================= Grades =================
function Grades() {
  const [grades, setGrades] = useState([]);
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [gradeData, setGradeData] = useState({ class: "", student: "", grade: "", feedback: "" });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showToast, setShowToast] = useState(false);
  const [debugData, setDebugData] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${localStorage.getItem("token")}` };
      const [gradesRes, classesRes, usersRes] = await Promise.all([
        retry(() => axios.get(`${process.env.REACT_APP_API_URL}/api/grades?page=1&limit=100`, { headers })),
        retry(() => axios.get(`${process.env.REACT_APP_API_URL}/api/classes?page=1&limit=100`, { headers })),
        retry(() => axios.get(`${process.env.REACT_APP_API_URL}/api/admin/users?page=1&limit=100`, { headers })),
      ]);
      setGrades(gradesRes.data || []);
      setClasses(classesRes.data || []);
      setStudents(usersRes.data.filter((u) => u.role === "student") || []);
      setDebugData({ grades: gradesRes.data, classes: classesRes.data, students: usersRes.data });
    } catch (err) {
      console.error("Fetch grades error:", err.response?.data || err.message);
      setError(err.response?.data?.error || "Failed to load grades, classes, or students. Check network or login status.");
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

  const handleCreateGrade = async () => {
    if (!gradeData.class || !gradeData.student || !gradeData.grade) {
      setError("Class, student, and grade are required");
      setShowToast(true);
      return;
    }
    try {
      await retry(() =>
        axios.post(
          `${process.env.REACT_APP_API_URL}/api/grades`,
          gradeData,
          { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
        )
      );
      await fetchData();
      setShowCreateModal(false);
      setGradeData({ class: "", student: "", grade: "", feedback: "" });
      setError("Grade assigned successfully!");
      setShowToast(true);
    } catch (err) {
      console.error("Create grade error:", err.response?.data || err.message);
      setError(err.response?.data?.error || "Failed to assign grade. Check inputs or network.");
      setShowToast(true);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-4">
        <Spinner animation="border" role="status" aria-label="Loading grades" />
        <p>Loading grades...</p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="fw-bold mb-3">Grades</h2>
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
          <strong>Debug Info:</strong> Grades: {JSON.stringify(debugData.grades.length)} items, Classes: {JSON.stringify(debugData.classes.length)}, Students: {JSON.stringify(debugData.students.length)}
        </Alert>
      )}
      <Button
        variant="outline-primary"
        className="mb-3"
        onClick={() => setShowCreateModal(true)}
        aria-label="Assign new grade"
      >
        + Assign Grade
      </Button>
      <Table striped bordered hover responsive style={{ tableLayout: "fixed" }}>
        <thead>
          <tr>
            <th style={{ width: "30%" }}>Class</th>
            <th style={{ width: "20%" }}>Student</th>
            <th style={{ width: "15%" }}>Grade</th>
            <th style={{ width: "35%" }}>Feedback</th>
          </tr>
        </thead>
        <tbody>
          {grades.length === 0 && (
            <tr>
              <td colSpan={4} className="text-center text-muted">
                No grades found. Assign a grade to get started!
              </td>
            </tr>
          )}
          {grades.map((g, idx) => (
            <tr key={g._id || idx}>
              <td>{g.class}</td>
              <td>{g.student}</td>
              <td>{g.grade}</td>
              <td style={{ whiteSpace: "pre-wrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {g.feedback}
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
      <Modal
        show={showCreateModal}
        onHide={() => {
          setShowCreateModal(false);
          setGradeData({ class: "", student: "", grade: "", feedback: "" });
          setError("");
        }}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>Assign Grade</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Class</Form.Label>
              <Form.Select
                value={gradeData.class}
                onChange={(e) => setGradeData({ ...gradeData, class: e.target.value })}
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
              <Form.Label>Student</Form.Label>
              <Form.Select
                value={gradeData.student}
                onChange={(e) => setGradeData({ ...gradeData, student: e.target.value })}
                required
                aria-required="true"
              >
                <option value="">Select Student</option>
                {students.map((s) => (
                  <option key={s._id || s.id} value={s.username}>
                    {s.name} ({s.username})
                  </option>
                ))}
              </Form.Select>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Grade</Form.Label>
              <Form.Control
                type="text"
                value={gradeData.grade}
                onChange={(e) => setGradeData({ ...gradeData, grade: e.target.value })}
                placeholder="e.g., A, B+, 85"
                required
                aria-required="true"
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Feedback</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={gradeData.feedback}
                onChange={(e) => setGradeData({ ...gradeData, feedback: e.target.value })}
                placeholder="Enter feedback"
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => {
              setShowCreateModal(false);
              setGradeData({ class: "", student: "", grade: "", feedback: "" });
              setError("");
            }}
          >
            Cancel
          </Button>
          <Button
            variant="success"
            onClick={handleCreateGrade}
            disabled={!gradeData.class || !gradeData.student || !gradeData.grade}
            aria-label="Assign grade"
          >
            Assign
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}

// ================= Profile =================
function Profile() {
  const [profile, setProfile] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showToast, setShowToast] = useState(false);
  const [debugData, setDebugData] = useState(null);

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    try {
      const res = await retry(() =>
        axios.get(`${process.env.REACT_APP_API_URL}/api/profile`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        })
      );
      setProfile(res.data);
      setDebugData({ profile: res.data });
    } catch (err) {
      console.error("Fetch profile error:", err.response?.data || err.message);
      setError(err.response?.data?.error || "Failed to load profile. Check login status.");
      setShowToast(true);
    } finally {
      setLoading(false);
    }
  }, []);

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
    <div>
      <h2 className="fw-bold">Profile</h2>
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
          <strong>Debug Info:</strong> Profile: {JSON.stringify(debugData.profile.username)}
        </Alert>
      )}
      <Card className="p-3 mt-3">
        <p>
          <strong>Name:</strong> {profile.name || "N/A"}
        </p>
        <p>
          <strong>Username:</strong> {profile.username || "N/A"}
        </p>
        <p>
          <strong>Role:</strong> {profile.role || "N/A"}
        </p>
      </Card>
    </div>
  );
}

// ================= Teacher Dashboard =================
export default function TeacherDashboard() {
  const navigate = useNavigate();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem("token"));
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState("");

  const verifyToken = useCallback(async () => {
    setAuthLoading(true);
    try {
      const res = await retry(() =>
        axios.get(`${process.env.REACT_APP_API_URL}/api/profile`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        })
      );
      if (res.data.role !== "teacher") {
        throw new Error("Access denied: Not a teacher");
      }
      localStorage.setItem("username", res.data.username);
    } catch (err) {
      console.error("Auth error:", err.response?.data || err.message);
      setAuthError(err.response?.data?.error || "Authentication failed. Please log in again.");
      setIsAuthenticated(false);
      localStorage.removeItem("token");
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
    return (
      <div className="container text-center py-5">
        <Alert variant="danger">
          {authError || "You are not authenticated. Redirecting to login..."}
        </Alert>
      </div>
    );
  }

  return (
    <Container fluid>
      <Row>
        {/* Sidebar for desktop */}
        <Col md={2} className="d-none d-md-block bg-dark text-white vh-100 p-3">
          <h4 className="text-center mb-4">Teacher Panel</h4>
          <Nav className="flex-column">
            <Nav.Link
              as={NavLink}
              to="/teacher/dashboard"
              className="nav-link-custom"
              aria-label="Dashboard and Classes"
            >
              🏠 Dashboard & Classes
            </Nav.Link>
            <Nav.Link
              as={NavLink}
              to="/teacher/assignments"
              className="nav-link-custom"
              aria-label="Assignments"
            >
              📝 Assignments
            </Nav.Link>
            <Nav.Link
              as={NavLink}
              to="/teacher/exams"
              className="nav-link-custom"
              aria-label="Exams"
            >
              📚 Exams
            </Nav.Link>
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
              to="/teacher/announcements"
              className="nav-link-custom"
              aria-label="Announcements"
            >
              📢 Announcements / Stream
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
        {/* Mobile navbar */}
        <Navbar bg="dark" variant="dark" expand="md" className="d-md-none">
          <Navbar.Brand className="ms-2">Teacher Panel</Navbar.Brand>
          <Navbar.Toggle aria-controls="mobile-nav" />
          <Navbar.Collapse id="mobile-nav">
            <Nav className="flex-column p-2">
              <Nav.Link
                as={Link}
                to="/teacher/dashboard"
                className="text-white"
                aria-label="Dashboard and Classes"
              >
                🏠 Dashboard & Classes
              </Nav.Link>
              <Nav.Link
                as={Link}
                to="/teacher/assignments"
                className="text-white"
                aria-label="Assignments"
              >
                📝 Assignments
              </Nav.Link>
              <Nav.Link
                as={Link}
                to="/teacher/exams"
                className="text-white"
                aria-label="Exams"
              >
                📚 Exams
              </Nav.Link>
              <Nav.Link
                as={Link}
                to="/teacher/grades"
                className="text-white"
                aria-label="Grades"
              >
                📊 Grades
              </Nav.Link>
              <Nav.Link
                as={Link}
                to="/teacher/announcements"
                className="text-white"
                aria-label="Announcements"
              >
                📢 Announcements / Stream
              </Nav.Link>
              <Nav.Link
                as={Link}
                to="/teacher/profile"
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
        {/* Main Content */}
        <Col md={10} className="p-4">
          <Routes>
            <Route path="dashboard" element={<DashboardAndClasses />} />
            <Route path="assignments" element={<Assignments />} />
            <Route path="exams" element={<Exams />} />
            <Route path="grades" element={<Grades />} />
            <Route path="announcements" element={<Announcements />} />
            <Route path="profile" element={<Profile />} />
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
            onClick={() => {
              setShowLogoutModal(false);
              setShowToast(true);
              localStorage.removeItem("token");
              localStorage.removeItem("username");
              setIsAuthenticated(false);
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