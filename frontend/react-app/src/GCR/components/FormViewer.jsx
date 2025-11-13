import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
import io from "socket.io-client";
import { 
  Container, Card, Form, Button, Alert, Spinner, 
  ProgressBar, Row, Col 
} from "react-bootstrap";
import { API_BASE_URL } from "../../api";

// Fisher-Yates shuffle algorithm for randomizing arrays
const shuffleArray = (array) => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

const FormViewer = () => {
  const { formId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isPreviewMode = searchParams.get('preview') === 'true';
  
  const [form, setForm] = useState(null);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  // Determine viewer role from JWT (if present) so teachers can't submit even if they open the student URL
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  let viewerRole = null;
  try {
    if (token) {
      const payload = JSON.parse(atob(token.split('.')[1]));
      viewerRole = payload?.role || null;
    }
  } catch (e) {
    viewerRole = null;
  }
  const [currentPage, setCurrentPage] = useState(0);
  const [startTime] = useState(Date.now());
  const [shuffledQuestions, setShuffledQuestions] = useState([]);
  const [shuffledOptions, setShuffledOptions] = useState({}); // Map of questionId -> shuffled options
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [respondentName, setRespondentName] = useState("");
  const [respondentEmail, setRespondentEmail] = useState("");
  
  useEffect(() => {
    loadForm();
  }, [formId]);
  
  // Timer countdown effect
  useEffect(() => {
    if (!form?.settings?.deadline && !form?.settings?.closeAt) {
      return; // No deadline set
    }
    
    const interval = setInterval(() => {
      const now = new Date();
      const deadline = form.settings.closeAt || form.settings.deadline;
      const deadlineTime = new Date(deadline);
      const remaining = deadlineTime - now;
      
      if (remaining <= 0) {
        setTimeRemaining(null);
        clearInterval(interval);
        // Form is closed - disable submit button
        if (!alreadySubmitted) {
          setAlreadySubmitted(true);
          setError("This form has closed and is no longer accepting responses.");
        }
      } else {
        const hours = Math.floor(remaining / (1000 * 60 * 60));
        const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((remaining % (1000 * 60)) / 1000);
        
        setTimeRemaining({
          total: remaining,
          hours,
          minutes,
          seconds,
          formatted: `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
        });
      }
    }, 1000);
    
    return () => clearInterval(interval);
  }, [form, alreadySubmitted]);
  
  const loadForm = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/api/forms/${formId}`);
      const formData = response.data;
      setForm(formData);
      
      // Check if logged-in user has already submitted this form
      const token = localStorage.getItem("token");
      if (token) {
        try {
          const statusRes = await axios.get(
            `${API_BASE_URL}/api/forms/${formId}/my-submission-status`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          
          if (statusRes.data.hasSubmitted) {
            setAlreadySubmitted(true);
            setError("You have already submitted this form. Multiple submissions are not allowed.");
            console.log("Student has already submitted this form");
          }
        } catch (err) {
          // If endpoint doesn't exist or error occurs, we'll catch it at submission time
          console.log("Could not check submission status, will validate at submit time");
        }
      }
      
      // Shuffle questions if enabled
      let questionsToDisplay = formData.questions;
      if (formData.settings?.shuffleQuestions) {
        questionsToDisplay = shuffleArray(formData.questions);
      }
      setShuffledQuestions(questionsToDisplay);
      
      // Shuffle answer options if enabled
      if (formData.settings?.shuffleAnswers) {
        const optionsMap = {};
        formData.questions.forEach(q => {
          // Only shuffle for question types with options
          if (['multiple_choice', 'checkboxes', 'dropdown'].includes(q.type) && q.options) {
            optionsMap[q._id] = shuffleArray(q.options);
          }
        });
        setShuffledOptions(optionsMap);
      }
      
      // Initialize answers
      const initialAnswers = {};
      formData.questions.forEach(q => {
        if (q.type === 'checkboxes') {
          initialAnswers[q._id] = [];
        } else {
          initialAnswers[q._id] = '';
        }
      });
      setAnswers(initialAnswers);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to load form");
    } finally {
      setLoading(false);
    }
  };
  
  const handleAnswerChange = (questionId, value, type) => {
    if (type === 'checkbox') {
      const currentAnswers = answers[questionId] || [];
      const newAnswers = currentAnswers.includes(value)
        ? currentAnswers.filter(v => v !== value)
        : [...currentAnswers, value];
      setAnswers({ ...answers, [questionId]: newAnswers });
    } else {
      setAnswers({ ...answers, [questionId]: value });
    }
  };
  
  const getVisibleQuestions = () => {
    if (!form) return [];
    
    // Use shuffled questions if shuffle is enabled, otherwise use original order
    const questionsToFilter = form.settings?.shuffleQuestions ? shuffledQuestions : form.questions;
    
    return questionsToFilter.filter(question => {
      if (!question.conditionalLogic || !question.conditionalLogic.enabled) {
        return true;
      }
      
      const { showIf, targetQuestionId, condition, targetValue } = question.conditionalLogic;
      const targetAnswer = answers[targetQuestionId];
      
      if (!targetAnswer) return false;
      
      switch (condition) {
        case 'equals':
          return targetAnswer === targetValue;
        case 'contains':
          return Array.isArray(targetAnswer) 
            ? targetAnswer.includes(targetValue)
            : targetAnswer.includes(targetValue);
        case 'notEquals':
          return targetAnswer !== targetValue;
        default:
          return true;
      }
    });
  };
  
  const validateAnswers = () => {
    const visibleQuestions = getVisibleQuestions();
    const errors = [];
    
    visibleQuestions.forEach(question => {
      if (question.required) {
        const answer = answers[question._id];
        if (!answer || (Array.isArray(answer) && answer.length === 0)) {
          errors.push(question.question);
        }
      }
    });
    
    return errors;
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Prevent submission in preview mode or if the viewer is a teacher/admin
    if (isPreviewMode || viewerRole === 'Teacher' || viewerRole === 'Admin') {
      setError("This form is in preview mode or you are viewing as a teacher/admin. You cannot submit responses.");
      return;
    }

    // Enforce login requirement if the form requires it
    const token = localStorage.getItem("token");
    if (form.settings?.requireLogin && !token) {
      setError("You must be logged in to submit this form. Please sign in and try again.");
      return;
    }
    
    if (alreadySubmitted) {
      setError("You have already submitted this form. Multiple submissions are not allowed.");
      return;
    }
    
    const errors = validateAnswers();
    if (errors.length > 0) {
      setError(`Please answer all required questions: ${errors.join(', ')}`);
      return;
    }
    
    try {
      setSubmitting(true);
      
      const formattedAnswers = Object.keys(answers).map(questionId => ({
        questionId,
        answer: answers[questionId],
      }));
      
      const timeSpent = Math.floor((Date.now() - startTime) / 1000);
      
      // Get respondent info from token if available, otherwise use collected email/name
      let respondent = null;
      if (token) {
        try {
          // Decode token to get user info
          const base64Url = token.split('.')[1];
          const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
          const jsonPayload = decodeURIComponent(
            atob(base64)
              .split('')
              .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
              .join('')
          );
          const decoded = JSON.parse(jsonPayload);
          respondent = {
            username: decoded.username,
            email: decoded.email,
            name: decoded.name
          };
        } catch (err) {
          console.log("Could not decode token:", err);
        }
      } else if (form.settings?.collectEmail) {
        // If form asks to collect email and user is anonymous, ensure we have an email
        if (!respondentEmail) {
          setError("This form requires an email address. Please provide your email before submitting.");
          setSubmitting(false);
          return;
        }
        respondent = {
          email: respondentEmail,
          name: respondentName || undefined
        };
      }
      
      const payload = {
        answers: formattedAnswers,
        timeSpent,
        respondent,
        startTime
      };
      
      // Submit form
      if (token) {
        await axios.post(`${API_BASE_URL}/api/forms/${formId}/responses`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        await axios.post(`${API_BASE_URL}/api/forms/${formId}/responses`, payload);
      }
      
      // Mark as submitted to prevent double submissions
      setAlreadySubmitted(true);
      setSuccess(form.settings?.confirmationMessage || "Form submitted successfully! Thank you for your response.");
      
      // Emit socket event to notify other clients that form was submitted
      try {
        const socket = io(API_BASE_URL);
        if (form.className) {
          socket.emit('form-submitted', { 
            formId: formId, 
            className: form.className,
            title: form.title 
          });
        }
        socket.disconnect();
      } catch (socketErr) {
        console.log("Could not emit socket event:", socketErr);
      }
      
      // Don't reload form - disable submission permanently
      setSubmitting(false);
    } catch (err) {
      if (err.response?.status === 409 || err.response?.data?.error?.includes("already")) {
        setAlreadySubmitted(true);
        setError("You have already submitted this form. Multiple submissions are not allowed.");
      } else {
        setError(err.response?.data?.error || "Failed to submit form");
      }
      setSubmitting(false);
    }
  };
  
  const renderQuestion = (question) => {
    const answer = answers[question._id];
    
    // Debug log
    console.log("Rendering question:", {
      id: question._id,
      type: question.type,
      title: question.title || question.question,
      hasOptions: !!question.options,
      optionsCount: question.options?.length
    });
    
    // Get options (shuffled if enabled, otherwise original)
    const getOptions = () => {
      if (form.settings?.shuffleAnswers && shuffledOptions[question._id]) {
        return shuffledOptions[question._id];
      }
      return question.options || [];
    };
    
    switch (question.type) {
      case 'short_answer':
      case 'shortAnswer':
        return (
          <Form.Control
            type="text"
            value={answer || ''}
            onChange={(e) => handleAnswerChange(question._id, e.target.value, 'short_answer')}
            placeholder="Your answer"
            required={question.required}
            disabled={isPreviewMode || alreadySubmitted}
          />
        );
        
      case 'paragraph':
        return (
          <Form.Control
            as="textarea"
            rows={4}
            value={answer || ''}
            onChange={(e) => handleAnswerChange(question._id, e.target.value, 'paragraph')}
            placeholder="Your answer"
            required={question.required}
            disabled={isPreviewMode || alreadySubmitted}
          />
        );
        
      case 'multiple_choice':
      case 'multipleChoice':
        return (
          <div>
            {getOptions().map((option, idx) => (
              <Form.Check
                key={idx}
                type="radio"
                id={`${question._id}-${idx}`}
                label={option}
                value={option}
                checked={answer === option}
                onChange={(e) => handleAnswerChange(question._id, e.target.value, 'multiple_choice')}
                required={question.required}
                disabled={isPreviewMode || alreadySubmitted}
              />
            ))}
          </div>
        );
        
      case 'checkboxes':
      case 'checkbox':
        return (
          <div>
            {getOptions().map((option, idx) => (
              <Form.Check
                key={idx}
                type="checkbox"
                id={`${question._id}-${idx}`}
                label={option}
                value={option}
                checked={(answer || []).includes(option)}
                onChange={(e) => handleAnswerChange(question._id, e.target.value, 'checkboxes')}
                disabled={isPreviewMode || alreadySubmitted}
              />
            ))}
          </div>
        );
        
      case 'dropdown':
        return (
          <Form.Select
            value={answer || ''}
            onChange={(e) => handleAnswerChange(question._id, e.target.value, 'dropdown')}
            required={question.required}
            disabled={isPreviewMode || alreadySubmitted}
          >
            <option value="">Choose...</option>
            {getOptions().map((option, idx) => (
              <option key={idx} value={option}>{option}</option>
            ))}
          </Form.Select>
        );
        
      case 'linear_scale':
      case 'linearScale':
        return (
          <div className="d-flex justify-content-between align-items-center gap-2">
            <small>{question.scaleLabels?.min || '1'}</small>
            <div className="d-flex gap-3">
              {[...Array((question.scaleMax || 5) - (question.scaleMin || 1) + 1)].map((_, idx) => {
                const value = (question.scaleMin || 1) + idx;
                return (
                  <Form.Check
                    key={idx}
                    type="radio"
                    id={`${question._id}-${value}`}
                    label={value}
                    value={value}
                    checked={answer == value}
                    onChange={(e) => handleAnswerChange(question._id, e.target.value, 'linearScale')}
                    required={question.required}
                    disabled={isPreviewMode || alreadySubmitted}
                  />
                );
              })}
            </div>
            <small>{question.scaleLabels?.max || '5'}</small>
          </div>
        );
        
      case 'date':
        return (
          <Form.Control
            type="date"
            value={answer || ''}
            onChange={(e) => handleAnswerChange(question._id, e.target.value, 'date')}
            required={question.required}
            disabled={isPreviewMode || alreadySubmitted}
          />
        );
        
      case 'time':
        return (
          <Form.Control
            type="time"
            value={answer || ''}
            onChange={(e) => handleAnswerChange(question._id, e.target.value, 'time')}
            required={question.required}
            disabled={isPreviewMode || alreadySubmitted}
          />
        );
        
      case 'file_upload':
      case 'fileUpload':
        return (
          <Form.Control
            type="file"
            onChange={(e) => handleAnswerChange(question._id, e.target.files[0], 'file_upload')}
            required={question.required}
            disabled={isPreviewMode || alreadySubmitted}
          />
        );
        
      // Philippine Question Types
      case 'true_false':
        return (
          <div>
            <Form.Check
              type="radio"
              id={`${question._id}-true`}
              label="True"
              value="True"
              checked={answer === 'True'}
              onChange={(e) => handleAnswerChange(question._id, e.target.value, 'true_false')}
              required={question.required}
              disabled={isPreviewMode || alreadySubmitted}
            />
            <Form.Check
              type="radio"
              id={`${question._id}-false`}
              label="False"
              value="False"
              checked={answer === 'False'}
              onChange={(e) => handleAnswerChange(question._id, e.target.value, 'true_false')}
              required={question.required}
              disabled={isPreviewMode || alreadySubmitted}
            />
          </div>
        );
        
      case 'identification':
        return (
          <Form.Control
            type="text"
            value={answer || ''}
            onChange={(e) => handleAnswerChange(question._id, e.target.value, 'identification')}
            placeholder="Your answer"
            required={question.required}
            disabled={isPreviewMode || alreadySubmitted}
          />
        );
        
      case 'enumeration':
        const count = question.expectedCount || 5;
        return (
          <div>
            {[...Array(count)].map((_, idx) => {
              const itemAnswers = answer ? (Array.isArray(answer) ? answer : answer.split(',')) : [];
              return (
                <Form.Group key={idx} className="mb-2">
                  <Form.Label className="fw-bold">{String.fromCharCode(97 + idx)}.</Form.Label>
                  <Form.Control
                    type="text"
                    value={itemAnswers[idx] || ''}
                    onChange={(e) => {
                      const newAnswers = [...itemAnswers];
                      newAnswers[idx] = e.target.value;
                      handleAnswerChange(question._id, newAnswers, 'enumeration');
                    }}
                    placeholder={`Item ${idx + 1}`}
                    required={question.required}
                    disabled={isPreviewMode || alreadySubmitted}
                  />
                </Form.Group>
              );
            })}
          </div>
        );
        
      case 'matching_type':
        const pairs = question.matchingPairs || [];
        return (
          <div>
            <Row className="mb-3">
              <Col xs={6}>
                <strong>Column A</strong>
              </Col>
              <Col xs={6}>
                <strong>Column B (Match)</strong>
              </Col>
            </Row>
            {pairs.map((pair, idx) => {
              const matchAnswers = answer ? (Array.isArray(answer) ? answer : []) : [];
              return (
                <Row key={idx} className="mb-3 align-items-center">
                  <Col xs={6}>
                    <div className="p-2 border rounded bg-light">
                      {idx + 1}. {pair.left}
                    </div>
                  </Col>
                  <Col xs={6}>
                    <Form.Select
                      value={matchAnswers[idx] || ''}
                      onChange={(e) => {
                        const newMatches = [...matchAnswers];
                        newMatches[idx] = e.target.value;
                        handleAnswerChange(question._id, newMatches, 'matching_type');
                      }}
                      required={question.required}
                      disabled={isPreviewMode || alreadySubmitted}
                    >
                      <option value="">Select match...</option>
                      {pairs.map((p, i) => (
                        <option key={i} value={p.right}>
                          {String.fromCharCode(65 + i)}. {p.right}
                        </option>
                      ))}
                    </Form.Select>
                  </Col>
                </Row>
              );
            })}
          </div>
        );
        
      default:
        return <p className="text-muted">Unknown question type</p>;
    }
  };
  
  if (loading) {
    return (
      <Container className="text-center py-5">
        <Spinner animation="border" />
        <p className="mt-2">Loading form...</p>
      </Container>
    );
  }
  
  if (!form) {
    return (
      <Container className="py-5">
        <Alert variant="danger">Form not found</Alert>
      </Container>
    );
  }
  
  // Check availability based on openAt and closeAt
  const now = new Date();
  const isNotYetOpen = form.settings?.openAt && now < new Date(form.settings.openAt);
  const isClosed = (form.settings?.closeAt && now > new Date(form.settings.closeAt)) 
    || (form.settings?.deadline && now > new Date(form.settings.deadline))
    || form.status === 'closed';
  
  if (isNotYetOpen) {
    const openDate = new Date(form.settings.openAt);
    return (
      <Container className="py-5">
        <Alert variant="info">
          <Alert.Heading>⏰ Form Not Yet Available</Alert.Heading>
          <p>This form will open on:</p>
          <h5>{openDate.toLocaleString()}</h5>
          <p className="mb-0 mt-3 text-muted">Please check back at the scheduled time.</p>
        </Alert>
      </Container>
    );
  }
  
  if (alreadySubmitted && !isPreviewMode) {
    return (
      <Container className="py-5">
        <Alert variant="success">
          <Alert.Heading>✅ Already Submitted</Alert.Heading>
          <p className="mb-0">You have already submitted this form. Multiple submissions are not allowed. You cannot answer this form again.</p>
        </Alert>
      </Container>
    );
  }
  
  if (isClosed) {
    return (
      <Container className="py-5">
        <Alert variant="warning">
          <Alert.Heading>🔒 Form Closed</Alert.Heading>
          <p className="mb-0">This form is no longer accepting responses.</p>
        </Alert>
      </Container>
    );
  }
  
  if (success) {
    return (
      <Container className="py-5">
        <Alert variant="success">
          <Alert.Heading>✅ {success}</Alert.Heading>
          {form.settings.showResponseSummary && (
            <p className="mb-0">You can view your response summary above.</p>
          )}
        </Alert>
      </Container>
    );
  }
  
  const visibleQuestions = getVisibleQuestions();
  const progress = form.settings.showProgressBar 
    ? (Object.keys(answers).filter(k => answers[k]).length / visibleQuestions.length) * 100 
    : 0;
  
  return (
    <Container className="py-4" style={{ maxWidth: '800px' }}>
      <Card 
        className="shadow-sm"
        style={{ 
          borderTop: `4px solid ${form.theme?.primaryColor || '#007bff'}`,
        }}
      >
        <Card.Body>
          {/* Header */}
          <div className="mb-4 pb-3 border-bottom">
            <h2 style={{ color: form.theme?.primaryColor || '#007bff' }}>
              {form.title}
            </h2>
            {form.description && (
              <p className="text-muted">{form.description}</p>
            )}
            
            {/* Philippine Exam Header */}
            {form.settings?.usePhilippineStyle && form.examHeader && (
              <div className="bg-light border rounded p-3 mt-3">
                <Row>
                  <Col md={6}>
                    <div className="mb-2">
                      <strong>Subject:</strong> {form.examHeader.subject || 'N/A'}
                    </div>
                    <div className="mb-2">
                      <strong>Teacher:</strong> {form.examHeader.teacher || 'N/A'}
                    </div>
                    <div className="mb-2">
                      <strong>Semester:</strong> {form.examHeader.semester || 'N/A'}
                    </div>
                    <div className="mb-2">
                      <strong>School Year:</strong> {form.examHeader.schoolYear || 'N/A'}
                    </div>
                  </Col>
                  <Col md={6}>
                    <div className="mb-2">
                      <strong>Date:</strong> {form.examHeader.examDate 
                        ? new Date(form.examHeader.examDate).toLocaleDateString() 
                        : 'N/A'}
                    </div>
                    <div className="mb-2">
                      <strong>Duration:</strong> {form.examHeader.duration 
                        ? `${form.examHeader.duration} minutes` 
                        : 'N/A'}
                    </div>
                    <div className="mb-2">
                      <strong>Passing Score:</strong> {form.examHeader.passingScore 
                        ? form.examHeader.passingScore 
                        : 'N/A'}
                    </div>
                  </Col>
                </Row>
              </div>
            )}
            
            {form.settings.isQuiz && !form.settings?.usePhilippineStyle && (
              <Alert variant="info" className="mb-0">
                <i className="bi bi-award me-2"></i>
                This is a quiz. Your responses will be graded.
              </Alert>
            )}
            
            {/* Timer Display */}
            {timeRemaining && (
              <Alert 
                variant={timeRemaining.hours === 0 && timeRemaining.minutes < 5 ? "danger" : "warning"}
                className="mt-3 d-flex align-items-center justify-content-between"
              >
                <div>
                  <i className="bi bi-hourglass-split me-2"></i>
                  <strong>Time Remaining:</strong> {timeRemaining.formatted}
                </div>
                {timeRemaining.hours === 0 && timeRemaining.minutes < 5 && (
                  <small>⚠️ Hurry! This form closes soon!</small>
                )}
              </Alert>
            )}
          </div>
          
          {/* Progress Bar */}
          {form.settings.showProgressBar && (
            <ProgressBar 
              now={progress} 
              label={`${Math.round(progress)}%`} 
              className="mb-4"
            />
          )}

          {/* Require login notice */}
          {form.settings?.requireLogin && !token && (
            <Alert variant="info" className="mb-3">
              <strong>Login required:</strong> You must be signed in to submit this form. Please log in and return to submit your responses.
            </Alert>
          )}

          {/* Collect email/name for anonymous respondents if enabled */}
          {!token && form.settings?.collectEmail && (
            <Card className="mb-3">
              <Card.Body>
                <Form.Group className="mb-2">
                  <Form.Label className="fw-bold">Your Name (optional)</Form.Label>
                  <Form.Control
                    type="text"
                    value={respondentName}
                    onChange={(e) => setRespondentName(e.target.value)}
                    placeholder="Full name"
                  />
                </Form.Group>
                <Form.Group>
                  <Form.Label className="fw-bold">Email address</Form.Label>
                  <Form.Control
                    type="email"
                    value={respondentEmail}
                    onChange={(e) => setRespondentEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                  />
                  <Form.Text className="text-muted">This form requires an email address to submit.</Form.Text>
                </Form.Group>
              </Card.Body>
            </Card>
          )}
          
          {error && (
            <Alert variant="danger" dismissible onClose={() => setError("")}>
              {error}
            </Alert>
          )}
          
          {/* Questions */}
          <Form onSubmit={handleSubmit}>
            {/* Philippine Style: Group by Sections */}
            {form.settings?.usePhilippineStyle && form.sections && form.sections.length > 0 ? (
              <>
                {form.sections.map((section, sectionIdx) => {
                  const sectionQuestions = visibleQuestions.filter(
                    q => q.sectionId === section._id
                  );
                  
                  if (sectionQuestions.length === 0) return null;
                  
                  return (
                    <div key={section._id} className="mb-4">
                      {/* Section Header */}
                      <div className="bg-primary text-white p-3 rounded-top">
                        <h4 className="mb-1">{section.title}</h4>
                        {section.instructions && (
                          <p className="mb-0 small">{section.instructions}</p>
                        )}
                        {section.pointsPerItem && (
                          <small className="d-block mt-1">
                            Points per item: {section.pointsPerItem}
                          </small>
                        )}
                      </div>
                      
                      {/* Section Questions */}
                      <div className="border border-top-0 rounded-bottom p-3">
                        {sectionQuestions.map((question, qIdx) => (
                          <div key={question._id} className="mb-4">
                            <Form.Group>
                              <Form.Label className="fw-bold">
                                {qIdx + 1}. {question.title || question.question}
                                {question.required && <span className="text-danger"> *</span>}
                                {question.points && (
                                  <span className="ms-2 badge bg-secondary">
                                    {question.points} {question.points === 1 ? 'pt' : 'pts'}
                                  </span>
                                )}
                              </Form.Label>
                              {question.description && (
                                <small className="text-muted d-block mb-2">
                                  {question.description}
                                </small>
                              )}
                              {renderQuestion(question)}
                            </Form.Group>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
                
                {/* Questions without section */}
                {visibleQuestions.filter(q => !q.sectionId).length > 0 && (
                  <div className="mb-4">
                    <div className="bg-secondary text-white p-3 rounded-top">
                      <h5 className="mb-0">Other Questions</h5>
                    </div>
                    <div className="border border-top-0 rounded-bottom p-3">
                      {visibleQuestions.filter(q => !q.sectionId).map((question, idx) => (
                        <Card key={question._id} className="mb-3">
                          <Card.Body>
                            <Form.Group>
                              <Form.Label className="fw-bold">
                                {idx + 1}. {question.title || question.question}
                                {question.required && <span className="text-danger"> *</span>}
                                {question.points && (
                                  <span className="ms-2 badge bg-secondary">
                                    {question.points} {question.points === 1 ? 'pt' : 'pts'}
                                  </span>
                                )}
                              </Form.Label>
                              {question.description && (
                                <small className="text-muted d-block mb-2">
                                  {question.description}
                                </small>
                              )}
                              {renderQuestion(question)}
                            </Form.Group>
                          </Card.Body>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              /* Standard Style: List all questions */
              <>
                {visibleQuestions.map((question, idx) => (
                  <Card key={question._id} className="mb-3">
                    <Card.Body>
                      <Form.Group>
                        <Form.Label className="fw-bold">
                          {idx + 1}. {question.title || question.question}
                          {question.required && <span className="text-danger"> *</span>}
                          {question.points && (
                            <span className="ms-2 badge bg-secondary">
                              {question.points} {question.points === 1 ? 'pt' : 'pts'}
                            </span>
                          )}
                        </Form.Label>
                        {question.description && (
                          <small className="text-muted d-block mb-2">
                            {question.description}
                          </small>
                        )}
                        {renderQuestion(question)}
                      </Form.Group>
                    </Card.Body>
                  </Card>
                ))}
              </>
            )}
            
            <div className="d-flex justify-content-end mt-4 gap-2">
              {success ? (
                <Alert variant="success" className="w-100 mb-0">
                  <i className="bi bi-check-circle me-2"></i>
                  {success}
                  </Alert>
                ) : (!isPreviewMode && viewerRole !== 'Teacher' && viewerRole !== 'Admin') && (
                <Button 
                  type="submit" 
                  variant="primary" 
                  size="lg"
                  disabled={submitting || alreadySubmitted}
                  style={{ 
                    backgroundColor: form.theme?.primaryColor,
                    opacity: alreadySubmitted ? 0.6 : 1
                  }}
                >
                  {alreadySubmitted ? (
                    <>
                      <i className="bi bi-check2 me-2"></i>
                      Already Submitted
                    </>
                  ) : submitting ? (
                    <>
                      <Spinner animation="border" size="sm" className="me-2" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-send me-2"></i>
                      Submit
                    </>
                  )}
                </Button>
              )}
            </div>
          </Form>
        </Card.Body>
      </Card>
    </Container>
  );
};

export default FormViewer;
