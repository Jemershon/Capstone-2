import React, { useState, useEffect } from 'react';
import { Dropdown, Badge, ListGroup, Button, Spinner } from 'react-bootstrap';
import axios from 'axios';
import { API_BASE_URL, getAuthToken } from '../api';
import { parseError, showError } from '../utils/errorHandling';
import './EnhancedNotifications.css';

const EnhancedNotifications = ({ socket }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('all'); // all, exams, materials, comments
  const [showDropdown, setShowDropdown] = useState(false);

  // Fetch notifications
  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/api/notifications`, {
        headers: { Authorization: `Bearer ${getAuthToken()}` }
      });
      setNotifications(response.data);
      setUnreadCount(response.data.filter(n => !n.read).length);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  // Listen for new notifications via socket
  useEffect(() => {
    if (socket) {
      socket.on('notification', (notification) => {
        setNotifications(prev => [notification, ...prev]);
        setUnreadCount(prev => prev + 1);
        
        // Show browser notification if permitted
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('Remora - New Notification', {
            body: notification.message,
            icon: '/vite.svg',
            badge: '/vite.svg'
          });
        }
      });

      return () => {
        socket.off('notification');
      };
    }
  }, [socket]);

  // Mark notification as read
  const markAsRead = async (notificationId) => {
    try {
      await axios.put(
        `${API_BASE_URL}/api/notifications/${notificationId}/read`,
        {},
        { headers: { Authorization: `Bearer ${getAuthToken()}` } }
      );
      
      setNotifications(prev =>
        prev.map(n => (n._id === notificationId ? { ...n, read: true } : n))
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  // Mark all as read
  const markAllAsRead = async () => {
    try {
      await axios.put(
        `${API_BASE_URL}/api/notifications/mark-all-read`,
        {},
        { headers: { Authorization: `Bearer ${getAuthToken()}` } }
      );
      
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  // Request browser notification permission
  const requestNotificationPermission = async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        new Notification('Remora Notifications Enabled', {
          body: 'You will now receive desktop notifications',
          icon: '/vite.svg'
        });
      }
    }
  };

  // Filter notifications
  const filteredNotifications = notifications.filter(n => {
    if (filter === 'all') return true;
    if (filter === 'exams') return n.type === 'exam' || n.message.includes('exam');
    if (filter === 'materials') return n.type === 'material' || n.message.includes('material');
    if (filter === 'comments') return n.type === 'comment' || n.message.includes('comment');
    return true;
  });

  // Get notification icon
  const getNotificationIcon = (notification) => {
    if (notification.type === 'exam' || notification.message.includes('exam')) {
      return '📝';
    }
    if (notification.type === 'material' || notification.message.includes('material')) {
      return '📚';
    }
    if (notification.type === 'comment' || notification.message.includes('comment')) {
      return '💬';
    }
    if (notification.message.includes('grade')) {
      return '🎯';
    }
    return '🔔';
  };

  // Format time ago
  const timeAgo = (date) => {
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return new Date(date).toLocaleDateString();
  };

  return (
    <Dropdown
      show={showDropdown}
      onToggle={setShowDropdown}
      align="end"
      className="enhanced-notifications"
    >
      <Dropdown.Toggle
        variant="link"
        className="notification-toggle position-relative"
        id="notifications-dropdown"
      >
        <i className="bi bi-bell fs-5"></i>
        {unreadCount > 0 && (
          <Badge
            pill
            bg="danger"
            className="position-absolute notification-badge"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </Badge>
        )}
      </Dropdown.Toggle>

      <Dropdown.Menu className="notification-dropdown-menu">
        {/* Header */}
        <div className="notification-header">
          <h6 className="mb-0">Notifications</h6>
          {unreadCount > 0 && (
            <Button
              variant="link"
              size="sm"
              onClick={markAllAsRead}
              className="mark-all-read"
            >
              Mark all read
            </Button>
          )}
        </div>

        {/* Filter tabs */}
        <div className="notification-filters">
          {['all', 'exams', 'materials', 'comments'].map(f => (
            <button
              key={f}
              className={`filter-btn ${filter === f ? 'active' : ''}`}
              onClick={() => setFilter(f)}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {/* Enable desktop notifications */}
        {('Notification' in window && Notification.permission === 'default') && (
          <div className="notification-permission">
            <Button
              variant="outline-primary"
              size="sm"
              onClick={requestNotificationPermission}
              className="w-100"
            >
              🔔 Enable Desktop Notifications
            </Button>
          </div>
        )}

        {/* Notifications list */}
        <div className="notification-list">
          {loading ? (
            <div className="text-center py-4">
              <Spinner animation="border" size="sm" />
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="text-center py-4 text-muted">
              <i className="bi bi-inbox fs-1"></i>
              <p className="mt-2 mb-0">No notifications</p>
            </div>
          ) : (
            <ListGroup variant="flush">
              {filteredNotifications.map(notification => (
                <ListGroup.Item
                  key={notification._id}
                  className={`notification-item ${!notification.read ? 'unread' : ''}`}
                  onClick={() => !notification.read && markAsRead(notification._id)}
                  style={{ cursor: !notification.read ? 'pointer' : 'default' }}
                >
                  <div className="d-flex align-items-start">
                    <span className="notification-icon me-2">
                      {getNotificationIcon(notification)}
                    </span>
                    <div className="flex-grow-1">
                      <p className="notification-message mb-1">
                        {notification.message}
                      </p>
                      <small className="notification-time text-muted">
                        {timeAgo(notification.createdAt)}
                      </small>
                    </div>
                    {!notification.read && (
                      <Badge pill bg="primary" className="unread-dot"></Badge>
                    )}
                  </div>
                </ListGroup.Item>
              ))}
            </ListGroup>
          )}
        </div>

        {/* Footer */}
        {filteredNotifications.length > 0 && (
          <div className="notification-footer">
            <Button
              variant="link"
              size="sm"
              onClick={() => setShowDropdown(false)}
              className="w-100"
            >
              View All Notifications
            </Button>
          </div>
        )}
      </Dropdown.Menu>
    </Dropdown>
  );
};

export default EnhancedNotifications;
