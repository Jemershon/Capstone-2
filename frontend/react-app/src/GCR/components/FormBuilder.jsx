import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import { 
  Container, Row, Col, Card, Button, Form, Modal, 
  ListGroup, Badge, Tabs, Tab, Alert, Spinner 
} from "react-bootstrap";
import { API_BASE_URL } from "../../api";

const FormBuilder = () => {
  const navigate = useNavigate();
  const { formId } = useParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  
  // Form state
  const [form, setForm] = useState({
    title: "",
    description: "",
    questions: [],
    sections: [],
    examHeader: {
      subject: "",
      teacher: "",
      semester: "",
      schoolYear: "",
      examDate: "",
      duration: 60,
      totalItems: 0,
      totalPoints: 0,
      passingScore: 50,
    },
    settings: {
      isQuiz: false,
      autoGrade: false,
      showCorrectAnswers: false,
      allowMultipleSubmissions: false,
      collectEmail: true,
      requireLogin: true,
      shuffleQuestions: false,
      shuffleAnswers: false,
      acceptingResponses: true,
      confirmationMessage: "Your response has been recorded.",
      usePhilippineStyle: false, // Toggle for Philippine exam format
    },
    theme: {
      primaryColor: "#a30c0c",
      backgroundColor: "#ffffff",
    },
    status: "draft",
  });
  
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [showSectionModal, setShowSectionModal] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [editingSection, setEditingSection] = useState(null);
  const [currentSection, setCurrentSection] = useState({
    title: "",
    instructions: "",
    pointsPerItem: 1,
    order: 0,
  });
  const [currentQuestion, setCurrentQuestion] = useState({
    type: "short_answer",
    title: "",
    description: "",
    required: false,
    options: [],
    sectionId: "",
    matchingPairs: [],
    enumerationAnswers: [],
    expectedCount: 5,
    scaleMin: 1,
    scaleMax: 5,
    scaleMinLabel: "",
    scaleMaxLabel: "",
    correctAnswer: "",
    points: 1,
    conditionalLogic: {
      enabled: false,
      showIf: {
        questionId: "",
        operator: "equals",
        value: "",
      },
    },
  });
  
  const questionTypes = [
    { value: "short_answer", label: "Short Answer", icon: "📝" },
    { value: "paragraph", label: "Paragraph / Essay", icon: "📄" },
    { value: "multiple_choice", label: "Multiple Choice", icon: "🔘" },
    { value: "checkboxes", label: "Checkboxes", icon: "☑️" },
    { value: "dropdown", label: "Dropdown", icon: "📋" },
    { value: "true_false", label: "True or False", icon: "✓✗", philippine: true },
    { value: "identification", label: "Identification", icon: "🔤", philippine: true },
    { value: "enumeration", label: "Enumeration", icon: "📝", philippine: true },
    { value: "matching_type", label: "Matching Type", icon: "🔗", philippine: true },
    { value: "linear_scale", label: "Linear Scale", icon: "📊" },
    { value: "date", label: "Date", icon: "📅" },
    { value: "time", label: "Time", icon: "🕐" },
    { value: "file_upload", label: "File Upload", icon: "📎" },
  ];
  
  // Load form if editing
  useEffect(() => {
    if (formId) {
      loadForm();
    }
  }, [formId]);
  
  const loadForm = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/api/forms/${formId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      setForm(response.data);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to load form");
    } finally {
      setLoading(false);
    }
  };
  
  const handleSaveForm = async (publish = false) => {
    try {
      setLoading(true);
      const formData = {
        ...form,
        status: publish ? "published" : form.status,
      };
      
      if (formId) {
        await axios.put(`${API_BASE_URL}/api/forms/${formId}`, formData, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        setSuccess("Form updated successfully!");
      } else {
        const response = await axios.post(`${API_BASE_URL}/api/forms`, formData, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        setSuccess("Form created successfully!");
        navigate(`/teacher/forms/${response.data._id}/edit`);
      }
    } catch (err) {
      setError(err.response?.data?.error || "Failed to save form");
    } finally {
      setLoading(false);
    }
  };
  
  const handleAddQuestion = () => {
    setEditingQuestion(null);
    setCurrentQuestion({
      type: "short_answer",
      title: "",
      description: "",
      required: false,
      options: [],
      sectionId: "",
      matchingPairs: [],
      enumerationAnswers: [],
      expectedCount: 5,
      scaleMin: 1,
      scaleMax: 5,
      scaleMinLabel: "",
      scaleMaxLabel: "",
      correctAnswer: "",
      points: 1,
      conditionalLogic: {
        enabled: false,
        showIf: {
          questionId: "",
          operator: "equals",
          value: "",
        },
      },
    });
    setShowQuestionModal(true);
  };
  
  const handleEditQuestion = (index) => {
    setEditingQuestion(index);
    setCurrentQuestion(form.questions[index]);
    setShowQuestionModal(true);
  };
  
  const handleSaveQuestion = () => {
    const newQuestions = [...form.questions];
    if (editingQuestion !== null) {
      newQuestions[editingQuestion] = { ...currentQuestion, order: editingQuestion };
    } else {
      newQuestions.push({ ...currentQuestion, order: newQuestions.length });
    }
    setForm({ ...form, questions: newQuestions });
    setShowQuestionModal(false);
  };
  
  const handleDeleteQuestion = (index) => {
    if (window.confirm("Delete this question?")) {
      const newQuestions = form.questions.filter((_, i) => i !== index);
      setForm({ ...form, questions: newQuestions });
    }
  };
  
  const handleDuplicateQuestion = (index) => {
    const newQuestions = [...form.questions];
    newQuestions.splice(index + 1, 0, { ...form.questions[index] });
    setForm({ ...form, questions: newQuestions });
  };
  
  const handleMoveQuestion = (index, direction) => {
    const newQuestions = [...form.questions];
    const temp = newQuestions[index];
    newQuestions[index] = newQuestions[index + direction];
    newQuestions[index + direction] = temp;
    setForm({ ...form, questions: newQuestions });
  };
  
  // Section management functions
  const handleAddSection = () => {
    setEditingSection(null);
    setCurrentSection({
      title: "",
      instructions: "",
      pointsPerItem: 1,
      order: form.sections?.length || 0,
    });
    setShowSectionModal(true);
  };
  
  const handleEditSection = (index) => {
    setEditingSection(index);
    setCurrentSection(form.sections[index]);
    setShowSectionModal(true);
  };
  
  const handleSaveSection = () => {
    const newSections = [...(form.sections || [])];
    if (editingSection !== null) {
      newSections[editingSection] = { ...currentSection };
    } else {
      newSections.push({ ...currentSection, order: newSections.length });
    }
    setForm({ ...form, sections: newSections });
    setShowSectionModal(false);
  };
  
  const handleDeleteSection = (index) => {
    if (window.confirm("Delete this section? Questions in this section will remain but won't be grouped.")) {
      const sectionId = form.sections[index]._id || form.sections[index].order;
      const newSections = form.sections.filter((_, i) => i !== index);
      // Remove sectionId from questions
      const updatedQuestions = form.questions.map(q => 
        q.sectionId === sectionId ? { ...q, sectionId: "" } : q
      );
      setForm({ ...form, sections: newSections, questions: updatedQuestions });
    }
  };
  
  if (loading) {
    return (
      <Container className="text-center py-5">
        <Spinner animation="border" />
        <p className="mt-2">Loading...</p>
      </Container>
    );
  }
  
  return (
    <Container fluid className="py-4">
      <Row>
        <Col lg={8} className="mx-auto">
          {/* Header */}
          <Card className="mb-3 shadow-sm">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h2 className="mb-0">
                  {formId ? "Edit Form" : "Create New Form"}
                </h2>
                <div className="d-flex gap-2">
                  <Button variant="outline-secondary" onClick={() => navigate(-1)}>
                    Cancel
                  </Button>
                  <Button variant="outline-primary" onClick={() => handleSaveForm(false)}>
                    💾 Save Draft
                  </Button>
                  <Button variant="primary" onClick={() => handleSaveForm(true)}>
                    🚀 Publish
                  </Button>
                </div>
              </div>
              
              {error && <Alert variant="danger" dismissible onClose={() => setError("")}>{error}</Alert>}
              {success && <Alert variant="success" dismissible onClose={() => setSuccess("")}>{success}</Alert>}
              
              <Form.Group className="mb-3">
                <Form.Label>Form Title *</Form.Label>
                <Form.Control
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Untitled Form"
                  required
                />
              </Form.Group>
              
              <Form.Group className="mb-3">
                <Form.Label>Description</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={2}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Add a description for your form..."
                />
              </Form.Group>
            </Card.Body>
          </Card>
          
          {/* Sections (Philippine Style) */}
          {form.settings.usePhilippineStyle && (
            <Card className="mb-3 shadow-sm border-primary">
              <Card.Header className="bg-light d-flex justify-content-between align-items-center">
                <div>
                  <h5 className="mb-0">📑 Exam Sections ({(form.sections || []).length})</h5>
                  <small className="text-muted">Organize your exam into parts (Part I, Part II, etc.)</small>
                </div>
                <Button variant="primary" size="sm" onClick={handleAddSection}>
                  ➕ Add Section
                </Button>
              </Card.Header>
              <Card.Body>
                {(!form.sections || form.sections.length === 0) ? (
                  <div className="text-center text-muted py-4">
                    <p>No sections yet. Add sections to organize your exam (e.g., "Part I: Multiple Choice")</p>
                  </div>
                ) : (
                  <ListGroup>
                    {form.sections.map((section, index) => (
                      <ListGroup.Item key={index} className="mb-2">
                        <div className="d-flex justify-content-between align-items-start">
                          <div className="flex-grow-1">
                            <div className="d-flex align-items-center gap-2 mb-1">
                              <span className="fw-bold">{section.title}</span>
                              {section.pointsPerItem && (
                                <Badge bg="info">{section.pointsPerItem} pts each</Badge>
                              )}
                            </div>
                            {section.instructions && (
                              <small className="text-muted d-block">📝 {section.instructions}</small>
                            )}
                          </div>
                          <div className="d-flex gap-1">
                            <Button
                              variant="outline-primary"
                              size="sm"
                              onClick={() => handleEditSection(index)}
                            >
                              ✏️
                            </Button>
                            <Button
                              variant="outline-danger"
                              size="sm"
                              onClick={() => handleDeleteSection(index)}
                            >
                              🗑️
                            </Button>
                          </div>
                        </div>
                      </ListGroup.Item>
                    ))}
                  </ListGroup>
                )}
              </Card.Body>
            </Card>
          )}
          
          {/* Questions */}
          <Card className="mb-3 shadow-sm">
            <Card.Header className="d-flex justify-content-between align-items-center">
              <div>
                <h5 className="mb-0">Questions ({form.questions.length})</h5>
                {form.settings.isQuiz && form.questions.length > 0 && (
                  <small className="text-muted">
                    Total Points: {form.questions.reduce((sum, q) => sum + (q.points || 0), 0)}
                  </small>
                )}
              </div>
              <Button variant="primary" size="sm" onClick={handleAddQuestion}>
                ➕ Add Question
              </Button>
            </Card.Header>
            <Card.Body>
              {form.questions.length === 0 ? (
                <div className="text-center text-muted py-4">
                  <p>No questions yet. Click "Add Question" to get started!</p>
                </div>
              ) : (
                <ListGroup>
                  {form.questions.map((q, index) => (
                    <ListGroup.Item key={index} className="mb-2">
                      <div className="d-flex justify-content-between align-items-start">
                        <div className="flex-grow-1">
                          <div className="d-flex align-items-center gap-2 mb-1">
                            <span className="fw-bold">Q{index + 1}.</span>
                            <span>{questionTypes.find(t => t.value === q.type)?.icon}</span>
                            <span className="fw-bold">{q.title || "Untitled Question"}</span>
                            {q.required && <Badge bg="danger">Required</Badge>}
                            {form.settings.isQuiz && q.points > 0 && (
                              <Badge bg="success">{q.points} pts</Badge>
                            )}
                          </div>
                          <small className="text-muted">
                            {questionTypes.find(t => t.value === q.type)?.label}
                            {q.description && ` • ${q.description}`}
                          </small>
                        </div>
                        <div className="d-flex gap-1">
                          {index > 0 && (
                            <Button
                              variant="outline-secondary"
                              size="sm"
                              onClick={() => handleMoveQuestion(index, -1)}
                              title="Move up"
                            >
                              ↑
                            </Button>
                          )}
                          {index < form.questions.length - 1 && (
                            <Button
                              variant="outline-secondary"
                              size="sm"
                              onClick={() => handleMoveQuestion(index, 1)}
                              title="Move down"
                            >
                              ↓
                            </Button>
                          )}
                          <Button
                            variant="outline-info"
                            size="sm"
                            onClick={() => handleDuplicateQuestion(index)}
                            title="Duplicate"
                          >
                            📋
                          </Button>
                          <Button
                            variant="outline-primary"
                            size="sm"
                            onClick={() => handleEditQuestion(index)}
                          >
                            ✏️
                          </Button>
                          <Button
                            variant="outline-danger"
                            size="sm"
                            onClick={() => handleDeleteQuestion(index)}
                          >
                            🗑️
                          </Button>
                        </div>
                      </div>
                    </ListGroup.Item>
                  ))}
                </ListGroup>
              )}
            </Card.Body>
          </Card>
          
          {/* Settings */}
          <Card className="mb-3 shadow-sm">
            <Card.Header>
              <h5 className="mb-0">⚙️ Form Settings</h5>
            </Card.Header>
            <Card.Body>
              <Tabs defaultActiveKey="general" className="mb-3">
                <Tab eventKey="general" title="General">
                  <Form.Check
                    type="switch"
                    id="requireLogin"
                    label="Require login to submit"
                    checked={form.settings.requireLogin}
                    onChange={(e) => setForm({
                      ...form,
                      settings: { ...form.settings, requireLogin: e.target.checked }
                    })}
                    className="mb-2"
                  />
                  <Form.Check
                    type="switch"
                    id="collectEmail"
                    label="Collect email addresses"
                    checked={form.settings.collectEmail}
                    onChange={(e) => setForm({
                      ...form,
                      settings: { ...form.settings, collectEmail: e.target.checked }
                    })}
                    className="mb-2"
                  />
                  <Form.Check
                    type="switch"
                    id="allowMultipleSubmissions"
                    label="Allow multiple submissions"
                    checked={form.settings.allowMultipleSubmissions}
                    onChange={(e) => setForm({
                      ...form,
                      settings: { ...form.settings, allowMultipleSubmissions: e.target.checked }
                    })}
                    className="mb-2"
                  />
                  <Form.Check
                    type="switch"
                    id="shuffleQuestions"
                    label="Shuffle question order"
                    checked={form.settings.shuffleQuestions}
                    onChange={(e) => setForm({
                      ...form,
                      settings: { ...form.settings, shuffleQuestions: e.target.checked }
                    })}
                    className="mb-2"
                  />
                  <Form.Check
                    type="switch"
                    id="shuffleAnswers"
                    label="Shuffle answer options (for multiple choice questions)"
                    checked={form.settings.shuffleAnswers}
                    onChange={(e) => setForm({
                      ...form,
                      settings: { ...form.settings, shuffleAnswers: e.target.checked }
                    })}
                    className="mb-3"
                  />
                  <Form.Text className="text-muted d-block mb-3">
                    <i className="bi bi-info-circle me-1"></i>
                    Shuffling randomizes order for each student to prevent cheating.
                  </Form.Text>
                  
                  <hr className="my-4" />
                  
                  <h6 className="mb-3">📅 Schedule Availability</h6>
                  <Form.Group className="mb-3">
                    <Form.Label>Open Date & Time (Optional)</Form.Label>
                    <Form.Control
                      type="datetime-local"
                      value={form.settings.openAt ? new Date(form.settings.openAt).toISOString().slice(0, 16) : ""}
                      onChange={(e) => setForm({
                        ...form,
                        settings: { ...form.settings, openAt: e.target.value ? new Date(e.target.value).toISOString() : null }
                      })}
                    />
                    <Form.Text className="text-muted">
                      Form will only be accessible to students after this date/time
                    </Form.Text>
                  </Form.Group>
                  
                  <Form.Group className="mb-3">
                    <Form.Label>Close Date & Time (Optional)</Form.Label>
                    <Form.Control
                      type="datetime-local"
                      value={form.settings.closeAt ? new Date(form.settings.closeAt).toISOString().slice(0, 16) : ""}
                      onChange={(e) => setForm({
                        ...form,
                        settings: { ...form.settings, closeAt: e.target.value ? new Date(e.target.value).toISOString() : null }
                      })}
                    />
                    <Form.Text className="text-muted">
                      Form will close and stop accepting responses after this date/time
                    </Form.Text>
                  </Form.Group>
                  
                  <Form.Group className="mb-3">
                    <Form.Label>Confirmation Message</Form.Label>
                    <Form.Control
                      as="textarea"
                      rows={2}
                      value={form.settings.confirmationMessage}
                      onChange={(e) => setForm({
                        ...form,
                        settings: { ...form.settings, confirmationMessage: e.target.value }
                      })}
                    />
                  </Form.Group>
                </Tab>
                
                <Tab eventKey="quiz" title="Quiz Mode">
                  <Form.Check
                    type="switch"
                    id="isQuiz"
                    label="Make this a quiz"
                    checked={form.settings.isQuiz}
                    onChange={(e) => setForm({
                      ...form,
                      settings: { ...form.settings, isQuiz: e.target.checked }
                    })}
                    className="mb-2"
                  />
                  {form.settings.isQuiz && (
                    <>
                      <Form.Check
                        type="switch"
                        id="autoGrade"
                        label="Auto-grade responses"
                        checked={form.settings.autoGrade}
                        onChange={(e) => setForm({
                          ...form,
                          settings: { ...form.settings, autoGrade: e.target.checked }
                        })}
                        className="mb-2"
                      />
                      <Form.Check
                        type="switch"
                        id="showCorrectAnswers"
                        label="Show correct answers after submission"
                        checked={form.settings.showCorrectAnswers}
                        onChange={(e) => setForm({
                          ...form,
                          settings: { ...form.settings, showCorrectAnswers: e.target.checked }
                        })}
                        className="mb-2"
                      />
                    </>
                  )}
                </Tab>
                
                <Tab eventKey="philippine" title="🇵🇭 Philippine Exam Style">
                  <Form.Check
                    type="switch"
                    id="usePhilippineStyle"
                    label="Use Philippine Exam Format"
                    checked={form.settings.usePhilippineStyle}
                    onChange={(e) => setForm({
                      ...form,
                      settings: { ...form.settings, usePhilippineStyle: e.target.checked, isQuiz: e.target.checked }
                    })}
                    className="mb-3"
                  />
                  <small className="text-muted d-block mb-3">
                    Enables exam header, sections (Part I, Part II, etc.), and Philippine question types like Identification, Enumeration, True/False, and Matching Type.
                  </small>
                  
                  {form.settings.usePhilippineStyle && (
                    <>
                      <h6 className="mt-4 mb-3">📋 Exam Header Information</h6>
                      <Row>
                        <Col md={6}>
                          <Form.Group className="mb-3">
                            <Form.Label>Subject</Form.Label>
                            <Form.Control
                              type="text"
                              value={form.examHeader?.subject || ""}
                              onChange={(e) => setForm({
                                ...form,
                                examHeader: { ...form.examHeader, subject: e.target.value }
                              })}
                              placeholder="e.g., Mathematics"
                            />
                          </Form.Group>
                        </Col>
                        <Col md={6}>
                          <Form.Group className="mb-3">
                            <Form.Label>Teacher</Form.Label>
                            <Form.Control
                              type="text"
                              value={form.examHeader?.teacher || ""}
                              onChange={(e) => setForm({
                                ...form,
                                examHeader: { ...form.examHeader, teacher: e.target.value }
                              })}
                              placeholder="Teacher's name"
                            />
                          </Form.Group>
                        </Col>
                      </Row>
                      <Row>
                        <Col md={6}>
                          <Form.Group className="mb-3">
                            <Form.Label>Semester</Form.Label>
                            <Form.Select
                              value={form.examHeader?.semester || ""}
                              onChange={(e) => setForm({
                                ...form,
                                examHeader: { ...form.examHeader, semester: e.target.value }
                              })}
                            >
                              <option value="">Select Semester</option>
                              <option value="First Semester">First Semester</option>
                              <option value="Second Semester">Second Semester</option>
                              <option value="Summer">Summer</option>
                            </Form.Select>
                          </Form.Group>
                        </Col>
                        <Col md={6}>
                          <Form.Group className="mb-3">
                            <Form.Label>School Year</Form.Label>
                            <Form.Control
                              type="text"
                              value={form.examHeader?.schoolYear || ""}
                              onChange={(e) => setForm({
                                ...form,
                                examHeader: { ...form.examHeader, schoolYear: e.target.value }
                              })}
                              placeholder="e.g., 2024-2025"
                            />
                          </Form.Group>
                        </Col>
                      </Row>
                      <Row>
                        <Col md={4}>
                          <Form.Group className="mb-3">
                            <Form.Label>Duration (minutes)</Form.Label>
                            <Form.Control
                              type="number"
                              value={form.examHeader?.duration || 60}
                              onChange={(e) => setForm({
                                ...form,
                                examHeader: { ...form.examHeader, duration: Number(e.target.value) }
                              })}
                              min="1"
                            />
                          </Form.Group>
                        </Col>
                        <Col md={4}>
                          <Form.Group className="mb-3">
                            <Form.Label>Exam Date</Form.Label>
                            <Form.Control
                              type="date"
                              value={form.examHeader?.examDate || ""}
                              onChange={(e) => setForm({
                                ...form,
                                examHeader: { ...form.examHeader, examDate: e.target.value }
                              })}
                            />
                          </Form.Group>
                        </Col>
                        <Col md={4}>
                          <Form.Group className="mb-3">
                            <Form.Label>Passing Score (%)</Form.Label>
                            <Form.Control
                              type="number"
                              value={form.examHeader?.passingScore || 50}
                              onChange={(e) => setForm({
                                ...form,
                                examHeader: { ...form.examHeader, passingScore: Number(e.target.value) }
                              })}
                              min="1"
                              max="100"
                            />
                          </Form.Group>
                        </Col>
                      </Row>
                      
                      <Alert variant="info" className="mt-3">
                        <strong>📝 Tip:</strong> After enabling Philippine format, use the "Add Section" button to create exam sections like "Part I: Multiple Choice", "Part II: Identification", etc.
                      </Alert>
                    </>
                  )}
                </Tab>
                
                <Tab eventKey="theme" title="Theme">
                  <Form.Group className="mb-3">
                    <Form.Label>Primary Color</Form.Label>
                    <Form.Control
                      type="color"
                      value={form.theme.primaryColor}
                      onChange={(e) => setForm({
                        ...form,
                        theme: { ...form.theme, primaryColor: e.target.value }
                      })}
                    />
                  </Form.Group>
                  <Form.Group className="mb-3">
                    <Form.Label>Background Color</Form.Label>
                    <Form.Control
                      type="color"
                      value={form.theme.backgroundColor}
                      onChange={(e) => setForm({
                        ...form,
                        theme: { ...form.theme, backgroundColor: e.target.value }
                      })}
                    />
                  </Form.Group>
                </Tab>
              </Tabs>
            </Card.Body>
          </Card>
        </Col>
      </Row>
      
      {/* Question Modal */}
      <Modal show={showQuestionModal} onHide={() => setShowQuestionModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            {editingQuestion !== null ? "Edit Question" : "Add Question"}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group className="mb-3">
            <Form.Label>Question Type</Form.Label>
            <Form.Select
              value={currentQuestion.type}
              onChange={(e) => setCurrentQuestion({ ...currentQuestion, type: e.target.value })}
            >
              {questionTypes.map(type => (
                <option key={type.value} value={type.value}>
                  {type.icon} {type.label}
                </option>
              ))}
            </Form.Select>
          </Form.Group>
          
          <Form.Group className="mb-3">
            <Form.Label>Question Title *</Form.Label>
            <Form.Control
              type="text"
              value={currentQuestion.title}
              onChange={(e) => setCurrentQuestion({ ...currentQuestion, title: e.target.value })}
              placeholder="Enter your question..."
              required
            />
          </Form.Group>
          
          <Form.Group className="mb-3">
            <Form.Label>Description (optional)</Form.Label>
            <Form.Control
              as="textarea"
              rows={2}
              value={currentQuestion.description}
              onChange={(e) => setCurrentQuestion({ ...currentQuestion, description: e.target.value })}
              placeholder="Add additional context..."
            />
          </Form.Group>
          
          {/* Section selector (Philippine Style) */}
          {form.settings.usePhilippineStyle && form.sections && form.sections.length > 0 && (
            <Form.Group className="mb-3">
              <Form.Label>Assign to Section (optional)</Form.Label>
              <Form.Select
                value={currentQuestion.sectionId || ""}
                onChange={(e) => setCurrentQuestion({ ...currentQuestion, sectionId: e.target.value })}
              >
                <option value="">No Section</option>
                {form.sections.map((section, idx) => (
                  <option key={idx} value={section._id || section.order}>
                    {section.title}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>
          )}
          
          {/* True/False (Philippine Style) */}
          {currentQuestion.type === "true_false" && (
            <Alert variant="info">
              Student will select either <strong>True</strong> or <strong>False</strong>
            </Alert>
          )}
          
          {/* Identification (Philippine Style) */}
          {currentQuestion.type === "identification" && (
            <Alert variant="info">
              Student will type a short answer to identify the term, concept, or answer.
            </Alert>
          )}
          
          {/* Enumeration (Philippine Style) */}
          {currentQuestion.type === "enumeration" && (
            <>
              <Form.Group className="mb-3">
                <Form.Label>Number of Items to Enumerate</Form.Label>
                <Form.Control
                  type="number"
                  value={currentQuestion.expectedCount || 5}
                  onChange={(e) => setCurrentQuestion({ 
                    ...currentQuestion, 
                    expectedCount: Number(e.target.value) 
                  })}
                  min="1"
                />
                <Form.Text className="text-muted">
                  How many items should the student list?
                </Form.Text>
              </Form.Group>
              
              {form.settings.isQuiz && (
                <Form.Group className="mb-3">
                  <Form.Label>Expected Answers (for auto-grading)</Form.Label>
                  {(currentQuestion.enumerationAnswers || []).map((answer, index) => (
                    <div key={index} className="d-flex gap-2 mb-2">
                      <Form.Control
                        type="text"
                        value={answer}
                        onChange={(e) => {
                          const newAnswers = [...(currentQuestion.enumerationAnswers || [])];
                          newAnswers[index] = e.target.value;
                          setCurrentQuestion({ ...currentQuestion, enumerationAnswers: newAnswers });
                        }}
                        placeholder={`Answer ${index + 1}`}
                      />
                      <Button
                        variant="outline-danger"
                        size="sm"
                        onClick={() => {
                          const newAnswers = currentQuestion.enumerationAnswers.filter((_, i) => i !== index);
                          setCurrentQuestion({ ...currentQuestion, enumerationAnswers: newAnswers });
                        }}
                      >
                        ❌
                      </Button>
                    </div>
                  ))}
                  <Button
                    variant="outline-primary"
                    size="sm"
                    onClick={() => setCurrentQuestion({
                      ...currentQuestion,
                      enumerationAnswers: [...(currentQuestion.enumerationAnswers || []), ""]
                    })}
                  >
                    ➕ Add Answer
                  </Button>
                </Form.Group>
              )}
            </>
          )}
          
          {/* Matching Type (Philippine Style) */}
          {currentQuestion.type === "matching_type" && (
            <Form.Group className="mb-3">
              <Form.Label>Matching Pairs</Form.Label>
              <small className="text-muted d-block mb-2">Create pairs that students need to match (Column A ↔ Column B)</small>
              {(currentQuestion.matchingPairs || []).map((pair, index) => (
                <div key={index} className="d-flex gap-2 mb-2">
                  <Form.Control
                    type="text"
                    value={pair.left || ""}
                    onChange={(e) => {
                      const newPairs = [...(currentQuestion.matchingPairs || [])];
                      newPairs[index] = { ...newPairs[index], left: e.target.value };
                      setCurrentQuestion({ ...currentQuestion, matchingPairs: newPairs });
                    }}
                    placeholder="Column A"
                  />
                  <span className="align-self-center">↔</span>
                  <Form.Control
                    type="text"
                    value={pair.right || ""}
                    onChange={(e) => {
                      const newPairs = [...(currentQuestion.matchingPairs || [])];
                      newPairs[index] = { ...newPairs[index], right: e.target.value };
                      setCurrentQuestion({ ...currentQuestion, matchingPairs: newPairs });
                    }}
                    placeholder="Column B"
                  />
                  <Button
                    variant="outline-danger"
                    size="sm"
                    onClick={() => {
                      const newPairs = currentQuestion.matchingPairs.filter((_, i) => i !== index);
                      setCurrentQuestion({ ...currentQuestion, matchingPairs: newPairs });
                    }}
                  >
                    ❌
                  </Button>
                </div>
              ))}
              <Button
                variant="outline-primary"
                size="sm"
                onClick={() => setCurrentQuestion({
                  ...currentQuestion,
                  matchingPairs: [...(currentQuestion.matchingPairs || []), { left: "", right: "" }]
                })}
              >
                ➕ Add Pair
              </Button>
            </Form.Group>
          )}
          
          {/* Options for multiple choice, checkboxes, dropdown */}
          {["multiple_choice", "checkboxes", "dropdown"].includes(currentQuestion.type) && (
            <Form.Group className="mb-3">
              <Form.Label>Options</Form.Label>
              {(currentQuestion.options || []).map((option, index) => (
                <div key={index} className="d-flex gap-2 mb-2">
                  <Form.Control
                    type="text"
                    value={option}
                    onChange={(e) => {
                      const newOptions = [...(currentQuestion.options || [])];
                      newOptions[index] = e.target.value;
                      setCurrentQuestion({ ...currentQuestion, options: newOptions });
                    }}
                    placeholder={`Option ${index + 1}`}
                  />
                  <Button
                    variant="outline-danger"
                    size="sm"
                    onClick={() => {
                      const newOptions = currentQuestion.options.filter((_, i) => i !== index);
                      setCurrentQuestion({ ...currentQuestion, options: newOptions });
                    }}
                  >
                    ❌
                  </Button>
                </div>
              ))}
              <Button
                variant="outline-primary"
                size="sm"
                onClick={() => setCurrentQuestion({
                  ...currentQuestion,
                  options: [...(currentQuestion.options || []), ""]
                })}
              >
                ➕ Add Option
              </Button>
            </Form.Group>
          )}
          
          {/* Linear scale settings */}
          {currentQuestion.type === "linear_scale" && (
            <>
              <Row className="mb-3">
                <Col>
                  <Form.Group>
                    <Form.Label>Min Value</Form.Label>
                    <Form.Control
                      type="number"
                      value={currentQuestion.scaleMin}
                      onChange={(e) => setCurrentQuestion({
                        ...currentQuestion,
                        scaleMin: Number(e.target.value)
                      })}
                    />
                  </Form.Group>
                </Col>
                <Col>
                  <Form.Group>
                    <Form.Label>Max Value</Form.Label>
                    <Form.Control
                      type="number"
                      value={currentQuestion.scaleMax}
                      onChange={(e) => setCurrentQuestion({
                        ...currentQuestion,
                        scaleMax: Number(e.target.value)
                      })}
                    />
                  </Form.Group>
                </Col>
              </Row>
              <Row className="mb-3">
                <Col>
                  <Form.Group>
                    <Form.Label>Min Label</Form.Label>
                    <Form.Control
                      type="text"
                      value={currentQuestion.scaleMinLabel}
                      onChange={(e) => setCurrentQuestion({
                        ...currentQuestion,
                        scaleMinLabel: e.target.value
                      })}
                      placeholder="e.g., Strongly Disagree"
                    />
                  </Form.Group>
                </Col>
                <Col>
                  <Form.Group>
                    <Form.Label>Max Label</Form.Label>
                    <Form.Control
                      type="text"
                      value={currentQuestion.scaleMaxLabel}
                      onChange={(e) => setCurrentQuestion({
                        ...currentQuestion,
                        scaleMaxLabel: e.target.value
                      })}
                      placeholder="e.g., Strongly Agree"
                    />
                  </Form.Group>
                </Col>
              </Row>
            </>
          )}
          
          <Form.Check
            type="switch"
            id="required"
            label="Required question"
            checked={currentQuestion.required}
            onChange={(e) => setCurrentQuestion({ ...currentQuestion, required: e.target.checked })}
            className="mb-3"
          />
          
          {/* Quiz mode settings */}
          {form.settings.isQuiz && (
            <>
              <hr />
              <h6 className="text-primary">📊 Quiz Settings</h6>
              <Form.Group className="mb-3">
                <Form.Label>
                  <strong>Points</strong>
                  <small className="text-muted ms-2">(How many points is this question worth?)</small>
                </Form.Label>
                <Form.Control
                  type="number"
                  value={currentQuestion.points}
                  onChange={(e) => setCurrentQuestion({
                    ...currentQuestion,
                    points: Number(e.target.value) || 1
                  })}
                  min="0.5"
                  step="0.5"
                  placeholder="Enter points (e.g., 1, 2, 5)"
                />
                <Form.Text className="text-muted">
                  Default is 1 point. Set higher for more important questions.
                </Form.Text>
              </Form.Group>
              
              {["multiple_choice", "dropdown"].includes(currentQuestion.type) && (
                <Form.Group className="mb-3">
                  <Form.Label>Correct Answer</Form.Label>
                  <Form.Select
                    value={currentQuestion.correctAnswer}
                    onChange={(e) => setCurrentQuestion({
                      ...currentQuestion,
                      correctAnswer: e.target.value
                    })}
                  >
                    <option value="">Select correct answer</option>
                    {(currentQuestion.options || []).map((option, idx) => (
                      <option key={idx} value={option}>{option}</option>
                    ))}
                  </Form.Select>
                </Form.Group>
              )}
              
              {currentQuestion.type === "true_false" && (
                <Form.Group className="mb-3">
                  <Form.Label>Correct Answer</Form.Label>
                  <Form.Select
                    value={currentQuestion.correctAnswer}
                    onChange={(e) => setCurrentQuestion({
                      ...currentQuestion,
                      correctAnswer: e.target.value
                    })}
                  >
                    <option value="">Select correct answer</option>
                    <option value="True">True</option>
                    <option value="False">False</option>
                  </Form.Select>
                </Form.Group>
              )}
              
              {currentQuestion.type === "identification" && (
                <Form.Group className="mb-3">
                  <Form.Label>Correct Answer (for auto-grading)</Form.Label>
                  <Form.Control
                    type="text"
                    value={currentQuestion.correctAnswer || ""}
                    onChange={(e) => setCurrentQuestion({
                      ...currentQuestion,
                      correctAnswer: e.target.value
                    })}
                    placeholder="Enter the correct answer"
                  />
                  <Form.Text className="text-muted">
                    Student's answer will be checked against this (case-insensitive).
                  </Form.Text>
                </Form.Group>
              )}
              
              {currentQuestion.type === "checkboxes" && (
                <Form.Group className="mb-3">
                  <Form.Label>Correct Answers (select all that apply)</Form.Label>
                  {(currentQuestion.options || []).map((option, idx) => (
                    <Form.Check
                      key={idx}
                      type="checkbox"
                      label={option}
                      checked={(currentQuestion.correctAnswer || []).includes(option)}
                      onChange={(e) => {
                        const current = currentQuestion.correctAnswer || [];
                        const newCorrect = e.target.checked
                          ? [...current, option]
                          : current.filter(a => a !== option);
                        setCurrentQuestion({ ...currentQuestion, correctAnswer: newCorrect });
                      }}
                    />
                  ))}
                </Form.Group>
              )}
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowQuestionModal(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSaveQuestion}>
            {editingQuestion !== null ? "Update" : "Add"} Question
          </Button>
        </Modal.Footer>
      </Modal>
      
      {/* Section Modal (Philippine Style) */}
      <Modal show={showSectionModal} onHide={() => setShowSectionModal(false)} size="md">
        <Modal.Header closeButton>
          <Modal.Title>
            {editingSection !== null ? "Edit Section" : "Add Section"}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group className="mb-3">
            <Form.Label>Section Title *</Form.Label>
            <Form.Control
              type="text"
              value={currentSection.title}
              onChange={(e) => setCurrentSection({ ...currentSection, title: e.target.value })}
              placeholder="e.g., Part I: Multiple Choice"
            />
            <Form.Text className="text-muted">
              Examples: "Part I: Multiple Choice", "Part II: Identification", "Part III: Essay"
            </Form.Text>
          </Form.Group>
          
          <Form.Group className="mb-3">
            <Form.Label>Instructions</Form.Label>
            <Form.Control
              as="textarea"
              rows={2}
              value={currentSection.instructions}
              onChange={(e) => setCurrentSection({ ...currentSection, instructions: e.target.value })}
              placeholder="e.g., Choose the letter of the correct answer. Write your answer on the space provided."
            />
            <Form.Text className="text-muted">
              These instructions will appear at the start of this section.
            </Form.Text>
          </Form.Group>
          
          <Form.Group className="mb-3">
            <Form.Label>Points Per Item</Form.Label>
            <Form.Control
              type="number"
              value={currentSection.pointsPerItem}
              onChange={(e) => setCurrentSection({ ...currentSection, pointsPerItem: Number(e.target.value) })}
              min="0.5"
              step="0.5"
            />
            <Form.Text className="text-muted">
              Default point value for questions in this section (e.g., "Each item is worth 2 points")
            </Form.Text>
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowSectionModal(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSaveSection}>
            {editingSection !== null ? "Update" : "Add"} Section
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default FormBuilder;
