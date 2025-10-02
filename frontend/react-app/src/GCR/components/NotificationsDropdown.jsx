import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { 
  Button, Badge, Dropdown, ListGroup, Spinner, Modal 
} from 'react-bootstrap';
import { API_BASE_URL, getAuthToken } from '../../api';
import { io } from 'socket.io-client';

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

function NotificationsDropdown() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showAllNotifications, setShowAllNotifications] = useState(false);
  
  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const token = getAuthToken();
      if (!token) {
        console.log('No auth token available');
        setLoading(false);
        return;
      }
      
      const res = await retry(() => 
        axios.get(`${API_BASE_URL}/api/notifications`, {
          params: { limit: 5 },
          headers: { Authorization: `Bearer ${token}` }
        })
      );
      
      console.log('Notifications fetched:', res.data);
      setNotifications(res.data.notifications || []);
      setUnreadCount(res.data.unreadCount || 0);
    } catch (err) {
      console.error('Fetch notifications error:', err.response?.data || err.message);
      // Set empty notifications on error to prevent crashes
      setNotifications([]);
      setUnreadCount(0);
    } finally {
      setLoading(false);
    }
  }, []);
  
  // Reference to socket instance to maintain connection
  const socketRef = useRef(null);
  
  useEffect(() => {
    fetchNotifications();
    
    // Set up Socket.IO connection for real-time notifications
    const token = getAuthToken();
    if (token) {
      try {
        console.log("Setting up socket connection for notifications...");
        // Create socket connection
        const socket = io(API_BASE_URL, {
          transports: ['websocket', 'polling'],
          timeout: 10000,
          reconnection: true,
          reconnectionDelay: 1000,
          reconnectionAttempts: 5
        });
        socketRef.current = socket;
        
        // Socket connection events
        socket.on('connect', () => {
          console.log('✅ Connected to notification server, socket ID:', socket.id);
          socket.emit('authenticate', token);
        });
        
        socket.on('connect_error', (error) => {
          console.error('❌ Socket connection error:', error);
        });
        
        socket.on('disconnect', (reason) => {
          console.log('🔌 Socket disconnected:', reason);
        });
        
        // Listen for new notifications
        socket.on('new-notification', (notification) => {
          console.log('🔔 Received new notification:', notification);
          // Add the new notification to the top of the list
          setNotifications(prev => [notification, ...prev.slice(0, 4)]);
          // Increment unread count
          setUnreadCount(prev => prev + 1);
          
          // Show browser notification if supported
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('New Notification', {
              body: notification.message,
              icon: '/favicon.ico'
            });
          }
        });
        
        // Request notification permission if not already granted
        if ('Notification' in window && Notification.permission !== 'denied') {
          Notification.requestPermission();
        }
      } catch (error) {
        console.error('Error setting up socket connection:', error);
      }
    }
    
    return () => {
      // Clean up socket connection when component unmounts
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [fetchNotifications]);
  
  const handleMarkAsRead = async (notificationId) => {
    try {
      const token = getAuthToken();
      if (!token) {
        console.error('No auth token available');
        return;
      }
      
      await retry(() => 
        axios.put(`${API_BASE_URL}/api/notifications/${notificationId}/read`, {}, {
          headers: { Authorization: `Bearer ${token}` }
        })
      );
      
      // Update notification in the local state
      setNotifications(prevNotifications => 
        prevNotifications.map(notification => 
          notification._id === notificationId ? { ...notification, read: true } : notification
        )
      );
      
      // Update unread count
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Mark notification read error:', err.response?.data || err.message);
    }
  };
  
  const handleMarkAllAsRead = async () => {
    try {
      const token = getAuthToken();
      if (!token) {
        console.error('No auth token available');
        return;
      }
      
      await retry(() => 
        axios.put(`${API_BASE_URL}/api/notifications/read-all`, {}, {
          headers: { Authorization: `Bearer ${token}` }
        })
      );
      
      // Update all notifications in the local state
      setNotifications(prevNotifications => 
        prevNotifications.map(notification => ({ ...notification, read: true }))
      );
      
      // Reset unread count
      setUnreadCount(0);
    } catch (err) {
      console.error('Mark all notifications read error:', err.response?.data || err.message);
    }
  };
  
  const handleDeleteNotification = async (notificationId) => {
    try {
      const token = getAuthToken();
      if (!token) {
        console.error('No auth token available');
        return;
      }
      
      await retry(() => 
        axios.delete(`${API_BASE_URL}/api/notifications/${notificationId}`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      );
      
      // Remove notification from the local state
      const notification = notifications.find(n => n._id === notificationId);
      setNotifications(prevNotifications => 
        prevNotifications.filter(n => n._id !== notificationId)
      );
      
      // Decrease unread count if the deleted notification was unread
      if (notification && !notification.read) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error('Delete notification error:', err.response?.data || err.message);
    }
  };
  
  // Test notification function
  const sendTestNotification = async () => {
    try {
      const token = getAuthToken();
      if (!token) {
        console.error('No auth token available');
        return;
      }
      
      await axios.post(`${API_BASE_URL}/api/test-notification`, {
        message: `Test notification sent at ${new Date().toLocaleTimeString()}`
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      console.log('Test notification sent');
      // Refresh notifications to show the new one
      fetchNotifications();
    } catch (err) {
      console.error('Send test notification error:', err.response?.data || err.message);
    }
  };
  
  const getNotificationIcon = (type) => {
    switch(type) {
      case 'assignment':
        return '📝';
      case 'announcement':
        return '📢';
      case 'grade':
        return '🏆';
      case 'comment':
        return '💬';
      case 'material':
        return '📚';
      default:
        return '🔔';
    }
  };
  
  return (
    <>
      <Dropdown>
        <Dropdown.Toggle variant="light" id="dropdown-notifications" className="position-relative">
          <i className="bi bi-bell"></i>
          {unreadCount > 0 && (
            <Badge 
              pill 
              bg="danger" 
              className="position-absolute top-0 start-100 translate-middle"
              style={{ fontSize: '0.6rem' }}
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Dropdown.Toggle>
        
        <Dropdown.Menu align="end" style={{ width: '300px', maxHeight: '400px', overflowY: 'auto' }}>
          <div className="d-flex justify-content-between align-items-center px-3 py-2">
            <h6 className="mb-0">Notifications</h6>
            <div className="d-flex gap-2">
              <Button
                variant="outline-primary"
                size="sm"
                onClick={sendTestNotification}
                title="Send test notification"
              >
                Test
              </Button>
              {unreadCount > 0 && (
                <Button
                  variant="link"
                  size="sm"
                  className="p-0 text-primary"
                  onClick={handleMarkAllAsRead}
                >
                  Mark all as read
                </Button>
              )}
            </div>
          </div>
          
          <Dropdown.Divider className="my-1" />
          
          {loading ? (
            <div className="text-center py-3">
              <Spinner animation="border" size="sm" />
              <span className="ms-2">Loading...</span>
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center text-muted py-3">No notifications</div>
          ) : (
            <>
              {notifications.slice(0, 5).map(notification => (
                <Dropdown.Item 
                  key={notification._id}
                  className={`px-3 py-2 ${!notification.read ? 'bg-light' : ''}`}
                  onClick={() => handleMarkAsRead(notification._id)}
                >
                  <div className="d-flex">
                    <div className="me-2">
                      <span role="img" aria-label={notification.type}>
                        {getNotificationIcon(notification.type)}
                      </span>
                    </div>
                    <div className="flex-grow-1" style={{ fontSize: '0.9rem' }}>
                      <div>{notification.message}</div>
                      <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                        {new Date(notification.createdAt).toLocaleString()}
                      </div>
                    </div>
                    <Button
                      variant="link"
                      size="sm"
                      className="p-0 text-danger"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteNotification(notification._id);
                      }}
                    >
                      <i className="bi bi-x"></i>
                    </Button>
                  </div>
                </Dropdown.Item>
              ))}
              
              {notifications.length > 5 && (
                <div className="text-center py-2">
                  <Button
                    variant="link"
                    size="sm"
                    onClick={() => setShowAllNotifications(true)}
                  >
                    View all notifications
                  </Button>
                </div>
              )}
            </>
          )}
        </Dropdown.Menu>
      </Dropdown>
      
      <Modal
        show={showAllNotifications}
        onHide={() => setShowAllNotifications(false)}
        centered
        scrollable
      >
        <Modal.Header closeButton>
          <Modal.Title>All Notifications</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {loading ? (
            <div className="text-center py-3">
              <Spinner animation="border" />
              <div>Loading notifications...</div>
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center text-muted py-3">No notifications</div>
          ) : (
            <ListGroup variant="flush">
              {notifications.map(notification => (
                <ListGroup.Item 
                  key={notification._id}
                  className={`d-flex py-3 ${!notification.read ? 'bg-light' : ''}`}
                >
                  <div className="me-2">
                    <span role="img" aria-label={notification.type}>
                      {getNotificationIcon(notification.type)}
                    </span>
                  </div>
                  <div className="flex-grow-1">
                    <div>{notification.message}</div>
                    <div className="text-muted" style={{ fontSize: '0.8rem' }}>
                      {new Date(notification.createdAt).toLocaleString()}
                    </div>
                    <div className="mt-2">
                      {!notification.read && (
                        <Button
                          variant="outline-primary"
                          size="sm"
                          className="me-2"
                          onClick={() => handleMarkAsRead(notification._id)}
                        >
                          Mark as read
                        </Button>
                      )}
                      <Button
                        variant="outline-danger"
                        size="sm"
                        onClick={() => handleDeleteNotification(notification._id)}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                </ListGroup.Item>
              ))}
            </ListGroup>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowAllNotifications(false)}>
            Close
          </Button>
          {unreadCount > 0 && (
            <Button variant="primary" onClick={handleMarkAllAsRead}>
              Mark all as read
            </Button>
          )}
        </Modal.Footer>
      </Modal>
    </>
  );
}

export default NotificationsDropdown;