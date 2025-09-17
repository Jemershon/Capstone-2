import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { API_BASE_URL } from "../api";
import { NavLink, Link, Routes, Route, useNavigate, useParams } from "react-router-dom";
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
  ProgressBar,
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
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinCode, setJoinCode] = useState("");
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
        retry(() =>
          axios.get(`${API_BASE_URL}/api/student/classes?page=1&limit=100`, { headers })
        ),
        retry(() => axios.get(`${API_BASE_URL}/api/profile`, { headers })),
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

  const handleJoinClass = async () => {
    if (!joinCode.trim()) {
      setError("Class code is required");
      setShowToast(true);
      return;
    }
    try {
      await retry(() =>
        axios.post(
          `${API_BASE_URL}/api/classes/join`,
          { code: joinCode.toUpperCase() },
          { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
        )
      );
      await fetchData();
      setShowJoinModal(false);
      setJoinCode("");
      setError("Joined class successfully!");
      setShowToast(true);
    } catch (err) {
      console.error("Join class error:", err.response?.data || err.message);
      setError(err.response?.data?.error || "Failed to join class. Check code or network.");
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
            <h5>Assignments Due</h5>
            <h3>{classes.reduce((acc, cls) => acc + (cls.assignments?.length || 0), 0)}</h3>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="p-3 bg-warning text-dark">
            <h5>Quizzes Pending</h5>
            <h3>{classes.reduce((acc, cls) => acc + (cls.exams?.length || 0), 0)}</h3>
          </Card>
        </Col>
      </Row>
      <h4 className="fw-bold mb-3 d-flex justify-content-between align-items-center">
        <span>Your enrolled classes:</span>
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
              No classes enrolled. Join a class using a code!
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
                <Card.Subtitle className="mb-2 text-muted">{cls.teacher}</Card.Subtitle>
                <p className="mb-1">
                  <strong>Class Code:</strong> {cls.code}
                </p>
                <p className="mb-0">
                  <strong>Students:</strong> {cls.students.length}
                </p>
              </Card.Body>
              <Card.Footer className="text-end">
                <Button 
                  variant="primary" 
                  size="sm" 
                  as={Link}
                  to={`/student/class/${encodeURIComponent(cls.name)}`}
                  aria-label={`Enter class ${cls.name}`}
                >
                  Enter Class
                </Button>
              </Card.Footer>
            </Card>
          </Col>
        ))}
      </Row>
      <Modal
        show={showJoinModal}
        onHide={() => {
          setShowJoinModal(false);
          setJoinCode("");
          setError("");
        }}
        centered
      >
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
              required
              aria-required="true"
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => {
              setShowJoinModal(false);
              setJoinCode("");
              setError("");
            }}
          >
            Cancel
          </Button>
          <Button
            variant="success"
            onClick={handleJoinClass}
            disabled={!joinCode.trim()}
            aria-label="Join class"
          >
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
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [submitFile, setSubmitFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [showToast, setShowToast] = useState(false);
  const [user, setUser] = useState({ username: "" });
  const [uploadProgress, setUploadProgress] = useState(0);
  const [debugData, setDebugData] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${localStorage.getItem("token")}` };
      const [assignmentsRes, classesRes, userRes] = await Promise.all([
        retry(() =>
          axios.get(`${API_BASE_URL}/api/student/assignments?page=1&limit=100`, { headers })
        ),
        retry(() => axios.get(`${API_BASE_URL}/api/student/classes?page=1&limit=100`, { headers })),
        retry(() => axios.get(`${API_BASE_URL}/api/profile`, { headers })),
      ]);
      setAssignments(assignmentsRes.data || []);
      setClasses(classesRes.data || []);
      setUser(userRes.data);
      setDebugData({ assignments: assignmentsRes.data, classes: classesRes.data, user: userRes.data });
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

  const handleOpenSubmit = (assignment) => {
    setSelectedAssignment(assignment);
    setShowSubmitModal(true);
    setSubmitFile(null);
    setError("");
    setUploadProgress(0);
  };

  const handleSubmitAssignment = async () => {
    if (!submitFile) {
      setError("Please select a file to submit");
      setShowToast(true);
      return;
    }
    if (submitFile.size > 5 * 1024 * 1024) {
      setError("File size exceeds 5MB limit");
      setShowToast(true);
      return;
    }
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("file", submitFile);
      const uploadRes = await retry(() =>
        axios.post(
          `${API_BASE_URL}/api/assignments/upload`,
          formData,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
              "Content-Type": "multipart/form-data",
            },
            onUploadProgress: (progressEvent) => {
              const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
              setUploadProgress(percent);
            },
          }
        )
      );
      await retry(() =>
        axios.put(
          `${API_BASE_URL}/api/assignments/${selectedAssignment._id}`,
          {
            status: "Submitted",
            submittedFile: uploadRes.data.filename,
            studentUsername: user.username,
          },
          { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
        )
      );
      await fetchData();
      setShowSubmitModal(false);
      setSubmitFile(null);
      setUploadProgress(0);
      setError("Assignment submitted successfully!");
      setShowToast(true);
    } catch (err) {
      console.error("Submit assignment error:", err.response?.data || err.message);
      setError(err.response?.data?.error || "Failed to submit assignment. Check file or network.");
      setShowToast(true);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredAssignments = selectedClass
    ? assignments.filter((a) => a.class === selectedClass)
    : assignments;

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
      <Form.Group className="mb-3" style={{ maxWidth: 300 }}>
        <Form.Label>Filter by Class</Form.Label>
        <Form.Select
          value={selectedClass}
          onChange={(e) => setSelectedClass(e.target.value)}
          aria-label="Filter assignments by class"
        >
          <option value="">All Classes</option>
          {classes.map((cls) => (
            <option key={cls._id || cls.id} value={cls.name}>
              {cls.name}
            </option>
          ))}
        </Form.Select>
      </Form.Group>
      <Table striped bordered hover responsive style={{ tableLayout: "fixed" }}>
        <thead>
          <tr>
            <th style={{ width: "15%" }}>Class</th>
            <th style={{ width: "15%" }}>Task</th>
            <th style={{ width: "25%" }}>Description</th>
            <th style={{ width: "15%" }}>Due</th>
            <th style={{ width: "15%" }}>Status</th>
            <th style={{ width: "15%" }}>Submission</th>
            <th style={{ width: "15%" }}>Action</th>
          </tr>
        </thead>
        <tbody>
          {filteredAssignments.length === 0 ? (
            <tr>
              <td colSpan={7} className="text-center text-muted">
                No assignments found. Try joining a class or checking another class.
              </td>
            </tr>
          ) : (
            filteredAssignments.map((a) => (
              <tr key={a._id || a.id}>
                <td>{a.class}</td>
                <td>{a.title}</td>
                <td style={{ whiteSpace: "pre-wrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {a.description}
                </td>
                <td>{new Date(a.due).toLocaleDateString()}</td>
                <td className={a.status === "Submitted" ? "text-success" : "text-warning"}>
                  {a.status}
                </td>
                <td>
                  {a.submittedFile ? (
                    <span className="badge bg-success">{a.submittedFile}</span>
                  ) : (
                    <span className="text-muted">Not submitted</span>
                  )}
                </td>
                <td>
                  {a.status === "Pending" ? (
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => handleOpenSubmit(a)}
                      aria-label={`Submit assignment ${a.title}`}
                    >
                      Submit
                    </Button>
                  ) : (
                    <span className="text-success">Done</span>
                  )}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </Table>
      <Modal
        show={showSubmitModal}
        onHide={() => {
          setShowSubmitModal(false);
          setSubmitFile(null);
          setError("");
          setUploadProgress(0);
        }}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>Submit Assignment</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedAssignment && (
            <>
              <p>
                <strong>Task:</strong> {selectedAssignment.title}
              </p>
              <p>
                <strong>Description:</strong> {selectedAssignment.description}
              </p>
              <p>
                <strong>Due:</strong> {new Date(selectedAssignment.due).toLocaleDateString()}
              </p>
              <Form.Group className="mb-3">
                <Form.Label>Upload your work</Form.Label>
                <Form.Control
                  type="file"
                  onChange={(e) => setSubmitFile(e.target.files[0])}
                  accept="image/jpeg,image/png,application/pdf"
                  aria-label="Upload assignment file"
                />
                <Form.Text className="text-muted">
                  Only JPEG, PNG, or PDF files up to 5MB are allowed.
                </Form.Text>
              </Form.Group>
              {uploadProgress > 0 && (
                <ProgressBar now={uploadProgress} label={`${uploadProgress}%`} className="mt-2" />
              )}
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => {
              setShowSubmitModal(false);
              setSubmitFile(null);
              setError("");
              setUploadProgress(0);
            }}
          >
            Cancel
          </Button>
          <Button
            variant="success"
            onClick={handleSubmitAssignment}
            disabled={!submitFile || submitting}
            aria-label="Submit assignment"
          >
            {submitting ? (
              <>
                <Spinner
                  as="span"
                  animation="border"
                  size="sm"
                  role="status"
                  aria-hidden
                />
                <span className="ms-2">Submitting...</span>
              </>
            ) : (
              "Submit"
            )}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}

// ================= Student Class Stream (per class) =================
function StudentClassStream() {
  const { name } = useParams();
  const className = decodeURIComponent(name || "");
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showToast, setShowToast] = useState(false);
  const [showExamModal, setShowExamModal] = useState(false);
  const [activeExam, setActiveExam] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [submittedExamIds, setSubmittedExamIds] = useState({});

  const fetchAnnouncements = useCallback(async () => {
    setLoading(true);
    try {
      const res = await retry(() =>
        axios.get(`${API_BASE_URL}/api/student/announcements?page=1&limit=100&className=${encodeURIComponent(className)}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        })
      );
      setAnnouncements(res.data || []);
    } catch (err) {
      console.error("Fetch announcements error:", err.response?.data || err.message);
      setError(err.response?.data?.error || "Failed to load class stream.");
      setShowToast(true);
    } finally {
      setLoading(false);
    }
  }, [className]);

  const checkSubmitted = useCallback(async (examId) => {
    try {
      // try to fetch exam submissions by this student; endpoint denies listing for students, so infer by 400 on submit attempt
      // simpler approach: query exam and ignore; backend prevents retake on submit
      return submittedExamIds[examId] === true;
    } catch {
      return false;
    }
  }, [submittedExamIds]);

  useEffect(() => {
    let cancelled = false;
    if (!cancelled) fetchAnnouncements();
    return () => {
      cancelled = true;
    };
  }, [fetchAnnouncements]);

  const openTakeExam = async (examId) => {
    if (await checkSubmitted(examId)) return; // block if already submitted
    try {
      const res = await retry(() =>
        axios.get(`${API_BASE_URL}/api/exams/${examId}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        })
      );
      const exam = res.data;
      setActiveExam(exam);
      setAnswers(exam.questions.map(() => ""));
      setShowExamModal(true);
    } catch (err) {
      console.error("Load exam error:", err.response?.data || err.message);
      setError(err.response?.data?.error || "Failed to load exam.");
      setShowToast(true);
    }
  };

  const submitExam = async () => {
    if (!activeExam) return;
    setSubmitting(true);
    try {
      const payload = { answers: answers.map((ans, idx) => ({ questionIndex: idx, answer: ans })) };
      await retry(() =>
        axios.post(`${API_BASE_URL}/api/exams/${activeExam._id}/submit`, payload, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        })
      );
      setShowExamModal(false);
      setActiveExam(null);
      setAnswers([]);
      setSubmittedExamIds((prev) => ({ ...prev, [activeExam._id]: true }));
      await fetchAnnouncements();
    } catch (err) {
      console.error("Submit exam error:", err.response?.data || err.message);
      setError(err.response?.data?.error || "Failed to submit exam.");
      setShowToast(true);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-4">
        <Spinner animation="border" role="status" aria-label="Loading class stream" />
        <p>Loading class stream...</p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="fw-bold mb-3">{className} — Stream</h2>
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

      {announcements.length === 0 ? (
        <Card className="p-4 text-center text-muted">No posts yet.</Card>
      ) : (
        announcements.map((a) => (
          <Card key={a._id || a.id} className="mb-3">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-start">
                <div>
                  <div className="fw-bold">{a.teacher}</div>
                  <div className="text-muted" style={{ fontSize: 12 }}>{new Date(a.date).toLocaleString()}</div>
                </div>
                {a.examId && submittedExamIds[a.examId] && (
                  <span className="badge bg-success">Submitted</span>
                )}
              </div>
              <div className="mt-2" style={{ whiteSpace: "pre-wrap" }}>{a.message}</div>
              {a.examId && !submittedExamIds[a.examId] && (
                <div className="mt-3">
                  <Button variant="primary" onClick={() => openTakeExam(a.examId)} aria-label="Take exam">Take Exam</Button>
                </div>
              )}
            </Card.Body>
          </Card>
        ))
      )}

      <Modal show={showExamModal} onHide={() => setShowExamModal(false)} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title>{activeExam ? activeExam.title : "Exam"}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {activeExam && (
            <>
              {activeExam.description && <p className="text-muted">{activeExam.description}</p>}
              {activeExam.questions.map((q, idx) => (
                <div key={idx} className="mb-3 p-3 border rounded">
                  <div className="fw-bold mb-2">Q{idx + 1}. {q.text}</div>
                  {q.type === "multiple" ? (
                    <div>
                      {(q.options || []).map((opt, i) => (
                        <Form.Check
                          key={i}
                          type="radio"
                          id={`q${idx}-opt${i}`}
                          name={`q${idx}`}
                          label={opt}
                          checked={answers[idx] === opt}
                          onChange={() => {
                            const next = [...answers];
                            next[idx] = opt;
                            setAnswers(next);
                          }}
                        />
                      ))}
                    </div>
                  ) : (
                    <Form.Control
                      type="text"
                      value={answers[idx]}
                      onChange={(e) => {
                        const next = [...answers];
                        next[idx] = e.target.value;
                        setAnswers(next);
                      }}
                      placeholder="Your answer"
                    />
                  )}
                </div>
              ))}
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowExamModal(false)}>Cancel</Button>
          <Button variant="success" onClick={submitExam} disabled={submitting}>{submitting ? "Submitting..." : "Submit"}</Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}

// ================= Grades =================
function Grades() {
  const [grades, setGrades] = useState([]);
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showToast, setShowToast] = useState(false);
  const [debugData, setDebugData] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${localStorage.getItem("token")}` };
      const [gradesRes, classesRes] = await Promise.all([
        retry(() => axios.get(`${API_BASE_URL}/api/student/grades?page=1&limit=100`, { headers })),
        retry(() => axios.get(`${API_BASE_URL}/api/student/classes?page=1&limit=100`, { headers })),
      ]);
      setGrades(gradesRes.data || []);
      setClasses(classesRes.data || []);
      setDebugData({ grades: gradesRes.data, classes: classesRes.data });
    } catch (err) {
      console.error("Fetch grades error:", err.response?.data || err.message);
      setError(err.response?.data?.error || "Failed to load grades or classes. Check network or login status.");
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

  const filteredGrades = selectedClass
    ? grades.filter((g) => g.class === selectedClass)
    : grades;

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
          bg="danger"
          style={{ position: "fixed", top: "20px", right: "20px", zIndex: 10000 }}
        >
          <Toast.Body className="text-white">{error}</Toast.Body>
        </Toast>
      )}
      {debugData && (
        <Alert variant="info" className="mb-4">
          <strong>Debug Info:</strong> Grades: {JSON.stringify(debugData.grades.length)} items, Classes: {JSON.stringify(debugData.classes.length)}
        </Alert>
      )}
      <Form.Group className="mb-3" style={{ maxWidth: 300 }}>
        <Form.Label>Filter by Class</Form.Label>
        <Form.Select
          value={selectedClass}
          onChange={(e) => setSelectedClass(e.target.value)}
          aria-label="Filter grades by class"
        >
          <option value="">All Classes</option>
          {classes.map((cls) => (
            <option key={cls._id || cls.id} value={cls.name}>
              {cls.name}
            </option>
          ))}
        </Form.Select>
      </Form.Group>
      <Table striped bordered hover responsive style={{ tableLayout: "fixed" }}>
        <thead>
          <tr>
            <th style={{ width: "30%" }}>Class</th>
            <th style={{ width: "20%" }}>Grade</th>
            <th style={{ width: "50%" }}>Feedback</th>
          </tr>
        </thead>
        <tbody>
          {filteredGrades.length === 0 && (
            <tr>
              <td colSpan={3} className="text-center text-muted">
                No grades found. Try selecting a class or check with your teacher.
              </td>
            </tr>
          )}
          {filteredGrades.map((g, idx) => (
            <tr key={g._id || idx}>
              <td>{g.class}</td>
              <td>{g.grade}</td>
              <td style={{ whiteSpace: "pre-wrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {g.feedback}
              </td>
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showToast, setShowToast] = useState(false);
  const [debugData, setDebugData] = useState(null);

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    try {
      const res = await retry(() =>
        axios.get(`${API_BASE_URL}/api/profile`, {
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
      <Card className="p-3 mt-3">
        <h5 className="mb-2">Credit Points</h5>
        <p className="mb-0" style={{ fontSize: 24 }}>
          <strong>{profile.creditPoints ?? 0}</strong>
        </p>
        <small className="text-muted">Earn +1 for early submit, −2 for late. Used to fill exam gaps.</small>
      </Card>
    </div>
  );
}

// ================= Student Dashboard =================
export default function StudentDashboard() {
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
        axios.get(`${API_BASE_URL}/api/profile`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        })
      );
      if (res.data.role !== "Student") {
        throw new Error("Access denied: Not a student");
      }
    } catch (err) {
      console.error("Auth error:", err.response?.data || err.message);
      setAuthError(err.response?.data?.error || "Authentication failed. Please log in again.");
      setIsAuthenticated(false);
      localStorage.removeItem("token");
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
        <Col md={2} className="d-none d-md-block bg-dark text-white vh-100 p-3 position-fixed" style={{top: 0, left: 0, zIndex: 1000}}>
          <h4 className="text-center mb-4">Student Panel</h4>
          <Nav className="flex-column">
            <Nav.Link
              as={NavLink}
              to="/student/dashboard"
              className="nav-link-custom"
              aria-label="Dashboard and Classes"
            >
              🏠 Dashboard & Classes
            </Nav.Link>
            {/* Removed Assignments and Announcements links for per-class stream */}
            {/* Remove Grades from student sidebar */}
            <Nav.Link
              as={NavLink}
              to="/student/profile"
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
              {/* Removed Assignments and Announcements from mobile nav */}
              {/* Remove Grades from student mobile nav */}
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
            <Route path="dashboard" element={<DashboardAndClasses />} />
            {/* Removed global Assignments and Announcements; use class stream */}
            {/* Removed Grades route so only teachers see grades */}
            <Route path="class/:name" element={<StudentClassStream />} />
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