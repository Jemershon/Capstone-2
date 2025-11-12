import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { 
  Container, Row, Col, Card, Button, Table, Badge, 
  Modal, Form, Alert, Spinner, Dropdown 
} from "react-bootstrap";
import { API_BASE_URL } from "../../api";

const FormsList = () => {
  const navigate = useNavigate();
  const [forms, setForms] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showTemplatesModal, setShowTemplatesModal] = useState(false);
  const [showSendToClassModal, setShowSendToClassModal] = useState(false);
  const [selectedForm, setSelectedForm] = useState(null);
  const [selectedClasses, setSelectedClasses] = useState([]);
  const [newDeadline, setNewDeadline] = useState("");
  
  useEffect(() => {
    loadForms();
    loadTemplates();
    loadClasses();
  }, []);
  
  const loadForms = async () => {
    try {
      setLoading(true);
      console.log("=== LOADING FORMS ===");
      console.log("Token:", localStorage.getItem("token") ? "Present" : "Missing");
      
      const response = await axios.get(`${API_BASE_URL}/api/forms`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      
      console.log("Forms received:", response.data.length);
      console.log("Forms data:", response.data);
      
      setForms(response.data);
    } catch (err) {
      console.error("Load forms error:", err);
      setError(err.response?.data?.error || "Failed to load forms");
    } finally {
      setLoading(false);
    }
  };
  
  const loadTemplates = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/forms/templates/all`);
      setTemplates(response.data);
    } catch (err) {
      console.error("Failed to load templates:", err);
    }
  };
  
  const loadClasses = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/classes`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      setClasses(response.data);
    } catch (err) {
      console.error("Failed to load classes:", err);
    }
  };
  
  const handleDelete = async (formId) => {
    if (!window.confirm("Delete this form and all responses? This cannot be undone.")) {
      return;
    }
    
    try {
      await axios.delete(`${API_BASE_URL}/api/forms/${formId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      setSuccess("Form deleted successfully!");
      loadForms();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to delete form");
    }
  };
  
  const handleDuplicate = async (form) => {
    try {
      const duplicate = {
        title: `${form.title} (Copy)`,
        description: form.description,
        questions: form.questions,
        settings: form.settings,
        theme: form.theme,
        status: "draft",
      };
      
      const response = await axios.post(`${API_BASE_URL}/api/forms`, duplicate, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      
      setSuccess("Form duplicated successfully!");
      navigate(`/teacher/forms/${response.data._id}/edit`);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to duplicate form");
    }
  };
  
  const handleUseTemplate = async (templateId) => {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/forms/templates/${templateId}/use`,
        {},
        { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
      );
      setShowTemplatesModal(false);
      setSuccess("Form created from template!");
      navigate(`/teacher/forms/${response.data._id}/edit`);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to use template");
    }
  };
  
  const handleSendToClass = async () => {
    if (selectedClasses.length === 0) {
      setError("Please select at least one class");
      return;
    }
    
    try {
      await axios.post(
        `${API_BASE_URL}/api/forms/${selectedForm._id}/send-to-class`,
        {
          targetClasses: selectedClasses,
          newDeadline: newDeadline || undefined,
        },
        { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
      );
      
      setShowSendToClassModal(false);
      setSelectedForm(null);
      setSelectedClasses([]);
      setNewDeadline("");
      setSuccess(`Form sent to ${selectedClasses.length} class(es) successfully!`);
      loadForms();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to send form to class");
    }
  };
  
  const openSendToClassModal = (form) => {
    setSelectedForm(form);
    setSelectedClasses([]);
    setNewDeadline("");
    setShowSendToClassModal(true);
  };
  
  const toggleClassSelection = (className) => {
    if (selectedClasses.includes(className)) {
      setSelectedClasses(selectedClasses.filter(c => c !== className));
    } else {
      setSelectedClasses([...selectedClasses, className]);
    }
  };
  
  const getStatusBadge = (status) => {
    const variants = {
      draft: "secondary",
      published: "success",
      closed: "danger",
    };
    return <Badge bg={variants[status]}>{status}</Badge>;
  };
  
  if (loading) {
    return (
      <Container className="text-center py-5">
        <Spinner animation="border" />
        <p className="mt-2">Loading forms...</p>
      </Container>
    );
  }
  
  return (
    <Container fluid className="py-4" style={{ overflow: 'visible' }}>
      <Row className="mb-4">
        <Col>
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-3">
            <h2 className="mb-0">📋 Forms</h2>
            <div className="d-flex flex-column flex-sm-row gap-2 w-100 w-md-auto">
              <Button 
                variant="outline-primary" 
                onClick={() => setShowTemplatesModal(true)}
                className="w-100 w-sm-auto"
              >
                📚 Use Template
              </Button>
              <Button 
                variant="primary" 
                onClick={() => navigate("/teacher/forms/new")}
                className="w-100 w-sm-auto"
              >
                ➕ Create New Form
              </Button>
            </div>
          </div>
        </Col>
      </Row>
      
      {error && <Alert variant="danger" dismissible onClose={() => setError("")}>{error}</Alert>}
      {success && <Alert variant="success" dismissible onClose={() => setSuccess("")}>{success}</Alert>}
      
      {forms.length === 0 ? (
        <Card className="text-center py-5">
          <Card.Body>
            <div className="mb-4">
              <i className="bi bi-clipboard-data" style={{ fontSize: "4rem", opacity: 0.3 }}></i>
            </div>
            <h4>No forms yet</h4>
            <p className="text-muted">Create your first form to collect responses from students</p>
            <Button variant="primary" onClick={() => navigate("/teacher/forms/new")}>
              Create Your First Form
            </Button>
          </Card.Body>
        </Card>
      ) : (
        <Card>
          <Card.Body className="p-0">
            {/* Table Header */}
            <div className="d-none d-md-flex border-bottom p-3 fw-bold text-muted" style={{ fontSize: '0.875rem' }}>
              <div style={{ flex: '2' }}>Title</div>
              <div style={{ width: '120px', textAlign: 'center' }}>Class</div>
              <div style={{ width: '100px', textAlign: 'center' }}>Type</div>
              <div style={{ width: '100px', textAlign: 'center' }}>Status</div>
              <div style={{ width: '100px', textAlign: 'center' }}>Responses</div>
              <div style={{ width: '120px', textAlign: 'center' }}>Created</div>
              <div style={{ width: '80px', textAlign: 'center' }}>Actions</div>
            </div>
            
            {/* Table Body */}
            {forms.map((form, index) => (
              <div 
                key={form._id} 
                className="d-flex flex-column flex-md-row align-items-start align-items-md-center p-3 border-bottom hover-bg"
                style={{ 
                  transition: 'background-color 0.2s',
                  cursor: 'default',
                  position: 'relative'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8f9fa'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <div style={{ flex: '2' }} className="mb-2 mb-md-0">
                  <div className="fw-bold">{form.title}</div>
                  {form.description && (
                    <small className="text-muted">{form.description.substring(0, 60)}...</small>
                  )}
                </div>
                
                <div style={{ width: '120px', textAlign: 'center' }} className="mb-2 mb-md-0">
                  {form.className ? (
                    <Badge bg="primary" className="text-wrap">{form.className}</Badge>
                  ) : (
                    <Badge bg="secondary">All Classes</Badge>
                  )}
                </div>
                
                <div style={{ width: '100px', textAlign: 'center' }} className="mb-2 mb-md-0">
                  {form.settings.isQuiz ? (
                    <Badge bg="info">Quiz</Badge>
                  ) : (
                    <Badge bg="primary">Survey</Badge>
                  )}
                </div>
                
                <div style={{ width: '100px', textAlign: 'center' }} className="mb-2 mb-md-0">
                  {getStatusBadge(form.status)}
                </div>
                
                <div style={{ width: '100px', textAlign: 'center' }} className="mb-2 mb-md-0">
                  <Badge bg="secondary">{form.responseCount || 0}</Badge>
                </div>
                
                <div style={{ width: '120px', textAlign: 'center' }} className="mb-2 mb-md-0">
                  <small>{new Date(form.createdAt).toLocaleDateString()}</small>
                </div>
                
                <div style={{ width: '80px', textAlign: 'center' }}>
                  <Dropdown align="end">
                    <Dropdown.Toggle 
                      variant="link" 
                      size="sm" 
                      className="text-muted p-0"
                      style={{ boxShadow: 'none', border: 'none' }}
                    >
                      <i className="bi bi-three-dots-vertical" style={{ fontSize: '1.2rem' }}></i>
                    </Dropdown.Toggle>
                    <Dropdown.Menu>
                      <Dropdown.Item onClick={() => navigate(`/teacher/forms/${form._id}/edit`)}>
                        <i className="bi bi-pencil me-2"></i> Edit
                      </Dropdown.Item>
                      <Dropdown.Item onClick={() => navigate(`/teacher/forms/${form._id}/responses`)}>
                        <i className="bi bi-bar-chart me-2"></i> View Responses ({form.responseCount || 0})
                      </Dropdown.Item>
                      <Dropdown.Item onClick={() => window.open(`/forms/${form._id}?preview=true`, '_blank')}>
                        <i className="bi bi-box-arrow-up-right me-2"></i> Preview
                      </Dropdown.Item>
                      <Dropdown.Item onClick={() => handleDuplicate(form)}>
                        <i className="bi bi-files me-2"></i> Duplicate
                      </Dropdown.Item>
                      <Dropdown.Item onClick={() => openSendToClassModal(form)}>
                        <i className="bi bi-send me-2"></i> Send to Class
                      </Dropdown.Item>
                      <Dropdown.Divider />
                      <Dropdown.Item className="text-danger" onClick={() => handleDelete(form._id)}>
                        <i className="bi bi-trash me-2"></i> Delete
                      </Dropdown.Item>
                    </Dropdown.Menu>
                  </Dropdown>
                </div>
              </div>
            ))}
          </Card.Body>
        </Card>
      )}
      
      {/* Templates Modal */}
      <Modal show={showTemplatesModal} onHide={() => setShowTemplatesModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Choose a Template</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {templates.length === 0 ? (
            <p className="text-muted text-center py-4">No templates available yet.</p>
          ) : (
            <Row>
              {templates.map((template) => (
                <Col md={6} key={template._id} className="mb-3">
                  <Card 
                    className="h-100 cursor-pointer" 
                    onClick={() => handleUseTemplate(template._id)}
                    style={{ cursor: "pointer" }}
                  >
                    <Card.Body>
                      <h6>{template.title}</h6>
                      <small className="text-muted">{template.description}</small>
                      <div className="mt-2">
                        <Badge bg="info">{template.templateCategory}</Badge>
                        <Badge bg="secondary" className="ms-2">
                          {template.questions.length} questions
                        </Badge>
                      </div>
                    </Card.Body>
                  </Card>
                </Col>
              ))}
            </Row>
          )}
        </Modal.Body>
      </Modal>
      
      {/* Send to Class Modal */}
      <Modal show={showSendToClassModal} onHide={() => setShowSendToClassModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            <i className="bi bi-send me-2"></i>
            Send Form to Class(es)
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedForm && (
            <>
              <Alert variant="info">
                <strong>Form:</strong> {selectedForm.title}
                <br />
                <small>Select one or more classes to send this form to. A copy will be created for each class.</small>
              </Alert>
              
              <Form.Group className="mb-3">
                <Form.Label className="fw-bold">Select Classes:</Form.Label>
                {classes.length === 0 ? (
                  <p className="text-muted">No classes available. Create a class first.</p>
                ) : (
                  <div className="border rounded p-3" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                    {classes.map((cls) => (
                      <Form.Check
                        key={cls._id || cls.code}
                        type="checkbox"
                        id={`class-${cls._id || cls.code}`}
                        label={
                          <span>
                            <strong>{cls.name}</strong>
                            <small className="text-muted ms-2">({cls.section || cls.year})</small>
                          </span>
                        }
                        checked={selectedClasses.includes(cls.name)}
                        onChange={() => toggleClassSelection(cls.name)}
                        className="mb-2"
                      />
                    ))}
                  </div>
                )}
              </Form.Group>
              
              <Form.Group className="mb-3">
                <Form.Label>New Deadline (Optional):</Form.Label>
                <Form.Control
                  type="datetime-local"
                  value={newDeadline}
                  onChange={(e) => setNewDeadline(e.target.value)}
                />
                <Form.Text className="text-muted">
                  Leave empty to use the original deadline
                </Form.Text>
              </Form.Group>
              
              {selectedClasses.length > 0 && (
                <Alert variant="success">
                  <i className="bi bi-check-circle me-2"></i>
                  Ready to send to <strong>{selectedClasses.length}</strong> class(es)
                </Alert>
              )}
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowSendToClassModal(false)}>
            Cancel
          </Button>
          <Button 
            variant="primary" 
            onClick={handleSendToClass}
            disabled={selectedClasses.length === 0}
          >
            <i className="bi bi-send me-2"></i>
            Send to {selectedClasses.length || 0} Class(es)
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default FormsList;
