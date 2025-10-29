import React, { useEffect, useState } from "react";
import { Button, Table, Modal, Badge, Form, Card, Spinner } from "react-bootstrap";
import axios from "axios";
import { API_BASE_URL } from "../../api";

export default function ManualGradingPanel({ token }) {
  const [manualExams, setManualExams] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selectedExam, setSelectedExam] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [gradeLoading, setGradeLoading] = useState(false);
  const [gradingScore, setGradingScore] = useState(0);
  const [gradingFeedback, setGradingFeedback] = useState("");

  const headers = { Authorization: `Bearer ${localStorage.getItem("token") || token || ""}` };

  const fetchManualExams = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/api/exams/manual/list`, { headers });
      setManualExams(res.data || []);
    } catch (err) {
      console.error("Fetch manual exams error", err.response?.data || err.message);
    } finally {
      setLoading(false);
    }
  };

  const openExam = async (exam) => {
    setSelectedExam(exam);
    setShowModal(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/api/exams/manual/${exam._id}/submissions`, { headers });
      // ensure questions included
      setSubmissions(res.data || []);
    } catch (err) {
      console.error("Fetch manual submissions error", err.response?.data || err.message);
      setSubmissions([]);
    }
  };

  const handleGrade = async (submission) => {
    setSelectedSubmission(submission);
    setGradingScore(submission.finalScore || 0);
    setGradingFeedback(submission.feedback || "");
  };

  const handleReturn = async (submission) => {
    if (!selectedExam) return;
    setGradeLoading(true);
    try {
      await axios.post(
        `${API_BASE_URL}/api/exams/manual/${selectedExam._id}/submissions/${submission._id}/return`,
        {},
        { headers }
      );
      const res = await axios.get(`${API_BASE_URL}/api/exams/manual/${selectedExam._id}/submissions`, { headers });
      setSubmissions(res.data || []);
    } catch (err) {
      console.error('Return grade error', err.response?.data || err.message);
    } finally {
      setGradeLoading(false);
    }
  };

  const saveGrade = async () => {
    if (!selectedExam || !selectedSubmission) return;
    setGradeLoading(true);
    try {
      await axios.post(
        `${API_BASE_URL}/api/exams/manual/${selectedExam._id}/submissions/${selectedSubmission._id}/grade`,
        { finalScore: gradingScore, feedback: gradingFeedback },
        { headers }
      );
      // refresh submissions
      const res = await axios.get(`${API_BASE_URL}/api/exams/manual/${selectedExam._id}/submissions`, { headers });
      setSubmissions(res.data || []);
      setSelectedSubmission(null);
    } catch (err) {
      console.error("Save grade error", err.response?.data || err.message);
    } finally {
      setGradeLoading(false);
    }
  };

  useEffect(() => {
    fetchManualExams();
  }, []);

  if (loading) return <div className="p-3"><Spinner animation="border" size="sm" /> Loading manual exams...</div>;

  return (
    <Card className="mb-4">
      <Card.Header className="d-flex justify-content-between align-items-center">
        <h5 className="mb-0">Manual Grading</h5>
      </Card.Header>
      <Card.Body>
        {manualExams.length === 0 ? (
          <div className="text-muted">No manual-graded exams found.</div>
        ) : (
          <Table striped hover responsive>
            <thead>
              <tr>
                <th>Exam</th>
                <th>Created</th>
                <th>Submissions</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {manualExams.map((e) => (
          <tr key={e._id}>
            <td>{e.title || e.name || e._id}</td>
            <td>{e.due ? new Date(e.due).toLocaleString() : '-'}</td>
            <td><Badge bg="info">{e.submissionsCount ?? e.submissionCount ?? 0}</Badge></td>
                  <td>
                    <Button size="sm" onClick={() => openExam(e)}>View Submissions</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}

        <Modal show={showModal} onHide={() => { setShowModal(false); setSelectedExam(null); setSubmissions([]); }} size="lg">
          <Modal.Header closeButton>
            <Modal.Title>Submissions: {selectedExam && (selectedExam.title || selectedExam.name)}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {submissions.length === 0 ? (
              <div className="text-muted">No submissions yet.</div>
            ) : (
              <Table striped bordered responsive>
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Score</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {submissions.map((s) => (
                    <tr key={s._id}>
                      <td>{s.student}</td>
                      <td>{s.returned ? `${s.finalScore}/${(s.questions || []).length}` : '-'}</td>
                      <td>
                        {s.returned ? <Badge bg="success">Returned</Badge> : s.gradedAt ? <Badge bg="info">Graded</Badge> : <Badge bg="warning">Pending</Badge>}
                      </td>
                      <td>
                        <Button size="sm" variant="outline-primary" onClick={() => handleGrade(s)}>Grade</Button>
                        {' '}
                        {s.gradedAt && !s.returned ? (
                          <Button size="sm" variant="outline-success" onClick={() => handleReturn(s)} disabled={gradeLoading}>
                            {gradeLoading ? 'Returning...' : 'Return Grade'}
                          </Button>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => { setShowModal(false); setSelectedExam(null); setSubmissions([]); }}>Close</Button>
          </Modal.Footer>
        </Modal>

        {/* Grading modal */}
        <Modal show={!!selectedSubmission} onHide={() => setSelectedSubmission(null)} centered>
          <Modal.Header closeButton>
            <Modal.Title>Grade: {selectedSubmission && selectedSubmission.student}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {selectedSubmission && (
              <div>
                <h6>Answers</h6>
                <Table bordered responsive>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Question</th>
                      <th>Student Answer</th>
                      <th>Correct</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(selectedSubmission.questions || []).map((q, i) => (
                      <tr key={i}>
                        <td>{i + 1}</td>
                        <td>{q.text}</td>
                        <td>{(selectedSubmission.answers && selectedSubmission.answers[i] && selectedSubmission.answers[i].answer) || '-'}</td>
                        <td>{q.correctAnswer || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>

                <Form.Group className="mb-2">
                  <Form.Label>Score</Form.Label>
                  <Form.Control type="number" min={0} max={(selectedSubmission.questions || []).length} value={gradingScore} onChange={(e) => setGradingScore(Number(e.target.value))} />
                </Form.Group>
                <Form.Group className="mb-2">
                  <Form.Label>Feedback</Form.Label>
                  <Form.Control as="textarea" rows={2} value={gradingFeedback} onChange={(e) => setGradingFeedback(e.target.value)} />
                </Form.Group>
                <div className="d-flex gap-2">
                  <Button onClick={saveGrade} disabled={gradeLoading}>{gradeLoading ? 'Saving...' : 'Save Grade'}</Button>
                  <Button variant="secondary" onClick={() => setSelectedSubmission(null)}>Cancel</Button>
                </div>
              </div>
            )}
          </Modal.Body>
        </Modal>

      </Card.Body>
    </Card>
  );
}
