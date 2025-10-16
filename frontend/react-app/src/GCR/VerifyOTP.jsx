import React, { useState } from 'react';
import { Container, Row, Col, Card, Form, Button, Spinner } from 'react-bootstrap';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../api';

export default function VerifyOTP(){
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setMessage('');
  if (!email || !otp || !newPassword) return setError('All fields are required');
    setLoading(true);
    try {
  await axios.post(`${API_BASE_URL}/api/verify-reset-otp`, { email, otp, newPassword });
      setMessage('Password reset successfully. Redirecting to login...');
      setTimeout(() => navigate('/'), 2000);
    } catch (err) {
      console.error('Verify OTP error:', err);
      setError(err.response?.data?.error || 'Failed to verify OTP');
    } finally { setLoading(false); }
  };

  return (
    <Container className="mt-5">
      <Row className="justify-content-center">
        <Col md={6}>
          <Card>
            <Card.Header><h3 className="mb-0">Verify OTP & Reset Password</h3></Card.Header>
            <Card.Body>
              <Form onSubmit={handleSubmit}>
                <Form.Floating className="mb-3">
                  <Form.Control id="email" name="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} />
                  <label htmlFor="email">Email</label>
                </Form.Floating>

                <Form.Floating className="mb-3">
                  <Form.Control id="otp" name="otp" placeholder="123456" value={otp} onChange={e => setOtp(e.target.value)} />
                  <label htmlFor="otp">OTP</label>
                </Form.Floating>

                <Form.Floating className="mb-3">
                  <Form.Control id="newPassword" name="newPassword" type="password" placeholder="New Password" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
                  <label htmlFor="newPassword">New Password</label>
                </Form.Floating>

                {error && <div className="alert alert-danger">{error}</div>}
                {message && <div className="alert alert-success">{message}</div>}

                <Button type="submit" className="w-100" disabled={loading}>{loading ? <Spinner size="sm" animation="border"/> : 'Verify & Reset'}</Button>
              </Form>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
}
