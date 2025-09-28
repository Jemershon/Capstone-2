import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Button, Form, ListGroup, Spinner, Toast } from 'react-bootstrap';
import { API_BASE_URL } from '../../api';

// Retry function for API calls
const retry = async (fn, retries = 3, delay = 1000) => {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (err) {
      if (i === retries - 1) throw err;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
};

function Comments({ referenceType, referenceId, className }) {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [userRole, setUserRole] = useState(localStorage.getItem('role') || '');
  const [username, setUsername] = useState(localStorage.getItem('username') || '');
  
  const fetchComments = useCallback(async () => {
    if (!referenceId) {
      setComments([]);
      setLoading(false);
      return;
    }
    
    setLoading(true);
    try {
      const res = await retry(() => 
        axios.get(`${API_BASE_URL}/api/comments`, {
          params: {
            referenceType,
            referenceId,
          },
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        })
      );
      setComments(res.data || []);
    } catch (err) {
      console.error('Fetch comments error:', err.response?.data || err.message);
      setError(err.response?.data?.error || 'Failed to load comments.');
      setShowToast(true);
    } finally {
      setLoading(false);
    }
  }, [referenceId, referenceType]);
  
  useEffect(() => {
    fetchComments();
  }, [fetchComments]);
  
  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    
    setPosting(true);
    try {
      await retry(() => 
        axios.post(
          `${API_BASE_URL}/api/comments`,
          {
            content: newComment,
            referenceType,
            referenceId,
            class: className,
          },
          { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
        )
      );
      
      setNewComment('');
      await fetchComments();
    } catch (err) {
      console.error('Add comment error:', err.response?.data || err.message);
      setError(err.response?.data?.error || 'Failed to add comment.');
      setShowToast(true);
    } finally {
      setPosting(false);
    }
  };
  
  const handleDeleteComment = async (commentId) => {
    try {
      await retry(() => 
        axios.delete(`${API_BASE_URL}/api/comments/${commentId}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        })
      );
      await fetchComments();
    } catch (err) {
      console.error('Delete comment error:', err.response?.data || err.message);
      setError(err.response?.data?.error || 'Failed to delete comment.');
      setShowToast(true);
    }
  };
  
  if (loading) {
    return (
      <div className="text-center py-2">
        <Spinner animation="border" size="sm" role="status" aria-label="Loading comments" />
        <span className="ms-2">Loading comments...</span>
      </div>
    );
  }
  
  return (
    <div className="comments-section mt-3">
      <h6 className="mb-2">Comments</h6>
      
      {error && (
        <Toast
          show={showToast}
          onClose={() => setShowToast(false)}
          delay={5000}
          autohide
          bg="danger"
          style={{ position: 'fixed', top: '20px', right: '20px', zIndex: 10000 }}
        >
          <Toast.Body className="text-white">{error}</Toast.Body>
        </Toast>
      )}
      
      <Form onSubmit={handleAddComment} className="mb-3">
        <Form.Group className="d-flex">
          <Form.Control
            type="text"
            placeholder="Add a comment..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            disabled={posting}
          />
          <Button
            type="submit"
            variant="primary"
            className="ms-2"
            disabled={!newComment.trim() || posting}
          >
            {posting ? 'Posting...' : 'Post'}
          </Button>
        </Form.Group>
      </Form>
      
      <ListGroup variant="flush">
        {comments.length === 0 ? (
          <div className="text-muted text-center py-2">No comments yet</div>
        ) : (
          comments.map(comment => (
            <ListGroup.Item key={comment._id} className="px-0 py-2">
              <div className="d-flex justify-content-between">
                <div>
                  <div className="fw-bold">{comment.author}</div>
                  <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                    {new Date(comment.createdAt).toLocaleString()}
                  </div>
                </div>
                {(username === comment.author || userRole === 'Teacher' || userRole === 'Admin') && (
                  <Button
                    variant="link"
                    size="sm"
                    className="text-danger p-0"
                    onClick={() => handleDeleteComment(comment._id)}
                  >
                    Delete
                  </Button>
                )}
              </div>
              <div className="mt-1">{comment.content}</div>
            </ListGroup.Item>
          ))
        )}
      </ListGroup>
    </div>
  );
}

export default Comments;