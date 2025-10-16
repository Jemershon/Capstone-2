import React, { useState } from 'react';
import { Container, Row, Col, Card, Form, Button, Spinner } from 'react-bootstrap';
import axios from 'axios';
import { API_BASE_URL } from '../api';

export default function RequestOTP() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setMessage('');
  if (!email) return setError('Email is required');
    setLoading(true);
    try {
  await axios.post(`${API_BASE_URL}/api/request-reset-otp`, { email });
  setMessage('If an account with that email exists, an OTP was sent.');
    } catch (err) {
      console.error('Request OTP error:', err);
      setError(err.response?.data?.error || 'Failed to request OTP');
    } finally { setLoading(false); }
  };

  return (
    <Container className="mt-5">
      <Row className="justify-content-center">
        <Col md={6}>
          <Card>
            <Card.Header><h3 className="mb-0">Request Password Reset (OTP)</h3></Card.Header>
            <Card.Body>
              <Form onSubmit={handleSubmit}>
                <Form.Floating className="mb-3">
                  <Form.Control id="email" name="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} />
                  <label htmlFor="email">Email</label>
                </Form.Floating>

                {error && <div className="alert alert-danger">{error}</div>}
                {message && <div className="alert alert-success">{message}</div>}

                <Button type="submit" className="w-100" disabled={loading}>{loading ? <Spinner size="sm" animation="border"/> : 'Send OTP'}</Button>
              </Form>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
}
