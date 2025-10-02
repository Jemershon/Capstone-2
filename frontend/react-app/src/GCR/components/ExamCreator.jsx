import React, { useState } from 'react';
import axios from 'axios';
import { Button, Form, Alert, Card } from 'react-bootstrap';
import { API_BASE_URL, getAuthToken, getUsername } from '../../api';

/**
 * A simple component to test creating exams
 */
const ExamCreator = ({ className, onExamCreated }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    if (!title) {
      setError('Title is required');
      setIsLoading(false);
      return;
    }

    try {
      const token = getAuthToken();
      const username = getUsername();

      if (!token) {
        setError('You must be logged in to create an exam');
        setIsLoading(false);
        return;
      }

      // Debug information
      console.log('Debug Info:', {
        apiBaseUrl: API_BASE_URL,
        className,
        username,
        tokenFirstChars: token ? token.substring(0, 10) + '...' : 'none',
      });

      // Create a simple exam with one question
      const examData = {
        title,
        description,
        class: className,        // Using 'class' field as in the model
        className: className,    // Also include 'className' field as backup
        createdBy: username || 'unknown-user',
        due: dueDate || null,    // Add due date to exam data
        questions: [
          {
            text: 'Test question',
            type: 'short',
            options: [],
            correctAnswer: ''
          }
        ]
      };

      console.log('📝 Creating exam with data:', examData);
      console.log('🔗 Using API URL:', `${API_BASE_URL}/api/exams`);

      // First test API connectivity
      try {
        const testResponse = await axios.get(`${API_BASE_URL}/api/test`);
        console.log('✅ API test successful:', testResponse.data);
      } catch (testError) {
        console.error('❌ API test failed:', testError);
        setError('Cannot connect to API server. Please check if the backend is running.');
        setIsLoading(false);
        return;
      }

      // Now create the exam
      const response = await axios.post(
        `${API_BASE_URL}/api/exams`,
        examData,
        {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('Exam creation response:', response.data);
      setSuccess(`Exam "${title}" created successfully!`);
      setTitle('');
      setDescription('');
      setDueDate('');

      // Call the callback if provided
      if (onExamCreated && typeof onExamCreated === 'function') {
        onExamCreated(response.data.exam);
      }
    } catch (error) {
      console.error('Error creating exam:', error);
      setError(
        error.response?.data?.error ||
        error.message ||
        'An error occurred while creating the exam'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="mb-4">
      <Card.Header className="bg-light">
        <h5 className="mb-0">Create a Test Exam</h5>
      </Card.Header>
      <Card.Body>
        {error && <Alert variant="danger">{error}</Alert>}
        {success && <Alert variant="success">{success}</Alert>}

        <Form onSubmit={handleSubmit}>
          <Form.Group className="mb-3">
            <Form.Label>Title</Form.Label>
            <Form.Control
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter exam title"
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Description (optional)</Form.Label>
            <Form.Control
              as="textarea"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter exam description"
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Due Date (optional)</Form.Label>
            <Form.Control
              type="datetime-local"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
            <Form.Text className="text-muted">
              Set a due date to enable early/late submission credit point bonuses/penalties. 
              Early: +1 credit point, Late: -1 credit point.
            </Form.Text>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Text className="text-muted">
              This will create a basic exam for class: <strong>{className}</strong>
            </Form.Text>
          </Form.Group>

          <Button
            variant="primary"
            type="submit"
            disabled={isLoading}
          >
            {isLoading ? 'Creating...' : 'Create Test Exam'}
          </Button>
        </Form>
      </Card.Body>
    </Card>
  );
};

export default ExamCreator;