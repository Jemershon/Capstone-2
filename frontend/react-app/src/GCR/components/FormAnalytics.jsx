import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { 
  Container, Row, Col, Card, Table, Button, Alert, 
  Spinner, Badge, Dropdown, Tabs, Tab, Modal, Form
} from "react-bootstrap";
import { API_BASE_URL } from "../../api";

const FormAnalytics = () => {
  const { formId } = useParams();
  const navigate = useNavigate();
  
  const [form, setForm] = useState(null);
  const [responses, setResponses] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [activeTab, setActiveTab] = useState("summary");
  
  // Manual grading states
  const [selectedResponse, setSelectedResponse] = useState(null);
  const [showGradingModal, setShowGradingModal] = useState(false);
  const [manualScores, setManualScores] = useState({});
  const [feedback, setFeedback] = useState("");
  
  useEffect(() => {
    loadData();
  }, [formId]);
  
  const loadData = async () => {
    try {
      setLoading(true);
      
      const [formRes, responsesRes, analyticsRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/api/forms/${formId}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }),
        axios.get(`${API_BASE_URL}/api/forms/${formId}/responses`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }),
        axios.get(`${API_BASE_URL}/api/forms/${formId}/analytics`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }),
      ]);
      
      setForm(formRes.data);
      setResponses(responsesRes.data);
      setAnalytics(analyticsRes.data);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to load analytics");
    } finally {
      setLoading(false);
    }
  };
  
  const handleExportCSV = async () => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/forms/${formId}/export/csv`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
          responseType: 'blob',
        }
      );
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${form.title}_responses.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      setError("Failed to export CSV");
    }
  };
  
  const handleOpenGrading = (response) => {
    setSelectedResponse(response);
    
    // Initialize manual scores from existing response
    const scores = {};
    response.answers.forEach(answer => {
      const question = form.questions.find(q => q._id === answer.questionId);
      if (question && (question.type === 'short_answer' || question.type === 'paragraph')) {
        scores[answer.questionId] = answer.manualScore || 0;
      }
    });
    setManualScores(scores);
    setFeedback(response.feedback || "");
    setShowGradingModal(true);
  };
  
  const handleSaveGrades = async () => {
    try {
      // Calculate total score including manual grades
      let totalScore = 0;
      let totalPoints = 0;
      
      selectedResponse.answers.forEach(answer => {
        const question = form.questions.find(q => q._id === answer.questionId);
        if (!question) return;
        
        // Add to total possible points
        totalPoints += question.points || 1;
        
        // Check if this answer already has points awarded (auto-graded with partial credit)
        if (answer.pointsAwarded !== undefined) {
          // Use the already calculated points (handles partial credit)
          totalScore += answer.pointsAwarded;
        } else if (question.type === 'short_answer' || question.type === 'paragraph') {
          // Manual grading for essay/short answer questions
          totalScore += manualScores[answer.questionId] || 0;
        } else if (answer.isCorrect !== undefined) {
          // Auto-graded (simple correct/incorrect)
          totalScore += answer.isCorrect ? (question.points || 1) : 0;
        }
      });
      
      const finalPercentage = totalPoints > 0 ? (totalScore / totalPoints) * 100 : 0;
      
      // Update response with manual grades
      await axios.put(
        `${API_BASE_URL}/api/forms/${formId}/responses/${selectedResponse._id}/grade`,
        {
          manualScores,
          feedback,
          score: {
            total: totalScore,
            maxScore: totalPoints,
            percentage: finalPercentage,
            autoGraded: false
          },
        },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }
      );
      
      setSuccess("Grades saved successfully!");
      setShowGradingModal(false);
      loadData(); // Reload to show updated scores
    } catch (err) {
      setError(err.response?.data?.error || "Failed to save grades");
    }
  };
  
  const renderQuestionAnalytics = (question, questionStats) => {
    if (!questionStats) {
      return (
        <Card className="mb-3">
          <Card.Body>
            <h6>{question.question || question.title}</h6>
            <p className="text-muted">No responses yet</p>
          </Card.Body>
        </Card>
      );
    }
    
    const { type } = question;
    
    // Convert answers object to array format for display
    const answerItems = Object.entries(questionStats.answers || {}).map(([key, count]) => ({
      _id: key,
      count: count
    }));
    
    if (type === 'multiple_choice' || type === 'dropdown') {
      return (
        <Card className="mb-3">
          <Card.Body>
            <h6>{question.question || question.title}</h6>
            <div className="mt-3">
              {answerItems.length > 0 ? answerItems.map((item, idx) => {
                const percentage = (item.count / (questionStats.totalAnswers || 1)) * 100;
                return (
                  <div key={idx} className="mb-2">
                    <div className="d-flex justify-content-between mb-1">
                      <span>{item._id || 'No answer'}</span>
                      <span className="text-muted">
                        {item.count} ({percentage.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="progress" style={{ height: '24px' }}>
                      <div
                        className="progress-bar"
                        style={{ width: `${percentage}%` }}
                      >
                        {percentage > 10 && `${percentage.toFixed(1)}%`}
                      </div>
                    </div>
                  </div>
                );
              }) : <p className="text-muted">No data</p>}
            </div>
          </Card.Body>
        </Card>
      );
    }
    
    if (type === 'checkboxes') {
      return (
        <Card className="mb-3">
          <Card.Body>
            <h6>{question.question || question.title}</h6>
            <small className="text-muted">Multiple selections allowed</small>
            <div className="mt-3">
              {answerItems.length > 0 ? answerItems.map((item, idx) => {
                const percentage = (item.count / (questionStats.totalAnswers || 1)) * 100;
                return (
                  <div key={idx} className="mb-2">
                    <div className="d-flex justify-content-between mb-1">
                      <span>{item._id}</span>
                      <span className="text-muted">
                        {item.count} ({percentage.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="progress" style={{ height: '20px' }}>
                      <div
                        className="progress-bar bg-info"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              }) : <p className="text-muted">No data</p>}
            </div>
          </Card.Body>
        </Card>
      );
    }
    
    if (type === 'linearScale' || type === 'linear_scale') {
      const avgScore = questionStats.average?.toFixed(2);
      return (
        <Card className="mb-3">
          <Card.Body>
            <h6>{question.question || question.title}</h6>
            <div className="text-center my-3">
              <h2 className="text-primary">{avgScore || 'N/A'}</h2>
              <small className="text-muted">Average Score</small>
            </div>
            <div className="mt-3">
              {answerItems.length > 0 ? answerItems.map((item, idx) => {
                const percentage = (item.count / (questionStats.totalAnswers || 1)) * 100;
                return (
                  <div key={idx} className="mb-2">
                    <div className="d-flex justify-content-between mb-1">
                      <span>Rating {item._id}</span>
                      <span className="text-muted">
                        {item.count} ({percentage.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="progress" style={{ height: '20px' }}>
                      <div
                        className="progress-bar bg-warning"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              }) : <p className="text-muted">No data</p>}
            </div>
          </Card.Body>
        </Card>
      );
    }
    
    if (type === 'short_answer' || type === 'paragraph') {
      const responses = questionStats.responses || [];
      return (
        <Card className="mb-3">
          <Card.Body>
            <h6>{question.question || question.title}</h6>
            <small className="text-muted">{responses.length} responses</small>
            <div className="mt-3" style={{ maxHeight: '300px', overflowY: 'auto' }}>
              {responses.length > 0 ? responses.map((resp, idx) => (
                <div key={idx} className="border-bottom py-2">
                  <small className="text-muted">Response {idx + 1}:</small>
                  <p className="mb-0">{resp || '(empty)'}</p>
                </div>
              )) : <p className="text-muted">No responses</p>}
            </div>
          </Card.Body>
        </Card>
      );
    }
    
    return null;
  };
  
  if (loading) {
    return (
      <Container className="text-center py-5">
        <Spinner animation="border" />
        <p className="mt-2">Loading analytics...</p>
      </Container>
    );
  }
  
  if (!form || !analytics) {
    return (
      <Container className="py-5">
        <Alert variant="danger">Failed to load form analytics</Alert>
      </Container>
    );
  }
  
  return (
    <Container fluid className="py-4">
      {/* Header */}
      <Row className="mb-4">
        <Col>
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <Button 
                variant="link" 
                className="p-0 mb-2" 
                onClick={() => navigate("/teacher/forms")}
              >
                ← Back to Forms
              </Button>
              <h2>{form.title}</h2>
              <p className="text-muted">{form.description}</p>
            </div>
            <Button variant="success" onClick={handleExportCSV}>
              <i className="bi bi-download me-2"></i>
              Export CSV
            </Button>
          </div>
        </Col>
      </Row>
      
      {error && <Alert variant="danger" dismissible onClose={() => setError("")}>{error}</Alert>}
      {success && <Alert variant="success" dismissible onClose={() => setSuccess("")}>{success}</Alert>}
      
      {/* Summary Stats */}
      <Row className="mb-4">
        <Col md={3}>
          <Card className="text-center">
            <Card.Body>
              <h3 className="text-primary">{analytics.totalResponses}</h3>
              <small className="text-muted">Total Responses</small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="text-center">
            <Card.Body>
              <h3 className="text-success">
                {analytics.averageScore ? `${analytics.averageScore.toFixed(1)}%` : 'N/A'}
              </h3>
              <small className="text-muted">Average Score</small>
              {form.settings.isQuiz && form.questions.length > 0 && (
                <div className="mt-1">
                  <Badge bg="secondary">
                    Total: {form.questions.reduce((sum, q) => sum + (q.points || 0), 0)} pts
                  </Badge>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="text-center">
            <Card.Body>
              <h3 className="text-info">
                {analytics.averageCompletionTime 
                  ? `${Math.floor(analytics.averageCompletionTime / 60)}m` 
                  : 'N/A'}
              </h3>
              <small className="text-muted">Avg. Time</small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="text-center">
            <Card.Body>
              <h3 className="text-warning">
                {analytics.completionRate ? `${analytics.completionRate.toFixed(1)}%` : 'N/A'}
              </h3>
              <small className="text-muted">Completion Rate</small>
            </Card.Body>
          </Card>
        </Col>
      </Row>
      
      {/* Tabs */}
      <Tabs activeKey={activeTab} onSelect={(k) => setActiveTab(k)} className="mb-3">
        <Tab eventKey="summary" title="Question Analytics">
          <Row>
            <Col>
              {form.questions.map((question) => {
                const questionStats = analytics?.questionAnalytics?.find(
                  qs => qs.questionId === question._id || qs.questionId === question._id.toString()
                );
                return (
                  <div key={question._id}>
                    {renderQuestionAnalytics(question, questionStats)}
                  </div>
                );
              })}
            </Col>
          </Row>
        </Tab>
        
        <Tab eventKey="responses" title={`Individual Responses (${responses.length})`}>
          <Card>
            <Table responsive hover>
              <thead>
                <tr>
                  <th>Respondent</th>
                  <th>Submitted</th>
                  <th>Time Spent</th>
                  {form.settings.isQuiz && <th>Score</th>}
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {responses.map((response) => {
                  const needsGrading = form.settings.isQuiz && 
                    form.questions.some(q => 
                      (q.type === 'short_answer' || q.type === 'paragraph') && q.required
                    );
                  const hasManualQuestions = response.answers.some(answer => {
                    const question = form.questions.find(q => q._id === answer.questionId);
                    return question && (question.type === 'short_answer' || question.type === 'paragraph');
                  });
                  
                  return (
                    <tr key={response._id}>
                      <td>
                        {response.respondent
                          ? (response.respondent.name ||
                              // support older shapes where firstName/lastName were used
                              ((response.respondent.firstName || response.respondent.lastName) ? `${response.respondent.firstName || ''} ${response.respondent.lastName || ''}`.trim() : null) ||
                              response.respondent.username ||
                              response.respondent.email ||
                              'Anonymous')
                          : 'Anonymous'}
                      </td>
                      <td>
                        <small>{new Date(response.submittedAt).toLocaleString()}</small>
                      </td>
                      <td>
                        <small>{Math.floor(response.timeSpent / 60)}m {response.timeSpent % 60}s</small>
                      </td>
                      {form.settings.isQuiz && (
                        <td>
                          <div>
                            {(() => {
                              const scorePercentage = response.score?.percentage || 0;
                              return (
                                <>
                                  <Badge bg={scorePercentage >= 70 ? 'success' : scorePercentage >= 50 ? 'warning' : 'danger'}>
                                    {scorePercentage.toFixed(1)}%
                                  </Badge>
                                  {response.score && (
                                    <div className="mt-1">
                                      <small className="text-muted">
                                        {response.score.total?.toFixed(1) || 0}/{response.score.maxScore || 0} pts
                                      </small>
                                    </div>
                                  )}
                                </>
                              );
                            })()}
                          </div>
                        </td>
                      )}
                      <td>
                        {hasManualQuestions && !response.feedback ? (
                          <Badge bg="warning">Needs Grading</Badge>
                        ) : (
                          <Badge bg="success">Graded</Badge>
                        )}
                      </td>
                      <td>
                        <div className="d-flex gap-2">
                          {form.settings.isQuiz && hasManualQuestions && (
                            <Button 
                              size="sm" 
                              variant="primary"
                              onClick={() => handleOpenGrading(response)}
                            >
                              <i className="bi bi-pencil-square me-1"></i>
                              Grade
                            </Button>
                          )}
                          <Button 
                            size="sm" 
                            variant="outline-secondary"
                            onClick={() => {
                              setSelectedResponse(response);
                              // Could open a view-only modal here
                            }}
                          >
                            <i className="bi bi-eye me-1"></i>
                            View
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          </Card>
        </Tab>
      </Tabs>
      
      {/* Manual Grading Modal */}
      <Modal show={showGradingModal} onHide={() => setShowGradingModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
              Grade Response - {selectedResponse?.respondent
                ? (selectedResponse.respondent.name ||
                    ((selectedResponse.respondent.firstName || selectedResponse.respondent.lastName) ? `${selectedResponse.respondent.firstName || ''} ${selectedResponse.respondent.lastName || ''}`.trim() : null) ||
                    selectedResponse.respondent.username ||
                    selectedResponse.respondent.email ||
                    'Anonymous')
                : 'Anonymous'}
            </Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ maxHeight: '70vh', overflowY: 'auto' }}>
          {selectedResponse && (
            <>
              <Alert variant="info">
                <strong>Submitted:</strong> {new Date(selectedResponse.submittedAt).toLocaleString()}
                <br />
                <strong>Time Spent:</strong> {Math.floor(selectedResponse.timeSpent / 60)}m {selectedResponse.timeSpent % 60}s
              </Alert>
              
              {selectedResponse.answers.map((answer, idx) => {
                const question = form.questions.find(q => q._id === answer.questionId);
                if (!question) return null;
                
                const isManualGrading = question.type === 'short_answer' || question.type === 'paragraph';
                
                return (
                  <Card key={idx} className="mb-3">
                    <Card.Body>
                      <div className="mb-2">
                        <strong>Q{idx + 1}: {question.question}</strong>
                        {question.points && (
                          <Badge bg="secondary" className="ms-2">{question.points} pts</Badge>
                        )}
                      </div>
                      
                      <div className="mb-3 p-3 bg-light rounded">
                        <strong>Student Answer:</strong>
                        <p className="mb-0 mt-1">
                          {Array.isArray(answer.answer) 
                            ? answer.answer.join(', ') 
                            : answer.answer || <em className="text-muted">No answer provided</em>}
                        </p>
                      </div>
                      
                      {isManualGrading ? (
                        <Form.Group>
                          <Form.Label>Score (out of {question.points || 1} points)</Form.Label>
                          <Form.Control
                            type="number"
                            min="0"
                            max={question.points || 1}
                            step="0.5"
                            value={manualScores[question._id] || 0}
                            onChange={(e) => setManualScores({
                              ...manualScores,
                              [question._id]: parseFloat(e.target.value) || 0
                            })}
                          />
                        </Form.Group>
                      ) : (
                        <div>
                          {answer.isCorrect !== undefined && (
                            <Badge bg={answer.isCorrect ? 'success' : 'danger'}>
                              {answer.isCorrect ? '✓ Correct' : '✗ Incorrect'} 
                              ({answer.isCorrect ? question.points || 1 : 0}/{question.points || 1} pts)
                            </Badge>
                          )}
                          {question.correctAnswer && !answer.isCorrect && (
                            <div className="mt-2 text-muted">
                              <small><strong>Correct Answer:</strong> {
                                Array.isArray(question.correctAnswer) 
                                  ? question.correctAnswer.join(', ') 
                                  : question.correctAnswer
                              }</small>
                            </div>
                          )}
                        </div>
                      )}
                    </Card.Body>
                  </Card>
                );
              })}
              
              <Form.Group className="mt-4">
                <Form.Label><strong>Overall Feedback (Optional)</strong></Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  placeholder="Provide feedback for the student..."
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                />
              </Form.Group>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowGradingModal(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSaveGrades}>
            <i className="bi bi-check-circle me-2"></i>
            Save Grades
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default FormAnalytics;
