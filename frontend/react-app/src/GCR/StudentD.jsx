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
          axios.get(`${process.env.REACT_APP_API_URL}/api/classes?page=1&limit=100`, { headers })
        ),
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

  const handleJoinClass = async () => {
    if (!joinCode.trim()) {
      setError("Class code is required");
      setShowToast(true);
      return;
    }
    try {
      await retry(() =>
        axios.post(
          `${process.env.REACT_APP_API_URL}/api/classes/join`,
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
                <Button variant="primary" size="sm" aria-label={`Enter class ${cls.name}`}>
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
          axios.get(`${process.env.REACT_APP_API_URL}/api/assignments?page=1&limit=100`, { headers })
        ),
        retry(() => axios.get(`${process.env.REACT_APP_API_URL}/api/classes?page=1&limit=100`, { headers })),
        retry(() => axios.get(`${process.env.REACT_APP_API_URL}/api/profile`, { headers })),
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
          `${process.env.REACT_APP_API_URL}/api/assignments/upload`,
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
          `${process.env.REACT_APP_API_URL}/api/assignments/${selectedAssignment._id}`,
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

// ================= Announcements / Stream =================
function Announcements() {
  const [announcements, setAnnouncements] = useState([]);
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
          bg="danger"
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
                No announcements found. Check with your teacher.
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
        retry(() => axios.get(`${process.env.REACT_APP_API_URL}/api/grades?page=1&limit=100`, { headers })),
        retry(() => axios.get(`${process.env.REACT_APP_API_URL}/api/classes?page=1&limit=100`, { headers })),
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
        axios.get(`${process.env.REACT_APP_API_URL}/api/profile`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        })
      );
      if (res.data.role !== "student") {
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
        <Col md={2} className="d-none d-md-block bg-dark text-white vh-100 p-3">
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
            <Nav.Link
              as={NavLink}
              to="/student/assignments"
              className="nav-link-custom"
              aria-label="Assignments"
            >
              📝 Assignments
            </Nav.Link>
            <Nav.Link
              as={NavLink}
              to="/student/grades"
              className="nav-link-custom"
              aria-label="Grades"
            >
              📊 Grades
            </Nav.Link>
            <Nav.Link
              as={NavLink}
              to="/student/announcements"
              className="nav-link-custom"
              aria-label="Announcements"
            >
              📢 Announcements / Stream
            </Nav.Link>
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
        <Navbar bg="dark" variant="dark" expand="md" className="d-md-none">
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
                to="/student/assignments"
                className="text-white"
                aria-label="Assignments"
              >
                📝 Assignments
              </Nav.Link>
              <Nav.Link
                as={Link}
                to="/student/grades"
                className="text-white"
                aria-label="Grades"
              >
                📊 Grades
              </Nav.Link>
              <Nav.Link
                as={Link}
                to="/student/announcements"
                className="text-white"
                aria-label="Announcements"
              >
                📢 Announcements / Stream
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