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

// Import components
import NotificationsDropdown from "./components/NotificationsDropdown";
import Materials from "./components/Materials";
import Comments from "./components/Comments";
import ExamCreator from "./components/ExamCreator";

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
  const [classData, setClassData] = useState({ name: "", section: "", code: "", bg: "#FFF0D8" });
  const [selectedClass, setSelectedClass] = useState(null);
  const [showManageModal, setShowManageModal] = useState(false);
  const [user, setUser] = useState({ username: "" });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [showToast, setShowToast] = useState(false);
  

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
    if (!classData.name || !classData.section || !classData.code) {
      setError("All fields are required");
      setShowToast(true);
      return;
    }
    try {
      await retry(() =>
        axios.post(
          `${API_BASE_URL}/api/classes`,
          { 
            ...classData, 
            code: classData.code.toUpperCase(),
            teacher: user.username // Use current user's username
          },
          { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
        )
      );
      await fetchData();
      setShowCreateModal(false);
      setClassData({ name: "", section: "", code: "", bg: "#FFF0D8" }); // Remove teacher field
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
              <Card.Footer className="d-flex justify-content-between align-items-center">
                <Button 
                  variant="outline-danger" 
                  size="sm" 
                  aria-label={`Delete class ${cls.name}`}
                  onClick={async () => {
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
                <Button 
                  variant="primary" 
                  size="sm" 
                  aria-label={`Manage class ${cls.name}`}
                  onClick={() => navigate(`/teacher/class/${encodeURIComponent(cls.name)}`)}
                >
                  Manage Class
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
          setClassData({ name: "", section: "", code: "", bg: "#FFF0D8" });
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
              setClassData({ name: "", section: "", code: "", bg: "#FFF0D8" });
              setError("");
            }}
          >
            Cancel
          </Button>
          <Button
            variant="success"
            onClick={handleCreateClass}
            disabled={!classData.name || !classData.section || !classData.code}
            aria-label="Create class"
          >
            Create
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
    questions: [{ text: "", type: "short", options: [], correctAnswer: "" }] 
  });
  const [activeTab, setActiveTab] = useState("stream");
  const [classInfo, setClassInfo] = useState(null);
  const [students, setStudents] = useState([]);
  const [exams, setExams] = useState([]);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
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
        setError("Could not find assignments for this class.");
      } else if (err.response?.data?.error) {
        setError(`Error: ${err.response.data.error}`);
      } else {
        setError(`Failed to load assignments: ${err.message}`);
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
      setExamData({ title: "", description: "", questions: [{ text: "", type: "short", options: [], correctAnswer: "" }] });
      
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
      setError("Exam created successfully!");
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
        <div className="d-flex align-items-center gap-2">
          <Button 
            variant="outline-secondary" 
            size="sm"
            onClick={() => window.navigator.clipboard.writeText(classInfo?.code)}
            title="Copy class code"
          >
            Class Code: {classInfo?.code}
          </Button>
          <NotificationsDropdown />
        </div>
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
            <h5 className="mb-0">Assignments & Exams</h5>
          </div>
          
          {loading ? (
            <div className="text-center p-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
              <p className="mt-2">Loading assignments...</p>
            </div>
          ) : error ? (
            <Alert variant="danger">
              <Alert.Heading>Error loading assignments</Alert.Heading>
              <p>{error}</p>
              <div className="d-flex justify-content-end">
                <Button variant="outline-danger" onClick={fetchExams}>Retry</Button>
              </div>
            </Alert>
          ) : (
            <div className="mb-4">
              {exams && exams.length > 0 ? (
                <Card>
                  <Card.Header>
                    <Nav variant="tabs" defaultActiveKey="active">
                      <Nav.Item>
                        <Nav.Link eventKey="active">Active Assignments</Nav.Link>
                      </Nav.Item>
                      <Nav.Item>
                        <Nav.Link eventKey="graded">Past Assignments</Nav.Link>
                      </Nav.Item>
                    </Nav>
                  </Card.Header>
                  <Card.Body>
                    <ListGroup>
                      {exams.map(exam => (
                        <ListGroup.Item 
                          key={exam._id || `exam-${Math.random()}`}
                          className="d-flex justify-content-between align-items-center"
                        >
                          <div>
                            <h6 className="mb-1">{exam.title || "Untitled Assignment"}</h6>
                            <small className="text-muted">
                              {exam.createdBy && `Posted by ${exam.createdBy}`} 
                              {exam.description && ` • ${exam.description}`}
                              {exam.createdAt && ` • Created: ${new Date(exam.createdAt).toLocaleDateString()}`}
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
                              title="View assignment details"
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
                              title="Edit this assignment"
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
                              title="Delete this assignment"
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
                  <p className="mb-0">No assignments created yet for this class.</p>
                  <p className="mb-0">Click "Create Assignment" to add your first assignment.</p>
                </Alert>
              )}
            </div>
          )}
          
          {/* Exam Creation Modal */}
          <Modal show={showExamModal} onHide={() => setShowExamModal(false)} size="lg">
            <Modal.Header closeButton>
              <Modal.Title>Create New Assignment</Modal.Title>
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
              <Modal.Title>{selectedExam?.title || "Assignment Details"}</Modal.Title>
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
                <Alert variant="warning">No assignment details available</Alert>
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
              <Modal.Title>Edit Assignment</Modal.Title>
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
                <Alert variant="warning">No assignment selected for editing</Alert>
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
                      setError("Assignment title is required");
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
                    setSuccessMessage("Assignment updated successfully");
                    setShowToast(true);
                  } catch (err) {
                    console.error("Error updating exam:", err.response?.data || err.message);
                    setError(err.response?.data?.error || "Failed to update assignment");
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
                  <p>Are you sure you want to delete this assignment?</p>
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
                                <span className={`badge ${submission.finalScore >= 70 ? 'bg-success' : submission.finalScore >= 50 ? 'bg-warning' : 'bg-danger'}`}>
                                  {submission.finalScore.toFixed(1)}%
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
            <Card.Header className="d-flex justify-content-between align-items-center">
              <h5 className="mb-0">Students ({students.length})</h5>
              <Button variant="outline-primary" size="sm" onClick={() => setShowInviteModal(true)}>Invite Students</Button>
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

      {activeTab === "materials" && (
        <Materials className={className} />
      )}

      {/* Exam Creation Modal */}
      <Modal
        show={showExamModal}
        onHide={() => setShowExamModal(false)}
        size="lg"
        centered
      >
        <Modal.Header closeButton>
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
          <Button variant="primary" onClick={handleCreateExam}>
            Create Exam
          </Button>
        </Modal.Footer>
      </Modal>
      
      {/* Invite Students Modal */}
      <Modal
        size="md"
        centered
        show={showInviteModal}
        onHide={() => setShowInviteModal(false)}
      >
        <Modal.Header closeButton>
          <Modal.Title>Invite Students to {className}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Student Email</Form.Label>
              <Form.Control
                type="email"
                placeholder="Enter email address"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
              <Form.Text className="text-muted">
                Enter the email address of the student you want to invite to this class.
              </Form.Text>
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowInviteModal(false)}>Cancel</Button>
          <Button 
            variant="primary" 
            onClick={async () => {
              try {
                if (!inviteEmail) {
                  setError('Email is required');
                  setShowToast(true);
                  return;
                }
                
                // Simulate sending invitation - in a real app, this would send an email
                console.log(`Sending invitation to ${inviteEmail} for class ${className}`);
                
                // Add code here to actually send invitation via API
                // For now we'll just show a success message
                setInviteEmail('');
                setShowInviteModal(false);
                setError('Invitation sent successfully!');
                setShowToast(true);
              } catch (err) {
                console.error('Error sending invitation:', err);
                setError('Failed to send invitation. Please try again.');
                setShowToast(true);
              }
            }}
          >
            Send Invitation
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Remove Student Confirmation Modal */}
      <Modal 
        show={showRemoveModal}
        onHide={() => {
          setShowRemoveModal(false);
          setStudentToRemove(null);
        }}
        centered
      >
        <Modal.Header closeButton>
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

// ================= Grades =================
function Grades() {
  const [grades, setGrades] = useState([]);
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [gradeData, setGradeData] = useState({ class: "", student: "", grade: "", feedback: "" });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [showToast, setShowToast] = useState(false);
  

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${localStorage.getItem("token")}` };
      const [gradesRes, classesRes] = await Promise.all([
        retry(() => axios.get(`${API_BASE_URL}/api/grades?page=1&limit=100`, { headers })),
        retry(() => axios.get(`${API_BASE_URL}/api/classes?page=1&limit=100`, { headers })),
      ]);
      setGrades(gradesRes.data || []);
      setClasses(classesRes.data || []);
      // Derive students from classes (usernames)
      const usernameSet = new Set();
      (classesRes.data || []).forEach((cls) => (cls.students || []).forEach((u) => usernameSet.add(u)));
      setStudents(Array.from(usernameSet));
      
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

  const handleCreateGrade = async () => {
    if (!gradeData.class || !gradeData.student || !gradeData.grade) {
      setError("Class, student, and grade are required");
      setShowToast(true);
      return;
    }
    try {
      await retry(() =>
        axios.post(
          `${API_BASE_URL}/api/grades`,
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
          bg={error.toLowerCase().includes("success") || error.toLowerCase().includes("created") || error.toLowerCase().includes("deleted") || error.toLowerCase().includes("removed") || error.toLowerCase().includes("posted") || error.toLowerCase().includes("assigned") || error.toLowerCase().includes("sent") ? "success" : "danger"}
          style={{ position: "fixed", top: "20px", right: "20px", zIndex: 10000 }}
        >
          <Toast.Body className="text-white">{error}</Toast.Body>
        </Toast>
      )}
      <Button
        variant="outline-primary"
        className="mb-3 me-2"
        onClick={() => setShowCreateModal(true)}
        aria-label="Assign new grade"
      >
        + Assign Grade
      </Button>
      <Button
        variant="outline-secondary"
        className="mb-3"
        onClick={fetchData}
        aria-label="Refresh grades"
      >
        Refresh
      </Button>

      {grades.length === 0 ? (
        <Card className="p-4 text-center text-muted">No grades yet.</Card>
      ) : (
        <Row>
          {grades.map((g, idx) => (
            <Col key={g._id || idx} md={6} lg={4} className="mb-3">
              <Card className="h-100">
                <Card.Body>
                  <div className="d-flex justify-content-between align-items-start">
                    <div>
                      <div className="fw-bold">{g.class}</div>
                      <div className="text-muted" style={{ fontSize: 12 }}>{g.student}</div>
                    </div>
                    <span className="badge bg-primary">{g.grade}</span>
                  </div>
                  {g.feedback && <div className="mt-2" style={{ whiteSpace: "pre-wrap" }}>{g.feedback}</div>}
                </Card.Body>
                <Card.Footer className="d-flex justify-content-end gap-2">
                  <Button
                    variant="outline-danger"
                    size="sm"
                    onClick={async () => {
                      try {
                        await retry(() => axios.delete(`${API_BASE_URL}/api/grades/${g._id || idx}`, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }));
                        await fetchData();
                      } catch (err) {
                        console.error("Delete grade error:", err.response?.data || err.message);
                        setError(err.response?.data?.error || "Failed to delete grade.");
                        setShowToast(true);
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
      )}

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
                {students.map((username) => (
                  <option key={username} value={username}>
                    {username}
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
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [stats, setStats] = useState({
    totalClasses: 0,
    totalStudents: 0,
    totalExams: 0,
    totalAssignments: 0
  });

  const navigate = useNavigate();

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    try {
      const [profileRes, classesRes] = await Promise.all([
        retry(() =>
          axios.get(`${API_BASE_URL}/api/profile`, {
            headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
          })
        ),
        retry(() =>
          axios.get(`${API_BASE_URL}/api/classes?page=1&limit=100`, {
            headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
          })
        )
      ]);
      
      setProfile(profileRes.data);
      setEditData({ name: profileRes.data.name || "", email: profileRes.data.email || "" });
      
      // Calculate statistics
      const classes = classesRes.data || [];
      const totalStudents = classes.reduce((sum, cls) => sum + (cls.students?.length || 0), 0);
      setStats({
        totalClasses: classes.length,
        totalStudents: totalStudents,
        totalExams: 0, // You can add exam counting logic here
        totalAssignments: 0 // You can add assignment counting logic here
      });
      
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
          <Card className="h-100 shadow-sm">
            <Card.Header className="bg-primary text-white">
              <h5 className="mb-0">
                <i className="bi bi-person-circle me-2"></i>Personal Information
              </h5>
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
                      <i className="bi bi-calendar-plus text-primary me-2"></i>
                      <strong className="text-muted">Member Since</strong>
                    </div>
                    <h6 className="mb-0">
                      {profile.createdAt ? new Date(profile.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : "N/A"}
                    </h6>
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
          <Card className="h-100 shadow-sm">
            <Card.Header className="bg-success text-white">
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
                    <small className="text-muted">Exams</small>
                  </div>
                </div>
                <div className="col-6">
                  <div className="text-center p-3 bg-info bg-opacity-10 rounded">
                    <i className="bi bi-file-earmark-text-fill text-info fs-3"></i>
                    <h3 className="fw-bold text-info mb-0">{stats.totalAssignments}</h3>
                    <small className="text-muted">Assignments</small>
                  </div>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Quick Actions */}
      <Card className="shadow-sm">
        <Card.Header className="bg-secondary text-white">
          <h5 className="mb-0">
            <i className="bi bi-lightning-charge me-2"></i>Quick Actions
          </h5>
        </Card.Header>
        <Card.Body>
          <Row>
            <Col md={3} className="mb-3">
              <Button variant="outline-primary" className="w-100 py-3" onClick={() => window.location.href = '/teacher/dashboard'}>
                <i className="bi bi-house-fill d-block fs-3 mb-2"></i>
                Dashboard
              </Button>
            </Col>
            <Col md={3} className="mb-3">
              <Button variant="outline-success" className="w-100 py-3" onClick={() => setShowEditModal(true)}>
                <i className="bi bi-gear-fill d-block fs-3 mb-2"></i>
                Settings
              </Button>
            </Col>
            <Col md={3} className="mb-3">
              <Button variant="outline-info" className="w-100 py-3" onClick={() => fetchProfile()}>
                <i className="bi bi-arrow-clockwise d-block fs-3 mb-2"></i>
                Refresh
              </Button>
            </Col>
            <Col md={3} className="mb-3">
              <Button variant="outline-danger" className="w-100 py-3" onClick={() => setShowLogoutModal(true)}>
                <i className="bi bi-box-arrow-right d-block fs-3 mb-2"></i>
                Logout
              </Button>
            </Col>
          </Row>
        </Card.Body>
      </Card>

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
  const navigate = useNavigate();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showToast, setShowToast] = useState(false);
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
    <Container fluid>
      <Row>
        {/* Sidebar for desktop */}
        <Col md={2} className="d-none d-md-block bg-dark text-white vh-100 p-3 position-fixed" style={{top: 0, left: 0, zIndex: 1000}}>
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
        {/* Mobile navbar */}
        <div className="d-md-none position-fixed w-100" style={{top: 0, zIndex: 1000}}>
          <Navbar bg="dark" variant="dark" expand="md">
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
              {/* Removed Assignments and Announcements from mobile nav to follow per-class stream */}
              {/* Remove Exams from mobile nav */}
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
        </div>
        {/* Main Content */}
        <Col md={10} className="main-content-responsive">
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
