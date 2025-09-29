import React, { useState } from 'react';
import { Button, Form, Modal, Alert } from 'react-bootstrap';
import axios from 'axios';
import { API_BASE_URL, getAuthToken } from '../../api';

const NotificationTester = () => {
  const [showModal, setShowModal] = useState(false);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleClose = () => {
    setShowModal(false);
    setSuccess(false);
    setError('');
  };

  const handleShow = () => setShowModal(true);

  const sendTestNotification = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      await axios.post(
        `${API_BASE_URL}/api/test-notification`, 
        { message },
        { headers: { Authorization: `Bearer ${getAuthToken()}` } }
      );
      
      setSuccess(true);
    } catch (err) {
      console.error('Error sending test notification:', err);
      setError(err.response?.data?.error || 'Failed to send test notification');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button 
        variant="info" 
        size="sm" 
        onClick={handleShow} 
        className="ms-2"
        title="Test real-time notifications"
      >
        🔔 Test Notifications
      </Button>

      <Modal show={showModal} onHide={handleClose}>
        <Modal.Header closeButton>
          <Modal.Title>Test Real-time Notifications</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>Send a test notification to yourself to verify real-time functionality.</p>
          
          {error && <Alert variant="danger">{error}</Alert>}
          {success && <Alert variant="success">Notification sent successfully!</Alert>}
          
          <Form onSubmit={sendTestNotification}>
            <Form.Group className="mb-3">
              <Form.Label>Notification Message</Form.Label>
              <Form.Control
                type="text"
                placeholder="Enter notification message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
              />
            </Form.Group>
            
            <Button 
              variant="primary" 
              type="submit" 
              disabled={loading || !message}
            >
              {loading ? 'Sending...' : 'Send Test Notification'}
            </Button>
          </Form>
        </Modal.Body>
      </Modal>
    </>
  );
};

export default NotificationTester;