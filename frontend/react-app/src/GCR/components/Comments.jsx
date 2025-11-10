import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Button, Form, ListGroup, Spinner, Toast, Badge } from 'react-bootstrap';
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
  const [userRole, setUserRole] = useState(localStorage.getItem('userRole') || '');
  const [username, setUsername] = useState(localStorage.getItem('username') || '');
  
  // Reply state
  const [replyTo, setReplyTo] = useState(null); // ID of comment being replied to
  const [replyContent, setReplyContent] = useState('');
  
  // Reactions state
  const [reactions, setReactions] = useState({});
  const [userReaction, setUserReaction] = useState(null);
  const [totalReactions, setTotalReactions] = useState(0);
  const [reacting, setReacting] = useState(false);
  
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
    fetchReactions();
  }, [fetchComments]);
  
  const fetchReactions = useCallback(async () => {
    if (!referenceId) return;
    
    try {
      const res = await retry(() => 
        axios.get(`${API_BASE_URL}/api/reactions`, {
          params: {
            referenceType,
            referenceId,
          },
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        })
      );
      setReactions(res.data.reactions || {});
      setUserReaction(res.data.userReaction);
      setTotalReactions(res.data.totalReactions || 0);
    } catch (err) {
      console.error('Fetch reactions error:', err.response?.data || err.message);
    }
  }, [referenceId, referenceType]);
  
  const handleReaction = async (reactionType = 'heart') => {
    if (reacting) return;
    
    setReacting(true);
    try {
      await retry(() => 
        axios.post(
          `${API_BASE_URL}/api/reactions`,
          {
            referenceType,
            referenceId,
            reactionType,
            class: className,
          },
          { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
        )
      );
      
      await fetchReactions();
    } catch (err) {
      console.error('Add reaction error:', err.response?.data || err.message);
      setError(err.response?.data?.error || 'Failed to add reaction.');
      setShowToast(true);
    } finally {
      setReacting(false);
    }
  };
  
  const handleAddComment = async (e, parentCommentId = null) => {
    e.preventDefault();
    const content = parentCommentId ? replyContent : newComment;
    
    if (!content.trim()) return;
    
    setPosting(true);
    try {
      await retry(() => 
        axios.post(
          `${API_BASE_URL}/api/comments`,
          {
            content,
            referenceType,
            referenceId,
            class: className,
            parentComment: parentCommentId,
          },
          { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
        )
      );
      
      if (parentCommentId) {
        setReplyContent('');
        setReplyTo(null);
      } else {
        setNewComment('');
      }
      
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
      {/* Reactions Section */}
      <div className="reactions-section mb-3">
        <div className="d-flex align-items-center gap-2">
          <Button
            variant={userReaction === 'heart' ? 'danger' : 'outline-danger'}
            size="sm"
            onClick={() => handleReaction('heart')}
            disabled={reacting}
            className="d-flex align-items-center gap-1"
          >
            <i className="bi bi-heart-fill"></i>
            {reactions.heart || 0}
          </Button>
          
          {totalReactions > 0 && (
            <small className="text-muted">
              {totalReactions} {totalReactions === 1 ? 'reaction' : 'reactions'}
            </small>
          )}
        </div>
      </div>
      
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
        <Form.Group className="d-flex align-items-center" style={{ gap: 0 }}>
          <Form.Control
            type="text"
            placeholder="Add a comment..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            disabled={posting}
            style={{ borderTopRightRadius: 0, borderBottomRightRadius: 0, fontSize: 16, minHeight: 44 }}
          />
          <Button
            type="submit"
            variant="warning"
            style={{
              minWidth: 80,
              borderTopLeftRadius: 0,
              borderBottomLeftRadius: 0,
              fontWeight: 600,
              color: '#a30c0c',
              fontSize: 16,
              minHeight: 44,
              boxShadow: 'none',
              whiteSpace: 'nowrap',
              padding: '0 18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            className="shadow-none"
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
            <ListGroup.Item key={comment._id} className="px-0 py-3 border-bottom">
              {/* Main Comment */}
              <div className="d-flex justify-content-between align-items-start mb-2">
                <div className="flex-grow-1">
                  <div className="d-flex align-items-center gap-2">
                    <div className="fw-bold">{comment.authorName || comment.author}</div>
                    <Badge bg="secondary" pill style={{ fontSize: '0.65rem' }}>
                      {comment.authorRole}
                    </Badge>
                  </div>
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
                    <i className="bi bi-trash"></i>
                  </Button>
                )}
              </div>
              
              <div className="mb-2">{comment.content}</div>
              
              {/* Reply Button */}
              <Button
                variant="link"
                size="sm"
                className="p-0 text-primary"
                onClick={() => setReplyTo(replyTo === comment._id ? null : comment._id)}
                style={{ fontSize: '0.85rem' }}
              >
                <i className="bi bi-reply"></i> Reply
                {comment.replies && comment.replies.length > 0 && ` (${comment.replies.length})`}
              </Button>
              
              {/* Reply Form */}
              {replyTo === comment._id && (
                <Form onSubmit={(e) => handleAddComment(e, comment._id)} className="mt-2 ms-4">
                  <Form.Group className="d-flex">
                    <Form.Control
                      type="text"
                      placeholder={`Reply to ${comment.authorName || comment.author}...`}
                      value={replyContent}
                      onChange={(e) => setReplyContent(e.target.value)}
                      disabled={posting}
                      size="sm"
                    />
                    <Button
                      type="submit"
                      variant="primary"
                      size="sm"
                      className="ms-2"
                      disabled={!replyContent.trim() || posting}
                    >
                      {posting ? 'Posting...' : 'Reply'}
                    </Button>
                    <Button
                      variant="outline-secondary"
                      size="sm"
                      className="ms-2"
                      onClick={() => {
                        setReplyTo(null);
                        setReplyContent('');
                      }}
                    >
                      Cancel
                    </Button>
                  </Form.Group>
                </Form>
              )}
              
              {/* Display Replies */}
              {comment.replies && comment.replies.length > 0 && (
                <div className="ms-4 mt-3 border-start border-2 ps-3">
                  {comment.replies.map(reply => (
                    <div key={reply._id} className="mb-3">
                      <div className="d-flex justify-content-between align-items-start mb-1">
                        <div className="flex-grow-1">
                          <div className="d-flex align-items-center gap-2">
                            <div className="fw-bold" style={{ fontSize: '0.9rem' }}>
                              {reply.authorName || reply.author}
                            </div>
                            <Badge bg="secondary" pill style={{ fontSize: '0.6rem' }}>
                              {reply.authorRole}
                            </Badge>
                          </div>
                          <div className="text-muted" style={{ fontSize: '0.7rem' }}>
                            {new Date(reply.createdAt).toLocaleString()}
                          </div>
                        </div>
                        {(username === reply.author || userRole === 'Teacher' || userRole === 'Admin') && (
                          <Button
                            variant="link"
                            size="sm"
                            className="text-danger p-0"
                            onClick={() => handleDeleteComment(reply._id)}
                          >
                            <i className="bi bi-trash" style={{ fontSize: '0.85rem' }}></i>
                          </Button>
                        )}
                      </div>
                      <div style={{ fontSize: '0.9rem' }}>{reply.content}</div>
                    </div>
                  ))}
                </div>
              )}
            </ListGroup.Item>
          ))
        )}
      </ListGroup>
    </div>
  );
}

export default Comments;