import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { 
  Button, Badge, Dropdown, ListGroup, Spinner, Modal 
} from 'react-bootstrap';
import { API_BASE_URL, getAuthToken } from '../../api';
import { getSocket, ensureSocketConnected } from '../../socketClient';

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

function NotificationsDropdown({ inNavbar = false, mobileMode = false }) {
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
  
  // Reference to socket connection status
  const socketRef = useRef(null);

  useEffect(() => {
    fetchNotifications();

    const token = getAuthToken();
    if (!token) return;

    // Use the shared socket client to avoid multiple connections
    const socket = getSocket();
    socketRef.current = socket;

    try {
      // Ensure the socket is connected and authenticated
      ensureSocketConnected();

      // Attach listener for new notifications
      const onNewNotification = (notification) => {
        console.log('[NotificationsDropdown] Received notification via socket:', notification);
        console.log('[NotificationsDropdown] Current user from token:', token ? JSON.parse(atob(token.split('.')[1])) : 'No token');
        
        // Safety check: Don't show notifications where current user is the sender
        const currentUser = token ? JSON.parse(atob(token.split('.')[1])).username : null;
        if (notification.sender && currentUser && notification.sender === currentUser) {
          console.log('[NotificationsDropdown] Ignoring notification from self:', notification.sender);
          return;
        }
        
        setNotifications(prev => [notification, ...prev.slice(0, 4)]);
        setUnreadCount(prev => prev + 1);
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('New Notification', { body: notification.message, icon: '/favicon.ico' });
        }
      };

      socket.on('new-notification', onNewNotification);

      // Request notification permission if not already denied
      if ('Notification' in window && Notification.permission !== 'denied') {
        Notification.requestPermission();
      }

      // Save handler on ref for cleanup
      socketRef.current._onNewNotification = onNewNotification;
    } catch (err) {
      console.debug('Socket setup skipped or failed:', err.message || err);
    }

    return () => {
      try {
        if (socketRef.current && socketRef.current._onNewNotification) {
          socketRef.current.off('new-notification', socketRef.current._onNewNotification);
          delete socketRef.current._onNewNotification;
        }
      } catch (e) {
        // ignore cleanup errors
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
  
  // Menu content (used inside Dropdown.Menu or inside modal body)
  const menuContent = (
    <>
      <div className="d-flex justify-content-between align-items-center px-3 py-2 border-bottom">
        <h6 className="mb-0">Notifications</h6>
        {unreadCount > 0 && (
          <Button
            variant="link"
            size="sm"
            className="p-0 text-primary text-decoration-none"
            onClick={handleMarkAllAsRead}
            style={{ whiteSpace: 'nowrap', fontSize: '0.85rem' }}
          >
            Mark all read
          </Button>
        )}
      </div>

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
            <div key={notification._id} className={`px-3 py-2 border-bottom notification-item ${!notification.read ? 'bg-unread-notification' : ''}`} style={{cursor: 'pointer', whiteSpace: 'normal'}} onClick={() => handleMarkAsRead(notification._id)}>
              <div className="d-flex align-items-start gap-2">
                <div className="flex-shrink-0 position-relative">
                  <span role="img" aria-label={notification.type} style={{ fontSize: '1.2rem' }}>
                    {getNotificationIcon(notification.type)}
                  </span>
                  {!notification.read && (
                    <span className="unread-dot" style={{position:'absolute',top:0,right:-6,width:8,height:8,borderRadius:'50%',background:'#ffc107',border:'1px solid #fff'}}></span>
                  )}
                </div>
                <div className="flex-grow-1 notification-item-content">
                  <div className="notification-message" style={{ fontSize: '0.9rem', lineHeight: '1.4' }}>
                    {notification.message}
                  </div>
                  <div className="text-muted mt-1" style={{ fontSize: '0.75rem' }}>
                    {new Date(notification.createdAt).toLocaleString()}
                  </div>
                </div>
                <Button
                  variant="link"
                  className="p-0 text-danger flex-shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteNotification(notification._id);
                  }}
                  style={{ fontSize: '1rem', lineHeight: 1 }}
                  title="Delete notification"
                >
                  <i className="bi bi-x-circle-fill"></i>
                </Button>
              </div>
            </div>
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
    </>
  );

  return (
    <>
      <style>{`
        .bg-unread-notification {
          background-color: #fffbe6 !important;
          border-left: 4px solid #ffc107 !important;
        }
        .unread-dot {
          display: inline-block;
        }
          /* Responsive dropdown for mobile */
          @media (max-width: 576px) {
            .notifications-dropdown-menu {
              width: 90vw !important;
              max-width: 350px !important;
              position: fixed !important;
              right: 10px !important;
              left: auto !important;
              transform: none !important;
            }
          }
          
          @media (min-width: 577px) {
            .notifications-dropdown-menu {
              width: 380px !important;
            }
          }
          
          /* Ensure text wraps properly */
          .notification-message {
            word-wrap: break-word !important;
            overflow-wrap: break-word !important;
            word-break: break-word !important;
            white-space: normal !important;
            max-width: 100% !important;
          }
          
          /* Prevent horizontal scroll */
          .notifications-dropdown-menu {
            overflow-x: hidden !important;
          }
          
          .notification-item-content {
            max-width: 100%;
            overflow: hidden;
          }
          /* Ensure navbar bell is clickable and above the toggle */
          .navbar .dropdown-toggle#dropdown-notifications {
            pointer-events: auto !important;
          }
          .navbar .dropdown-toggle#dropdown-notifications .bi-bell {
            padding: 6px !important;
          }
          .navbar .dropdown-toggle#dropdown-notifications {
            z-index: 1100 !important;
          }

          /* Modal body: scrollable but hide scrollbar */
          .notifications-modal-body {
            max-height: 60vh;
            overflow-y: auto !important;
            overflow-x: hidden !important;
            -webkit-overflow-scrolling: touch; /* smooth scrolling on iOS */
            -ms-overflow-style: none !important; /* IE and Edge */
            scrollbar-width: none !important; /* Firefox */
            padding-right: 8px; /* prevent content cutoff */
          }

          .notifications-modal-body::-webkit-scrollbar {
            width: 0 !important;
            height: 0 !important;
            background: transparent !important;
          }

          /* Dialog sizing: keep modal a decent size (not full-screen) */
          .modal-dialog.notifications-modal-dialog {
            max-width: 560px;
            margin: 1.75rem auto;
          }

          @media (max-width: 576px) {
            .modal-dialog.notifications-modal-dialog {
              max-width: 92vw; /* small side margins */
              margin: 12px auto;
            }
          }

          /* Modal body: scrollable but hide scrollbar */
          .notifications-modal-body {
            max-height: 60vh;
            overflow-y: auto !important;
            overflow-x: hidden !important;
            -webkit-overflow-scrolling: touch; /* smooth scrolling on iOS */
            -ms-overflow-style: none !important; /* IE and Edge */
            scrollbar-width: none !important; /* Firefox */
            padding-right: 8px; /* prevent content cutoff */
          }

          .notifications-modal-body::-webkit-scrollbar {
            width: 0 !important;
            height: 0 !important;
            background: transparent !important;
          }
        `}
      </style>
      {mobileMode ? (
        // Mobile mode: render the bell button + show the modal (modal code below)
        <>
          <Button
            variant={inNavbar ? 'link' : 'light'}
            id="dropdown-notifications"
            className={`position-relative ${inNavbar ? 'text-white' : ''}`}
            style={{ zIndex: 9999, pointerEvents: 'auto', ...(inNavbar ? { color: 'white', padding: '0.25rem 0.5rem', fontSize: '1.1rem' } : {}) }}
            aria-haspopup="dialog"
            aria-expanded={showAllNotifications}
            onClick={() => setShowAllNotifications(true)}
          >
            <i className="bi bi-bell" aria-hidden="true"></i>
            {unreadCount > 0 && (
              <Badge 
                pill 
                bg="danger" 
                className="position-absolute top-0 start-100 translate-middle"
                style={{ fontSize: inNavbar ? '0.55rem' : '0.6rem' }}
              >
                {unreadCount > 99 ? '99+' : unreadCount}
              </Badge>
            )}
          </Button>
        </>
      ) : (
        <Dropdown>
          <Dropdown.Toggle
            variant={inNavbar ? 'link' : 'light'}
            id="dropdown-notifications"
            className={`position-relative ${inNavbar ? 'text-white' : ''}`}
            // ensure the toggle is clickable even if other elements overlap
            style={{ zIndex: 9999, pointerEvents: 'auto', ...(inNavbar ? { color: 'white', padding: '0.25rem 0.5rem', fontSize: '1.1rem' } : {}) }}
            aria-haspopup="true"
            aria-expanded={false}
            tabIndex={0}
          >
            <i className="bi bi-bell" aria-hidden="true"></i>
            {unreadCount > 0 && (
              <Badge 
                pill 
                bg="danger" 
                className="position-absolute top-0 start-100 translate-middle"
                style={{ fontSize: inNavbar ? '0.55rem' : '0.6rem' }}
              >
                {unreadCount > 99 ? '99+' : unreadCount}
              </Badge>
            )}
          </Dropdown.Toggle>

          <Dropdown.Menu 
            align="end" 
            className="notifications-dropdown-menu"
            style={{ maxHeight: '70vh', overflowY: 'auto', overflowX: 'hidden' }}
          >
            {menuContent}
          </Dropdown.Menu>
        </Dropdown>
      )}
      
      <Modal
        show={showAllNotifications}
        onHide={() => setShowAllNotifications(false)}
        centered
        size="md"
        dialogClassName="notifications-modal-dialog"
  modalClassName="notifications-modal"
  >
        <Modal.Header closeButton>
          <Modal.Title>All Notifications</Modal.Title>
        </Modal.Header>
  <Modal.Body className="notifications-modal-body">
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
                  className={`d-flex py-3 notification-item ${!notification.read ? 'bg-unread-notification' : ''}`}
                >
                  <div className="me-2 flex-shrink-0 position-relative">
                    <span role="img" aria-label={notification.type} style={{ fontSize: '1.5rem' }}>
                      {getNotificationIcon(notification.type)}
                    </span>
                    {!notification.read && (
                      <span className="unread-dot" style={{position:'absolute',top:0,right:-8,width:10,height:10,borderRadius:'50%',background:'#ffc107',border:'1px solid #fff'}}></span>
                    )}
                  </div>
                  <div className="flex-grow-1 notification-message" style={{ minWidth: 0 }}>
                    <div className="mb-1">{notification.message}</div>
                    <div className="text-muted" style={{ fontSize: '0.85rem' }}>
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
              Mark all read
            </Button>
          )}
        </Modal.Footer>
      </Modal>
    </>
  );
}

export default NotificationsDropdown;