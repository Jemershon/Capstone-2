import React, { useState, useEffect } from "react";
import { Routes, Route, NavLink, useNavigate, useParams, Link, useLocation } from "react-router-dom";
import axios from "axios";
import { Container, Row, Col, Nav, Navbar, Card, Button, Table, Modal, Form, Tab, Tabs, Badge, Alert, Spinner, Toast, ListGroup, Dropdown } from "react-bootstrap";
import { getAuthToken, getUsername, getUserRole, checkAuth, clearAuthData, API_BASE_URL } from "../api";
import NotificationsDropdown from "./components/NotificationsDropdown";
import Comments from "./components/Comments";
import { ensureSocketConnected } from "../socketClient";

// Add custom styles for responsive design and modern theme
const customStyles = `
  /* Futuristic Theme Variables - Original Brand Colors */
  :root { 
    --brand-red: #a30c0c; 
    --brand-red-dark: #780606; 
    --brand-gold: #ffcc00; 
    --brand-gold-light: #ffd54a;
  }
  
  .dashboard-modern-bg {
    background: #fffafa;
    min-height: 100vh;
    position: relative;
    overflow-x: hidden;
  }
  
  .dashboard-modern-bg::before {
    content: '';
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: transparent;
    pointer-events: none;
    z-index: 0;
  }
  
  .main-content-responsive {
    margin-left: 0;
    padding: 0;
    min-height: 100vh;
    position: relative;
    z-index: 1;
    background: #fffafa;
  }
  
  @media (min-width: 768px) {
    .main-content-responsive {
      margin-left: 16.666667%;
      padding: 20px;
    }
  }
  
  /* Futuristic Glassmorphism Sidebar */
  .modern-sidebar {
    background: linear-gradient(180deg, var(--brand-red) 0%, var(--brand-red-dark) 100%) !important;
    backdrop-filter: blur(20px);
    box-shadow: 4px 0 30px rgba(163, 12, 12, 0.3), inset -1px 0 20px rgba(255, 204, 0, 0.05);
    border-right: 2px solid rgba(255, 204, 0, 0.2);
    position: relative;
  }
  
  .modern-sidebar::before {
    content: '';
    position: absolute;
    top: 0;
    right: 0;
    width: 2px;
    height: 100%;
    background: linear-gradient(180deg, transparent, var(--brand-gold), transparent);
    animation: borderGlow 3s infinite;
  }
  
  @keyframes borderGlow {
    0%, 100% { opacity: 0.3; }
    50% { opacity: 1; }
  }
  
  .modern-sidebar h4 {
    color: white;
    text-shadow: 0 0 20px rgba(255, 204, 0, 0.4), 0 2px 10px rgba(0,0,0,0.3);
    font-weight: 700;
    padding: 20px;
    margin: 0;
    border-bottom: 2px solid rgba(255, 204, 0, 0.2);
    letter-spacing: 2px;
    text-transform: uppercase;
    position: relative;
  }
  
  .modern-sidebar h4::after {
    content: '';
    position: absolute;
    bottom: -2px;
    left: 20px;
    width: 60px;
    height: 2px;
    background: var(--brand-gold);
    box-shadow: 0 0 10px var(--brand-gold);
  }
  
  /* Mobile navbar styles */
  @media (max-width: 991px) {
    .mobile-nav-link {
      text-align: center !important;
      padding: 12px 20px !important;
      transition: all 0.3s ease;
      border-radius: 12px;
      margin: 5px 10px;
      color: white !important;
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 204, 0, 0.2);
      position: relative;
      overflow: hidden;
    }
    
    .mobile-nav-link::before {
      content: '';
      position: absolute;
      top: 0;
      left: -100%;
      width: 100%;
      height: 100%;
      background: linear-gradient(90deg, transparent, rgba(255, 204, 0, 0.2), transparent);
      transition: left 0.5s;
    }
    
    .mobile-nav-link:hover::before {
      left: 100%;
    }
    
    .mobile-nav-link:hover {
      background-color: rgba(255, 255, 255, 0.2) !important;
      transform: translateX(5px);
      color: white !important;
      box-shadow: 0 4px 15px rgba(255, 204, 0, 0.3);
      border-color: rgba(255, 204, 0, 0.5);
    }
    
    .mobile-nav-link.active,
    .nav-link.mobile-nav-link.active {
      background-color: rgba(255, 204, 0, 0.2) !important;
      color: white !important;
      font-weight: 600;
      box-shadow: 0 0 20px rgba(255, 204, 0, 0.5), inset 0 0 20px rgba(255, 204, 0, 0.1);
      border-color: var(--brand-gold);
    }
    
    .navbar-collapse {
      text-align: center;
    }
    
    .navbar-nav {
      width: 100%;
    }
    
    .modern-mobile-navbar {
      background: linear-gradient(135deg, var(--brand-red) 0%, var(--brand-red-dark) 100%) !important;
      backdrop-filter: blur(20px);
      box-shadow: 0 4px 30px rgba(163, 12, 12, 0.3);
      border-bottom: 2px solid rgba(255, 204, 0, 0.2);
    }
    
    .modern-mobile-navbar .navbar-brand {
      color: white !important;
      font-weight: 700;
      text-shadow: 0 0 15px rgba(255, 204, 0, 0.6);
    }
  }
  
  .nav-link-custom {
    border-radius: 12px;
    margin: 8px 15px;
    padding: 12px 20px !important;
    transition: all 0.3s ease;
    color: rgba(255, 255, 255, 0.9) !important;
    text-decoration: none;
    font-weight: 500;
    border: 1px solid transparent;
    position: relative;
    overflow: hidden;
  }
  
  .nav-link-custom::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255, 204, 0, 0.2), transparent);
    transition: left 0.5s;
  }
  
  .nav-link-custom:hover::before {
    left: 100%;
  }
  
  .nav-link-custom:hover {
    background-color: rgba(255, 255, 255, 0.15);
    color: #fff !important;
    transform: translateX(5px);
    border-color: rgba(255, 204, 0, 0.3);
    box-shadow: 0 4px 15px rgba(255, 204, 0, 0.2);
  }
  
  .nav-link-custom.active {
    background: linear-gradient(90deg, rgba(255, 204, 0, 0.15), rgba(163, 12, 12, 0.15));
    color: white !important;
    font-weight: 600;
    box-shadow: 0 4px 15px rgba(255, 204, 0, 0.3), inset 0 0 20px rgba(255, 204, 0, 0.1);
    border-color: rgba(255, 204, 0, 0.5);
  }
  
  /* Futuristic Cards */
  .modern-card {
    border-radius: 20px;
    border: 1px solid rgba(255, 204, 0, 0.2);
    box-shadow: 0 10px 30px rgba(0,0,0,0.3), 0 0 15px rgba(255, 204, 0, 0.1);
    transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    background: linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(245, 245, 245, 0.95) 100%);
    backdrop-filter: blur(10px);
    overflow: hidden;
    position: relative;
  }
  
  .modern-card::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255, 204, 0, 0.15), transparent);
    transition: left 0.6s;
  }
  
  .modern-card:hover::before {
    left: 100%;
  }
  
  .modern-card:hover {
    transform: translateY(-8px) scale(1.02);
    box-shadow: 0 20px 50px rgba(0,0,0,0.4), 0 0 30px rgba(255, 204, 0, 0.3);
    border-color: var(--brand-gold);
  }
  
  .modern-card-header {
    background: linear-gradient(135deg, var(--brand-red) 0%, var(--brand-red-dark) 100%);
    color: white;
    padding: 20px 25px;
    font-weight: 700;
    font-size: 1.2rem;
    border: none;
    border-bottom: 2px solid var(--brand-gold);
    text-shadow: 0 2px 10px rgba(0,0,0,0.3);
    position: relative;
  }
  
  .modern-card-header::after {
    content: '';
    position: absolute;
    bottom: -2px;
    left: 0;
    width: 100px;
    height: 2px;
    background: var(--brand-gold);
    box-shadow: 0 0 15px var(--brand-gold);
  }
  
  .modern-card-body {
    padding: 25px;
  }
  
  /* Modern Tabs */
  .nav-tabs {
    border-bottom: 2px solid #e2e8f0 !important;
  }

  .nav-tabs .nav-link {
    border: none !important;
    border-radius: 12px 12px 0 0 !important;
    padding: 12px 24px !important;
    font-weight: 600 !important;
    color: #6c757d !important;
    transition: all 0.3s ease !important;
    margin-right: 4px;
  }

  .nav-tabs .nav-link:hover {
    background: rgba(163, 12, 12, 0.05) !important;
    color: var(--brand-red) !important;
  }

  .nav-tabs .nav-link.active {
    background: linear-gradient(135deg, var(--brand-red) 0%, var(--brand-red-dark) 100%) !important;
    color: white !important;
    box-shadow: 0 4px 12px rgba(163, 12, 12, 0.3) !important;
  }
  
  /* Custom Button Styles */
  .btn-custom-primary {
    background: linear-gradient(135deg, var(--brand-red) 0%, var(--brand-red-dark) 100%);
    border: none;
    border-radius: 8px;
    padding: 10px 20px;
    font-weight: 600;
    color: white;
    transition: all 0.3s ease;
    box-shadow: 0 4px 12px rgba(163, 12, 12, 0.2);
  }
  
  .btn-custom-primary:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(163, 12, 12, 0.35);
    background: linear-gradient(135deg, var(--brand-red-dark) 0%, var(--brand-red) 100%);
    color: white;
  }
  
  .btn-custom-primary:active {
    transform: translateY(0);
    box-shadow: 0 2px 8px rgba(163, 12, 12, 0.3);
  }
  
  .btn-custom-secondary {
    background: white;
    border: 2px solid #6c757d;
    border-radius: 8px;
    padding: 10px 20px;
    font-weight: 600;
    color: #6c757d;
    transition: all 0.3s ease;
  }
  
  .btn-custom-secondary:hover {
    background: #6c757d;
    color: white;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(108, 117, 125, 0.2);
  }
  
  .btn-custom-secondary:active {
    transform: translateY(0);
  }
  
  .btn-custom-danger {
    background: linear-gradient(135deg, #dc3545 0%, #c82333 100%);
    border: none;
    border-radius: 8px;
    padding: 10px 20px;
    font-weight: 600;
    color: white;
    transition: all 0.3s ease;
    box-shadow: 0 4px 12px rgba(220, 53, 69, 0.2);
  }
  
  .btn-custom-danger:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(220, 53, 69, 0.35);
    background: linear-gradient(135deg, #c82333 0%, #bd2130 100%);
    color: white;
  }
  
  .btn-custom-danger:active {
    transform: translateY(0);
    box-shadow: 0 2px 8px rgba(220, 53, 69, 0.3);
  }
  
  .btn-custom-success {
    background: linear-gradient(135deg, #28a745 0%, #218838 100%);
    border: none;
    border-radius: 8px;
    padding: 10px 20px;
    font-weight: 600;
    color: white;
    transition: all 0.3s ease;
    box-shadow: 0 4px 12px rgba(40, 167, 69, 0.2);
  }
  
  .btn-custom-success:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(40, 167, 69, 0.35);
    background: linear-gradient(135deg, #218838 0%, #1e7e34 100%);
    color: white;
  }
  
  .btn-custom-success:active {
    transform: translateY(0);
    box-shadow: 0 2px 8px rgba(40, 167, 69, 0.3);
  }
  
  .btn-custom-outline-primary {
    background: transparent;
    border: 2px solid var(--brand-red);
    border-radius: 8px;
    padding: 10px 20px;
    font-weight: 600;
    color: var(--brand-red);
    transition: all 0.3s ease;
  }
  
  .btn-custom-outline-primary:hover {
    background: var(--brand-red);
    color: white;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(163, 12, 12, 0.2);
  }
  
  .btn-custom-outline-primary:active {
    transform: translateY(0);
  }
  
  .btn-custom-outline-secondary {
    background: transparent;
    border: 2px solid #6c757d;
    border-radius: 8px;
    padding: 10px 20px;
    font-weight: 600;
    color: #6c757d;
    transition: all 0.3s ease;
  }
  
  .btn-custom-outline-secondary:hover {
    background: #6c757d;
    color: white;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(108, 117, 125, 0.2);
  }
  
  .btn-custom-outline-secondary:active {
    transform: translateY(0);
  }
  
  /* Topic Badge - Custom styling to ensure color overrides */
  .topic-badge {
    display: inline-block;
    border-radius: 8px;
    padding: 4px 10px;
    font-weight: 600;
    font-size: 0.75rem;
    color: #fff !important;
    border: none;
    background-color: var(--topic-color) !important;
  }
  
  .btn-custom-outline-danger {
    background: transparent;
    border: 2px solid #dc3545;
    border-radius: 8px;
    padding: 10px 20px;
    font-weight: 600;
    color: #dc3545;
    transition: all 0.3s ease;
  }
  
  .btn-custom-outline-danger:hover {
    background: #dc3545;
    color: white;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(220, 53, 69, 0.2);
  }
  
  .btn-custom-outline-danger:active {
    transform: translateY(0);
  }
  
  .btn-custom-outline-success {
    background: transparent;
    border: 2px solid #28a745;
    border-radius: 8px;
    padding: 10px 20px;
    font-weight: 600;
    color: #28a745;
    transition: all 0.3s ease;
  }
  
  .btn-custom-outline-success:hover {
    background: #28a745;
    color: white;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(40, 167, 69, 0.2);
  }
  
  .btn-custom-outline-success:active {
    transform: translateY(0);
  }
  
  /* Button size variations */
  .btn-custom-sm {
    padding: 6px 14px;
    font-size: 0.875rem;
  }
  
  .btn-custom-lg {
    padding: 14px 28px;
    font-size: 1.125rem;
  }
  
  .class-card-modern {
    background: rgba(255, 255, 255, 0.95);
    border-radius: 15px;
    border: none;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
    transition: all 0.3s ease;
    overflow: hidden;
  }
  
  .class-card-modern:hover {
    transform: translateY(-8px);
    box-shadow: 0 12px 40px rgba(163, 12, 12, 0.25);
  }

  .class-card-modern .card-body {
    position: relative;
    z-index: 2;
  }

  .class-card-modern::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 5px;
    background: linear-gradient(90deg, var(--brand-red) 0%, var(--brand-red-dark) 100%);
  }

  .btn-modern-primary {
    background: linear-gradient(135deg, var(--brand-gold) 0%, var(--brand-gold-light) 100%);
    border: none;
    color: var(--brand-red);
    padding: 10px 24px;
    border-radius: 25px;
    font-weight: 600;
    transition: all 0.3s ease;
    box-shadow: 0 4px 15px rgba(163, 12, 12, 0.15);
  }

  .btn-modern-primary:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(163, 12, 12, 0.25);
    filter: brightness(0.95);
  }

  .btn-modern-secondary {
    background: rgba(255, 255, 255, 0.9);
    border: 2px solid var(--brand-red);
    color: var(--brand-red);
    padding: 10px 24px;
    border-radius: 25px;
    font-weight: 600;
    transition: all 0.3s ease;
  }

  .btn-modern-secondary:hover {
    background: var(--brand-red);
    color: white;
    transform: translateY(-2px);
  }

  .modern-modal-header {
    background: linear-gradient(135deg, var(--brand-red) 0%, var(--brand-red-dark) 100%);
    color: white;
    border: none;
    border-radius: 20px 20px 0 0 !important;
  }

  .modern-modal-header .btn-close {
    filter: brightness(0) invert(1);
  }

  .profile-card-modern {
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(10px);
    border: none;
    border-radius: 20px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
    padding: 2rem;
  }
  
  /* Fix container gaps */
  .container-fluid {
    padding: 0;
  }
  
  .row.g-0 {
    margin: 0;
  }
  
  /* Ensure full height layout */
  .student-dashboard-container {
    min-height: 100vh;
  }
  
  .dashboard-content {
    padding: 0;
    margin: 0;
  }
  
  @media (max-width: 767px) {
    body {
      margin: 0 !important;
      padding: 0 !important;
    }
    
    .student-dashboard-container {
      padding: 0 !important;
      margin: 0 !important;
    }
    
    .row, .row.g-0 {
      margin: 0 !important;
      padding: 0 !important;
    }
    
    .col, [class*="col-"] {
      padding: 0 !important;
      margin: 0 !important;
    }
    
    /* Add small gaps between stat cards */
    .row.mb-4 > [class*="col-"] {
      padding: 0 5px !important;
      margin-bottom: 10px !important;
    }
    
    .row.mb-4 {
      margin-left: -5px !important;
      margin-right: -5px !important;
    }
    
    .container, .container-fluid {
      padding: 0 !important;
      margin: 0 !important;
    }
    
    .main-content-responsive {
      padding: 10px !important;
      margin: 0 !important;
    }
    
    .dashboard-content {
      padding: 10px !important;
      margin: 0 !important;
    }
    
    .dashboard-content > * {
      margin-top: 10px !important;
    }
    
    .dashboard-content > *:first-child,
    .dashboard-content > h1:first-child,
    .dashboard-content > h2:first-child {
      margin-top: 0 !important;
    }
    
    .card, .container {
      margin-top: 10px !important;
    }
    
    h1, h2, h3, h4, h5, h6 {
      margin-top: 0 !important;
    }
  }
  
  /* Three-dot menu dropdown */
  .dropdown-toggle::after {
    display: none !important;
  }
  
  .dropdown-menu {
    border-radius: 12px;
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.15);
    border: none;
    padding: 8px 0;
  }
  
  .dropdown-item {
    padding: 10px 20px;
    transition: all 0.2s ease;
    font-size: 0.95rem;
  }
  
  .dropdown-item:hover {
    background-color: rgba(163, 12, 12, 0.08);
    color: var(--brand-red);
    transform: translateX(3px);
  }
  
  .dropdown-item.text-danger:hover {
    background-color: rgba(220, 53, 69, 0.1);
    color: #dc3545;
  }
  
  .dropdown-divider {
    margin: 8px 0;
    border-color: rgba(0, 0, 0, 0.1);
  }
  
  /* Mobile optimization for three-dot menu */
  @media (max-width: 768px) {
    .dropdown-menu {
      min-width: 150px;
    }
  }
`;

// Inject styles
if (typeof document !== 'undefined') {
  const styleElement = document.createElement('style');
  styleElement.textContent = customStyles;
  document.head.appendChild(styleElement);
}

function StudentDashboard() {
  const [user, setUser] = useState({ name: "", username: "", role: "" });
  const [isAuthenticated, setIsAuthenticated] = useState(checkAuth());
  const [loading, setLoading] = useState(true);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [lastAuthCheck, setLastAuthCheck] = useState(0); // Add auth caching
  const navigate = useNavigate();
  const location = useLocation();
  const isClassRoute = location.pathname.includes('/class/');

  useEffect(() => {
    const verifyToken = async () => {
      // Skip if we've verified recently (within last 5 minutes)
      const now = Date.now();
      if (now - lastAuthCheck < 5 * 60 * 1000) {
        console.log("⚡ Skipping auth check - recently verified");
        setLoading(false);
        return;
      }

      try {
        const token = getAuthToken();
        const username = getUsername();
        const role = getUserRole();
        
        if (!token || !username || role !== "Student") {
          throw new Error("Invalid authentication data");
        }

        const response = await axios.get(`${API_BASE_URL}/api/verify-token`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (response.data.valid && response.data.user.role === "Student") {
          setUser({
            name: response.data.user.name || username,
            username: username,
            role: "Student"
          });
          setIsAuthenticated(true);
          setLastAuthCheck(now); // Update last check timestamp
        } else {
          throw new Error("Invalid token or role");
        }
      } catch (error) {
        console.error("🚫 Authentication failed:", error);
        clearAuthData();
        setIsAuthenticated(false);
        navigate("/");
      } finally {
        setLoading(false);
      }
    };

    // Only verify once on mount, not on every render
    if (isAuthenticated) {
      verifyToken();
    } else {
      setLoading(false);
    }
  }, []); // Empty dependency array - only run once on mount

  const handleLogout = () => {
    clearAuthData();
    setIsAuthenticated(false);
    navigate("/");
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-100">
        <div className="text-center">
          <div className="spinner-border text-primary mb-3"></div>
          <p>Verifying authentication...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-100">
        <div className="text-center">
          <h3>🚫 Authentication Required</h3>
          <p>Please log in to access the student dashboard.</p>
          <Button className="btn-custom-primary" onClick={() => navigate("/")}>
            Return to Login
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Container fluid className="student-dashboard-container">
      <Row className="g-0">
        {/* Sidebar for desktop */}
        <Col md={2} className="d-none d-md-block modern-sidebar text-white vh-100 p-3 position-fixed" style={{top: 0, left: 0, zIndex: 1000}}>
          <h4 className="text-center mb-4">📚 Student Panel</h4>
          <Nav className="flex-column">
            <Nav.Link
              as={NavLink}
              to="/student/dashboard"
              className="text-white nav-link-custom"
              aria-label="Classes"
            >
              🏠 Classes
            </Nav.Link>

            <Nav.Link
              as={NavLink}
              to="/student/profile"
              className="text-white nav-link-custom"
              aria-label="Profile"
            >
              👤 Profile
            </Nav.Link>
            <Nav.Link
              onClick={() => setShowLogoutModal(true)}
              className="text-danger nav-link-custom"
              aria-label="Logout"
            >
              🚪 Logout
            </Nav.Link>
          </Nav>
        </Col>

  {/* Mobile Navbar */}
  <div className="d-md-none w-100" style={{position: 'relative', zIndex: 1000}}>
          <Navbar expand="lg" className="modern-mobile-navbar shadow-sm" expanded={mobileNavOpen} onToggle={(val) => setMobileNavOpen(val)}>
            <Container fluid>
              <div className="d-flex align-items-center justify-content-between w-100">
                <Navbar.Brand className="fw-bold fs-4">📚 Student Panel</Navbar.Brand>
                <div className="d-flex align-items-center mobile-toggle-group">
                  <div className="d-md-none notifications-fixed-mobile me-2">
                    <NotificationsDropdown mobileMode={true} />
                  </div>
                  <Navbar.Toggle aria-controls="mobile-nav" />
                </div>
              </div>
              <Navbar.Collapse id="mobile-nav">
                <Nav className="w-100">
                  <Nav.Link
                    as={NavLink}
                    to="/student/dashboard"
                    className="mobile-nav-link"
                    onClick={() => setMobileNavOpen(false)}
                  >
                    Dashboard
                  </Nav.Link>
                  <Nav.Link
                    as={NavLink}
                    to="/student/profile"
                    className="mobile-nav-link"
                    onClick={() => setMobileNavOpen(false)}
                  >
                    Profile
                  </Nav.Link>
                  <div className="text-center my-2 px-3">
                    <Button
                      className="btn-custom-danger w-100"
                      onClick={() => setShowLogoutModal(true)}
                      style={{maxWidth: '200px'}}
                    >
                      Logout
                    </Button>
                  </div>
                </Nav>
              </Navbar.Collapse>
            </Container>
          </Navbar>
        </div>

        {/* Main Content */}
        <Col md={10} xs={12} className="main-content-responsive" style={{ position: 'relative' }}>
          {/* Single responsive notifications wrapper (desktop: top-right, mobile: inline in navbar) */}
          <div className="d-none d-md-block" style={{ position: 'absolute', top: 12, right: 18, zIndex: 1050 }}>
            <NotificationsDropdown />
          </div>
          <Routes>
            <Route path="/" element={<StudentMainDashboard />} />
            <Route path="/dashboard" element={<StudentMainDashboard />} />
            <Route path="/class/:className" element={<StudentClassStream />} />

            <Route path="/profile" element={<StudentProfile />} />
            {/* Default route - redirect to dashboard */}
            <Route path="*" element={<StudentMainDashboard />} />
          </Routes>
        </Col>
      </Row>

      {/* Logout Confirmation Modal */}
      <Modal show={showLogoutModal} onHide={() => setShowLogoutModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Confirm Logout</Modal.Title>
        </Modal.Header>
        <Modal.Body>Are you sure you want to logout?</Modal.Body>
        <Modal.Footer>
          <Button className="btn-custom-secondary" onClick={() => setShowLogoutModal(false)}>
            Cancel
          </Button>
          <Button className="btn-custom-danger" onClick={handleLogout}>
            Logout
          </Button>
        </Modal.Footer>
      </Modal>
      
      {/* Success toast for logout */}
      <Toast
        show={showLogoutModal && false} // This will be controlled by logout success
        onClose={() => setShowLogoutModal(false)}
        delay={1500}
        autohide
        bg="success"
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          minWidth: "250px",
          textAlign: "center",
          zIndex: 10000,
        }}
      >
        <Toast.Body className="text-white fw-bold">
          ✅ Logged out successfully!
        </Toast.Body>
      </Toast>
    </Container>
  );
}

function StudentMainDashboard() {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showToast, setShowToast] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [showJoinModal, setShowJoinModal] = useState(false);
  
  // Add CSS animation
  useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = `
      @keyframes fadeInUp {
        from {
          opacity: 0;
          transform: translateY(20px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
      @keyframes float {
        0%, 100% {
          transform: translateY(0px);
        }
        50% {
          transform: translateY(-10px);
        }
      }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);
  
  // Helper function to handle API errors gracefully for students
  const handleApiError = (err, fallbackMessage = "An error occurred") => {
    // Don't show permission errors to students - they're not relevant
    if (err.response?.status === 403 && err.response?.data?.error?.includes("Teacher or Admin")) {
      console.warn("Permission error silently ignored for student:", err.response.data.error);
      return null; // Return null to indicate error should be ignored
    }
    
    // For other errors, return the error message
    return err.response?.data?.error || fallbackMessage;
  };
  const [showUnenrollModal, setShowUnenrollModal] = useState(false);
  const [selectedClassToUnenroll, setSelectedClassToUnenroll] = useState(null);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [statsModalType, setStatsModalType] = useState('');
  const [statsModalTitle, setStatsModalTitle] = useState('');
  
  const [refreshKey, setRefreshKey] = useState(0); // Used to force re-fetch of classes

  useEffect(() => {
    fetchClasses();
  }, [refreshKey]); // Re-fetch when refreshKey changes

  const fetchClasses = async () => {
    setLoading(true);
    try {
      const token = getAuthToken();
      const username = getUsername();
      const response = await axios.get(`${API_BASE_URL}/api/student-classes/${username}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Store classes both in state and localStorage for offline/fallback access
      const fetchedClasses = response.data || [];
      setClasses(fetchedClasses);
      localStorage.setItem('studentClasses', JSON.stringify(fetchedClasses));
      
    } catch (err) {
      console.error("Error fetching classes:", err);
      
      // Try to load classes from localStorage if API fails
      const cachedClasses = localStorage.getItem('studentClasses');
      if (cachedClasses) {
        console.log("Using cached classes from localStorage");
        setClasses(JSON.parse(cachedClasses));
        setError("Using cached class data. Some information may be outdated.");
      } else {
        setError("Failed to fetch classes");
      }
      setShowToast(true);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinClass = async () => {
    if (!joinCode.trim()) {
      setError("Please enter a class code");
      setShowToast(true);
      return;
    }
    
    try {
      const token = getAuthToken();
      const username = getUsername();
      await axios.post(`${API_BASE_URL}/api/join-class`, {
        code: joinCode.toUpperCase(),
        student: username
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setJoinCode("");
      setShowJoinModal(false);
      fetchClasses();
      setError("Successfully joined the class!");
      setShowToast(true);
    } catch (err) {
      console.error("Join class error:", err);
      const errorMsg = handleApiError(err, "Failed to join class. Please check the code.");
      if (errorMsg) {
        setError(errorMsg);
        setShowToast(true);
      }
    }
  };

  const handleUnenrollClass = async () => {
    if (!selectedClassToUnenroll) return;
    
    try {
      const token = getAuthToken();
      const classId = selectedClassToUnenroll._id || selectedClassToUnenroll.id;
      
      if (!classId) {
        throw new Error("Class ID not found");
      }
      
      // Try API call to leave class
      try {
        await axios.delete(`${API_BASE_URL}/api/leave-class/${classId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        console.log(`✅ Successfully left class ${selectedClassToUnenroll.name} via API`);
      } catch (apiErr) {
        console.error("API leave class error:", apiErr);
        // Continue execution even if API fails - we'll handle it with local state
      }
      
      // Remove class locally regardless of API success
      const updatedClasses = classes.filter(c => 
        (c._id !== classId) && (c.id !== classId)
      );
      
      // Update both state and localStorage
      setClasses(updatedClasses);
      localStorage.setItem('studentClasses', JSON.stringify(updatedClasses));
      
      setShowUnenrollModal(false);
      setSelectedClassToUnenroll(null);
      setError(`Successfully left ${selectedClassToUnenroll.name}`);
      setShowToast(true);
      
      // Force refresh class list
      setRefreshKey(prev => prev + 1);
    } catch (err) {
      console.error("Unenroll class error:", err);
      
      // Last resort - force remove without API
      if (confirm(`Error: ${err.message}. Do you want to force remove this class from your view?`)) {
        const updatedClasses = classes.filter(c => c !== selectedClassToUnenroll);
        setClasses(updatedClasses);
        localStorage.setItem('studentClasses', JSON.stringify(updatedClasses));
        
        setShowUnenrollModal(false);
        setSelectedClassToUnenroll(null);
        setError(`Class removed from your view`);
        setShowToast(true);
      } else {
        const errorMsg = handleApiError(err, "Failed to leave class. Please try again.");
        if (errorMsg) {
          setError(errorMsg);
          setShowToast(true);
        }
      }
    }
  };

  const openUnenrollModal = (classItem) => {
    setSelectedClassToUnenroll(classItem);
    setShowUnenrollModal(true);
  };

  if (loading) {
    return (
      <div className="text-center py-4">
        <Spinner animation="border" role="status" aria-label="Loading classes" />
        <p>Loading your classes...</p>
      </div>
    );
  }

  return (
    <div className="dashboard-content" style={{
      background: '#f8f9fa',
      minHeight: '100vh',
      padding: '2rem',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Decorative background elements */}
      <div style={{
        position: 'absolute',
        top: '-50px',
        right: '-50px',
        width: '300px',
        height: '300px',
        background: 'linear-gradient(135deg, rgba(163, 12, 12, 0.05) 0%, rgba(220, 53, 69, 0.05) 100%)',
        borderRadius: '50%',
        zIndex: 0
      }}></div>
      <div style={{
        position: 'absolute',
        bottom: '-100px',
        left: '-100px',
        width: '400px',
        height: '400px',
        background: 'linear-gradient(135deg, rgba(102, 16, 242, 0.03) 0%, rgba(163, 12, 12, 0.03) 100%)',
        borderRadius: '50%',
        zIndex: 0
      }}></div>
      {/* Subtle pattern overlay */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='0.02'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        opacity: 0.4,
        zIndex: 0,
        pointerEvents: 'none'
      }}></div>
      
      <div style={{ position: 'relative', zIndex: 1 }}>
  <h2 className="fw-bold mb-4" style={{ 
            background: 'linear-gradient(90deg, #a30c0c 0%, #dc3545 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            position: 'relative',
            display: 'inline-block'
          }}>
            <i className="bi bi-book-fill me-2" style={{
              WebkitTextFillColor: '#a30c0c',
              animation: 'float 3s ease-in-out infinite'
            }}></i>
            Classes
          </h2>
          <div style={{
            height: '4px',
            width: '80px',
            background: 'linear-gradient(90deg, #a30c0c 0%, #dc3545 100%)',
            borderRadius: '2px',
            marginBottom: '1rem'
          }}></div>
      
      {error && (
        <Toast
          show={showToast}
          onClose={() => setShowToast(false)}
          delay={5000}
          autohide
          bg={error.toLowerCase().includes("success") || error.toLowerCase().includes("joined") || error.toLowerCase().includes("left") ? "success" : "danger"}
          style={{ position: "fixed", top: "20px", right: "20px", zIndex: 10000 }}
        >
          <Toast.Body className="text-white">{error}</Toast.Body>
        </Toast>
      )}
      
      <div className="classes-container" style={{
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        borderRadius: '16px',
        padding: '2rem',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        border: '1px solid #e0e0e0',
        borderLeft: '4px solid #a30c0c',
        minHeight: '400px',
        position: 'relative'
      }}>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <span></span>
        <i 
          className="bi bi-plus-circle-fill" 
          onClick={() => setShowJoinModal(true)}
          aria-label="Join a new class"
          style={{ 
            fontSize: '1.8rem', 
            cursor: 'pointer', 
            color: '#a30c0c',
            transition: 'all 0.3s ease',
            filter: 'drop-shadow(0 2px 4px rgba(163, 12, 12, 0.3))'
          }}
          title="Join Class"
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.15) rotate(90deg)';
            e.currentTarget.style.filter = 'drop-shadow(0 4px 8px rgba(163, 12, 12, 0.5))';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1) rotate(0deg)';
            e.currentTarget.style.filter = 'drop-shadow(0 2px 4px rgba(163, 12, 12, 0.3))';
          }}
        ></i>
      </div>

      <Row className="g-4">
        {classes.length === 0 && (
          <Col xs={12}>
            <Card className="p-4 text-center text-muted">
              No classes joined yet. Join your first class using a class code from your teacher!
            </Card>
          </Col>
        )}
        {classes.map((cls) => (
          <Col key={cls._id || cls.id} md={4} lg={3} className="mb-3">
            <Card
              className="class-card-modern h-100"
              style={{ 
                transition: 'all 0.3s ease',
                cursor: 'pointer',
                animation: 'fadeInUp 0.5s ease-out',
              }}
              onClick={() => window.location.href = `/student/class/${encodeURIComponent(cls.name)}`}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-8px)';
                e.currentTarget.style.boxShadow = '0 12px 32px rgba(163, 12, 12, 0.2), 0 0 20px rgba(163, 12, 12, 0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '';
              }}
            >
              <Card.Body>
                <div className="d-flex align-items-center justify-content-between mb-2">
                  <div>
                    <Card.Title className="fw-bold">{cls.name}</Card.Title>
                    <div className="mb-2 text-muted" style={{ lineHeight: 1.25 }}>
                      <div>{(cls.course ? `${cls.course}` : '')}{cls.year ? ` ${cls.year}` : ''}{!cls.course && !cls.year && cls.section ? `${cls.section}` : ''}</div>
                      {cls.schedule && <div>Schedule: {cls.schedule}</div>}
                    </div>
                  </div>
                  {cls.teacherPicture && (
                    <img
                      src={cls.teacherPicture}
                      alt={`${cls.teacher}'s avatar`}
                      style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover', marginLeft: 12 }}
                    />
                  )}
                </div>
                <p className="mb-1">
                  <strong>Class code:</strong> {cls.code}
                </p>
                <p className="mb-0">
                  <strong>Students:</strong> {(cls.students || []).length}
                </p>
              </Card.Body>
              <Card.Footer className="d-flex justify-content-end align-items-center gap-2">
                <Dropdown align="end" onClick={(e) => e.stopPropagation()}>
                  <Dropdown.Toggle 
                    variant="link" 
                    size="sm" 
                    className="text-muted p-0"
                    style={{ boxShadow: 'none', border: 'none' }}
                  >
                    <i className="bi bi-three-dots-vertical" style={{ fontSize: '1.2rem' }}></i>
                  </Dropdown.Toggle>
                  <Dropdown.Menu>
                    <Dropdown.Item 
                      className="text-danger d-flex align-items-center"
                      onClick={() => openUnenrollModal(cls)}
                    >
                      <span style={{ marginRight: '8px' }}>🚪</span>
                      Leave class
                    </Dropdown.Item>
                  </Dropdown.Menu>
                </Dropdown>
              </Card.Footer>
            </Card>
          </Col>
        ))}
      </Row>
      </div>
      </div>

      {/* Join Class Modal */}
      <Modal show={showJoinModal} onHide={() => setShowJoinModal(false)} centered>
        <Modal.Header closeButton className="modern-modal-header">
          <Modal.Title>Join a Class</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group>
              <Form.Label>Class Code</Form.Label>
              <Form.Control
                type="text"
                placeholder="Enter class code from your teacher"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                required
              />
              <Form.Text className="text-muted">
                Ask your teacher for the class code to join their class.
              </Form.Text>
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button className="btn-custom-secondary" onClick={() => setShowJoinModal(false)}>
            Cancel
          </Button>
          <Button className="btn-modern-primary" onClick={handleJoinClass} disabled={!joinCode.trim()}>
            Join Class
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Unenroll Confirmation Modal - compact style */}
      <Modal
        show={showUnenrollModal}
        onHide={() => setShowUnenrollModal(false)}
        centered
        size="sm"
      >
        <Modal.Header closeButton>
          <Modal.Title>Leave class?</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="d-flex align-items-center gap-3">
            {selectedClassToUnenroll?.teacherPicture && (
              <img
                src={selectedClassToUnenroll.teacherPicture}
                alt={`${selectedClassToUnenroll.teacher}'s avatar`}
                style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover' }}
              />
            )}
            <div>
              <p className="mb-1 fw-bold">{selectedClassToUnenroll?.name}</p>
              <p className="mb-0 text-muted small">You will lose access to posts, assignments and materials. You can rejoin with the class code.</p>
            </div>
          </div>
        </Modal.Body>
        <Modal.Footer className="d-flex justify-content-between">
          <Button className="btn-custom-outline-secondary" onClick={() => setShowUnenrollModal(false)}>
            Cancel
          </Button>
          <Button className="btn-custom-danger" onClick={handleUnenrollClass} disabled={!selectedClassToUnenroll}>
            Leave class
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Stats Detail Modal */}
      <Modal show={showStatsModal} onHide={() => setShowStatsModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>{statsModalTitle}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {statsModalType === 'classes' && (
            <Table striped bordered hover responsive>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Class Name</th>
                  <th>Section</th>
                  <th>Teacher</th>
                </tr>
              </thead>
              <tbody>
                {classes.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="text-center text-muted">No classes found</td>
                  </tr>
                ) : (
                  classes.map((cls, index) => (
                    <tr key={cls._id || cls.id}>
                      <td>{index + 1}</td>
                      <td>{cls.name}</td>
                      <td>{cls.section}</td>
                      <td>{cls.teacher}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </Table>
          )}

          {statsModalType === 'materials' && (
            <Table striped bordered hover responsive>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Title</th>
                  <th>Class</th>
                  <th>Type</th>
                  <th>Uploaded</th>
                </tr>
              </thead>
              <tbody>
                {classes.flatMap(cls => 
                  (cls.materials || []).map(material => ({ ...material, className: `${cls.name} - ${cls.section}` }))
                ).length === 0 ? (
                  <tr>
                    <td colSpan="5" className="text-center text-muted">No materials found</td>
                  </tr>
                ) : (
                  classes.flatMap(cls => 
                    (cls.materials || []).map(material => ({
                      ...material,
                      className: `${cls.name} - ${cls.section}`
                    }))
                  ).map((material, index) => (
                    <tr key={material._id || `material-${index}`}>
                      <td>{index + 1}</td>
                      <td>{material.title}</td>
                      <td>{material.className}</td>
                      <td>
                        {material.fileUrl ? (
                          <span className="badge bg-primary">
                            {material.fileUrl.split('.').pop().toUpperCase()}
                          </span>
                        ) : (
                          <span className="badge bg-secondary">Text</span>
                        )}
                      </td>
                      <td>{material.createdAt ? new Date(material.createdAt).toLocaleDateString() : 'N/A'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </Table>
          )}

          {statsModalType === 'exams' && (
            <Table striped bordered hover responsive>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Exam Title</th>
                  <th>Class</th>
                  <th>Duration</th>
                  <th>Questions</th>
                </tr>
              </thead>
              <tbody>
                {classes.flatMap(cls => 
                  (cls.exams || []).map(exam => ({ ...exam, className: `${cls.name} - ${cls.section}` }))
                ).length === 0 ? (
                  <tr>
                    <td colSpan="5" className="text-center text-muted">No exams found</td>
                  </tr>
                ) : (
                  classes.flatMap(cls => 
                    (cls.exams || []).map(exam => ({
                      ...exam,
                      className: `${cls.name} - ${cls.section}`
                    }))
                  ).map((exam, index) => (
                    <tr key={exam._id || `exam-${index}`}>
                      <td>{index + 1}</td>
                      <td>{exam.title}</td>
                      <td>{exam.className}</td>
                      <td>{exam.timeLimit} min</td>
                      <td>{exam.questions?.length || 0}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </Table>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button className="btn-custom-secondary" onClick={() => setShowStatsModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}

function StudentClassStream() {
  const { className: rawClassName } = useParams();
  const className = decodeURIComponent(rawClassName || "");
  console.log('StudentClassStream initialized with className:', className);
  const [announcements, setAnnouncements] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [exams, setExams] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [classmates, setClassmates] = useState([]);
  const [forms, setForms] = useState([]);
  const [showFilePreview, setShowFilePreview] = useState(false);
  const [previewFile, setPreviewFile] = useState(null);
  const [teacher, setTeacher] = useState("");
  const [activeTab, setActiveTab] = useState("stream");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [submissionText, setSubmissionText] = useState("");
  const [submissionFile, setSubmissionFile] = useState(null);
  const [showSubmissionModal, setShowSubmissionModal] = useState(false);
  const [showExamModal, setShowExamModal] = useState(false);
  const [selectedExam, setSelectedExam] = useState(null);
  const [examAnswers, setExamAnswers] = useState({});
  const [examSubmitted, setExamSubmitted] = useState(false);
  const [submissionSuccess, setSubmissionSuccess] = useState(false);
  const [useCreditPoints, setUseCreditPoints] = useState(0); // Changed to number
  const [userCreditPoints, setUserCreditPoints] = useState(0);
  const [submittedExams, setSubmittedExams] = useState([]);
  const [examLoading, setExamLoading] = useState(null);
  const [examGrades, setExamGrades] = useState([]);
  const [currentClass, setCurrentClass] = useState(null);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [showResultModal, setShowResultModal] = useState(false);
  const [selectedResult, setSelectedResult] = useState(null);
  
  // Topic filter state
  const [topics, setTopics] = useState([]);
  const [filterTopic, setFilterTopic] = useState(null);
  
  // Material submission state
  const [selectedMaterial, setSelectedMaterial] = useState(null);
  const [showMaterialSubmissionModal, setShowMaterialSubmissionModal] = useState(false);
  const [materialSubmissionFile, setMaterialSubmissionFile] = useState(null);
  const [materialSubmissionLink, setMaterialSubmissionLink] = useState('');
  const [materialSubmissionType, setMaterialSubmissionType] = useState('file'); // 'file' or 'link'
  const [materialSubmissions, setMaterialSubmissions] = useState({});
  const [submittingMaterial, setSubmittingMaterial] = useState(null);
  
  // Timer state for real-time countdown
  const [timeRemaining, setTimeRemaining] = useState({});
  
  const navigate = useNavigate();
  
  // Helper function to handle API errors gracefully for students
  const handleApiError = (err, fallbackMessage = "An error occurred") => {
    // Don't show permission errors to students - they're not relevant
    if (err.response?.status === 403 && err.response?.data?.error?.includes("Teacher or Admin")) {
      console.warn("Permission error silently ignored for student:", err.response.data.error);
      return null; // Return null to indicate error should be ignored
    }
    
    // For other errors, return the error message
    return err.response?.data?.error || fallbackMessage;
  };

  // Helper function to check if material is expired
  const isMaterialExpired = (material) => {
    if (!material || !material.closingTime) {
      return false; // No closing time means material is never closed
    }
    return new Date(material.closingTime) < new Date();
  };

  // Debug: Log when submittedExams changes
  useEffect(() => {
    console.log('📊 submittedExams state changed:', submittedExams);
  }, [submittedExams]);

  useEffect(() => {
    fetchClassData();
  }, [className]);

  // Load submitted exams whenever className changes
  useEffect(() => {
    if (className) {
      // Always get the latest from the server
      const token = getAuthToken();
      if (token) {
        console.log('🔄 Fetching submitted exams due to className change');
        fetchSubmittedExams(token).catch(err => 
          console.error('Error fetching submissions on className change:', err)
        );
      }
    }
  }, [className]);

  // Also fetch when component first mounts
  useEffect(() => {
    const token = getAuthToken();
    if (token) {
      console.log('🔄 Fetching submitted exams on initial mount');
      fetchSubmittedExams(token);
    }
  }, []); // Empty dependency - only on mount

  // Socket listener for real-time grade updates
  useEffect(() => {
    const socket = ensureSocketConnected();
    
    if (!socket) {
      console.warn('Socket connection not available');
      return;
    }
    
    // Join the class room
    if (className) {
      socket.emit('join-class', className);
      console.log(`[StudentD] Joined class room: ${className}`);
    }
    
    // Listen for exam submissions (including our own)
    socket.on('exam-submitted', (data) => {
      console.log('Exam submitted event received, refreshing grades:', data);
      // Refresh exam grades when any exam is submitted
      const token = getAuthToken();
      if (token) {
        fetchSubmittedExams(token);
      }
    });

    // Listen for form submissions - refresh form status
    socket.on('form-submitted', (data) => {
      console.log('Form submitted event received, refreshing form status:', data);
      const token = getAuthToken();
      if (token) {
        fetchForms(token);
      }
    });
    
    // Listen for form deletions - remove deleted form from stream immediately
    socket.on('form-deleted', (data) => {
      console.log('Form deleted event received:', data);
      // If this deletion is for the current class, remove it from state
      if (data?.className === className) {
        setForms(prev => prev ? prev.filter(f => f._id !== data.formId) : prev);
      } else {
        // Otherwise, still attempt a refresh to be safe
        const token = getAuthToken();
        if (token) fetchForms(token).catch(err => console.error('Error refetching forms after form-deleted event:', err));
      }
    });

    return () => {
      // Leave the class room but don't disconnect the shared socket
      if (className) {
        socket.emit('leave-class', className);
        console.log(`[StudentD] Left class room: ${className}`);
      }
    };
  }, [className]);

  const fetchClassData = async () => {
    setLoading(true);
    try {
      const token = getAuthToken();
      const username = getUsername();

      await Promise.all([
        fetchAnnouncements(token),
        fetchAssignments(token),
        fetchExams(token),
        fetchMaterials(token),
        fetchClassmates(token),
        fetchTopics(token),
        fetchForms(token)
      ]);
      
      // Always refresh submitted exams to ensure current state
      if (token) {
        await fetchSubmittedExams(token);
      }
    } catch (err) {
      console.error("Error fetching class data:", err);
      setError("Failed to load class data");
    } finally {
      setLoading(false);
    }
  };
  
  // Add useEffect to refetch announcements when filterTopic changes
  useEffect(() => {
    const token = getAuthToken();
    if (token && filterTopic !== undefined) {
      fetchAnnouncements(token);
    }
  }, [filterTopic]);

  // Real-time exam timer countdown
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        const updated = { ...prev };
        exams.forEach((exam) => {
          if (exam.due) {
            const now = new Date().getTime();
            const due = new Date(exam.due).getTime();
            const remaining = due - now;
            
            if (remaining > 0) {
              const hours = Math.floor(remaining / (1000 * 60 * 60));
              const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
              const seconds = Math.floor((remaining % (1000 * 60)) / 1000);
              
              updated[exam._id] = {
                total: remaining,
                hours,
                minutes,
                seconds,
                formatted: `${hours}h ${minutes}m ${seconds}s`
              };
            } else {
              updated[exam._id] = {
                total: 0,
                hours: 0,
                minutes: 0,
                seconds: 0,
                formatted: 'Expired'
              };
            }
          }
        });
        return updated;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [exams]);
  
  // Handle file preview functionality
  const handleFilePreview = (fileUrl, fileName, fileType) => {
    const extension = fileName.split('.').pop().toLowerCase();
    setPreviewFile({
      url: fileUrl,
      name: fileName,
      type: fileType || getFileType(extension),
      extension
    });
    setShowFilePreview(true);
  };

  // Helper function to determine file type based on extension
  const getFileType = (extension) => {
    const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp'];
    const docExtensions = ['doc', 'docx', 'pdf', 'txt', 'rtf', 'odt'];
    const spreadsheetExtensions = ['xls', 'xlsx', 'csv', 'ods'];
    const presentationExtensions = ['ppt', 'pptx', 'odp'];
    const videoExtensions = ['mp4', 'webm', 'ogg', 'mov', 'avi', 'wmv'];
    const audioExtensions = ['mp3', 'wav', 'ogg', 'aac', 'flac'];
    
    if (imageExtensions.includes(extension)) return 'image';
    if (docExtensions.includes(extension)) return 'document';
    if (spreadsheetExtensions.includes(extension)) return 'spreadsheet';
    if (presentationExtensions.includes(extension)) return 'presentation';
    if (videoExtensions.includes(extension)) return 'video';
    if (audioExtensions.includes(extension)) return 'audio';
    
    return 'other';
  };

  const fetchAnnouncements = async (token) => {
    try {
      const topicFilter = filterTopic ? `&topic=${filterTopic}` : '';
      const response = await axios.get(`${API_BASE_URL}/api/announcements?className=${encodeURIComponent(className)}${topicFilter}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAnnouncements(response.data);
    } catch (err) {
      console.error("Error fetching announcements:", err);
    }
  };

  const fetchTopics = async (token) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/topics?className=${encodeURIComponent(className)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTopics(response.data || []);
    } catch (err) {
      console.error("Error fetching topics:", err);
    }
  };

  const fetchAssignments = async (token) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/assignments?className=${encodeURIComponent(className)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAssignments(response.data);
    } catch (err) {
      console.error("Error fetching assignments:", err);
    }
  };

  const fetchExams = async (token) => {
    try {
      console.log('Fetching exams for class:', className);
      const response = await axios.get(`${API_BASE_URL}/api/exams?className=${encodeURIComponent(className)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('Exams fetched:', response.data);
      setExams(response.data);
    } catch (err) {
      console.error("Error fetching exams:", err);
    }
  };

  const fetchMaterials = async (token) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/materials?className=${encodeURIComponent(className)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMaterials(response.data);
      
      // Fetch submissions for each material
      const submissions = {};
      for (const material of response.data) {
        try {
          const subRes = await axios.get(`${API_BASE_URL}/api/materials/${material._id}/my-submission`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          submissions[material._id] = subRes.data;
        } catch (err) {
          console.warn(`Failed to fetch submission for material ${material._id}:`, err);
        }
      }
      setMaterialSubmissions(submissions);
    } catch (err) {
      console.error("Error fetching materials:", err);
    }
  };

  const fetchForms = async (token) => {
    try {
      console.log('Fetching forms for class:', className);
      const response = await axios.get(`${API_BASE_URL}/api/forms`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Filter forms for this specific class
      let classForms = response.data.filter(form => 
        form.className === className && form.status === 'published'
      );

      console.log('Fetched forms before status check:', classForms.length);

      // Fetch submission status for each form
      const formsWithStatus = await Promise.all(
        classForms.map(async (form) => {
          try {
            console.log(`Checking submission status for form: ${form._id} (${form.title})`);
            const statusRes = await axios.get(
              `${API_BASE_URL}/api/forms/${form._id}/my-submission-status`,
              { headers: { Authorization: `Bearer ${token}` } }
            );
            console.log(`Form ${form.title} status response:`, statusRes.data);
            return {
              ...form,
              hasSubmitted: statusRes.data.hasSubmitted === true
            };
          } catch (err) {
            console.error(`Could not fetch submission status for form ${form.title} (${form._id}):`, {
              status: err.response?.status,
              message: err.message,
              data: err.response?.data
            });
            return {
              ...form,
              hasSubmitted: false // Default to not submitted if error
            };
          }
        })
      );
      
      console.log('Forms with status:', formsWithStatus.map(f => ({ 
        title: f.title, 
        hasSubmitted: f.hasSubmitted,
        _id: f._id
      })));
      setForms(formsWithStatus);
    } catch (err) {
      console.error("Error fetching forms:", err);
    }
  };

  const handleMaterialSubmit = async () => {
    // Validate input based on submission type
    if (materialSubmissionType === 'file' && !materialSubmissionFile) {
      alert("Please select a file to submit");
      return;
    }
    if (materialSubmissionType === 'link' && !materialSubmissionLink.trim()) {
      alert("Please enter a link to submit");
      return;
    }

    setSubmittingMaterial(selectedMaterial._id);
    try {
      const token = localStorage.getItem("token");
      
      let submissionData = {};
      
      if (materialSubmissionType === 'file') {
        // Handle file upload
        const formData = new FormData();
        formData.append("file", materialSubmissionFile);
        
        // First upload the file
        const uploadRes = await axios.post(`${API_BASE_URL}/api/upload`, formData, {
          headers: { 
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data"
          }
        });

        console.log('Upload response:', uploadRes.data);

        if (!uploadRes.data.filePath) {
          throw new Error("File upload failed - no file path returned");
        }

        submissionData = {
          fileName: materialSubmissionFile.name,
          filePath: uploadRes.data.filePath,
          fileSize: materialSubmissionFile.size,
          mimeType: materialSubmissionFile.type
        };
      } else {
        // Handle link submission
        submissionData = {
          fileName: "Link Submission",
          filePath: materialSubmissionLink,
          fileSize: 0,
          mimeType: "text/uri-list"
        };
      }

      // Then submit to material
      const submitRes = await axios.post(
        `${API_BASE_URL}/api/materials/${selectedMaterial._id}/submit`,
        submissionData,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setMaterialSubmissions({
        ...materialSubmissions,
        [selectedMaterial._id]: submitRes.data.submission
      });

      setShowMaterialSubmissionModal(false);
      setMaterialSubmissionFile(null);
      setMaterialSubmissionLink('');
      setMaterialSubmissionType('file');
      setSelectedMaterial(null);
      alert("✅ Submission successful!");
    } catch (err) {
      console.error("Error submitting material:", err);
      alert(`❌ Submission failed: ${err.response?.data?.error || err.message}`);
    } finally {
      setSubmittingMaterial(null);
    }
  };

  const fetchClassmates = async (token) => {
    try {
      console.log("🔍 Fetching people data for class:", className);
      
      // Use the new people endpoint that returns teacher and classmates details
      const peopleResponse = await axios.get(`${API_BASE_URL}/api/classes/${encodeURIComponent(className)}/people`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      console.log("� People data fetched:", peopleResponse.data);
      
      if (peopleResponse.data) {
        // Set teacher name (full name if available, otherwise username)
        setTeacher(peopleResponse.data.teacher?.name || peopleResponse.data.teacher?.username || "");
        
        // Set classmates (array of names)
        const classmateNames = peopleResponse.data.classmates?.map(student => 
          student.name || student.username
        ) || [];
        setClassmates(classmateNames);
        
        console.log("✅ Teacher set to:", peopleResponse.data.teacher?.name || peopleResponse.data.teacher?.username);
        console.log("✅ Classmates set to:", classmateNames);
      }
      
      // Also fetch the basic class info for other purposes
      const classResponse = await axios.get(`${API_BASE_URL}/api/classes/${encodeURIComponent(className)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      console.log("📚 Class data fetched:", classResponse.data);
      
      if (!classResponse.data) {
        console.error("❌ No class data returned from API");
        return;
      }
      
      // Check if the class data has an ID before setting
      if (!classResponse.data._id && !classResponse.data.id) {
        console.warn("⚠️ Class data missing ID property:", classResponse.data);
        
        // Try to get class ID from student-classes endpoint as a backup
        try {
          const username = getUsername();
          const classesResponse = await axios.get(`${API_BASE_URL}/api/student-classes/${username}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          
          const matchingClass = classesResponse.data.find(c => c.name === className);
          
          if (matchingClass && (matchingClass._id || matchingClass.id)) {
            console.log("✅ Found class ID from student-classes endpoint:", matchingClass._id || matchingClass.id);
            // Merge the data
            classResponse.data._id = matchingClass._id || matchingClass.id;
          }
        } catch (backupErr) {
          console.error("❌ Failed to fetch backup class data:", backupErr);
        }
      }
      
      setCurrentClass(classResponse.data); // Store the current class data
      console.log("✅ Current class set:", classResponse.data);
    } catch (err) {
      console.error("Error fetching people data:", err);
      
      // Fallback to the old method if the new endpoint fails
      if (err.response?.status === 404 || err.response?.status === 403) {
        console.log("⚠️ New people endpoint failed, falling back to old method");
        try {
          const response = await axios.get(`${API_BASE_URL}/api/classes/${encodeURIComponent(className)}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          
          if (response.data) {
            setClassmates(response.data.students || []);
            setTeacher(response.data.teacher);
            setCurrentClass(response.data);
          }
        } catch (fallbackErr) {
          console.error("Error in fallback method:", fallbackErr);
        }
      }
    }
  };

  // Fixed handleLeaveClass function that follows Google Classroom style
  const handleLeaveClass = async () => {
    console.log("🚪 Attempting to leave class...", { currentClass });
    
    // Always show the leave modal instead of trying to handle leave here
    setShowLeaveModal(true);
    
    // Note: All class leaving logic is now handled inside the Leave Modal's onClick handler
    // to follow the Google Classroom style approach
  };

  const fetchSubmittedExams = async (token) => {
    try {
      console.log('📋 Fetching submitted exams for student');
      console.log('📋 Current exams array:', exams);
      console.log('📋 Current className:', className);
      
      const response = await axios.get(`${API_BASE_URL}/api/exam-submissions/student`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      console.log('📋 Submitted exams response:', response.data);
      
      // Get exam IDs that have been submitted (handle both populated and non-populated examId)
      const submittedIds = response.data.map(submission => {
        // Handle both populated and non-populated examId
        if (typeof submission.examId === 'object' && submission.examId !== null) {
          return submission.examId._id || submission.examId;
        }
        return submission.examId;
      }).filter(id => id); // Remove any null/undefined values
      
      console.log('📋 Submitted exam IDs:', submittedIds);
      
      // Update the submitted exams state
      setSubmittedExams(submittedIds);
      console.log('✅ submittedExams state updated to:', submittedIds);
      
      // Store ALL submissions (not just current class) for the View Result button to work
      // We'll filter by class when displaying the grades list, but View Result needs all submissions
      console.log('📊 Processing all submissions for examGrades');
      const gradesWithExamInfo = response.data.map(submission => {
        const subExamId = typeof submission.examId === 'object' && submission.examId !== null 
          ? submission.examId._id 
          : submission.examId;
        
        console.log('🔍 Processing submission:', {
          submissionId: submission._id,
          examId: subExamId,
          finalScore: submission.finalScore,
          totalQuestions: submission.totalQuestions
        });
        
        return {
          ...submission,
          _id: submission._id,
          examId: subExamId, // Store the ID as string for easier comparison
          examTitle: submission.examId?.title || 'Unknown Exam',
          examDue: submission.examId?.due,
          isLate: submission.examId?.due ? new Date(submission.submittedAt) > new Date(submission.examId.due) : false,
          finalScore: submission.finalScore,
          totalQuestions: submission.totalQuestions || 0,
          feedback: submission.feedback || '',
          returned: submission.returned || false,
          creditsUsed: submission.creditsUsed || 0,
          submittedAt: submission.submittedAt
        };
      }).sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt)); // Sort by newest first
      
      console.log('📊 Grades with exam info (final - ALL submissions):', gradesWithExamInfo);
      setExamGrades(gradesWithExamInfo);
    } catch (err) {
      console.error("Error fetching submitted exams:", err);
    }
  };



  const handleSubmitAssignment = async () => {
    try {
      const token = getAuthToken();
      const username = getUsername();
      
      const formData = new FormData();
      formData.append('student', username);
      formData.append('submissionText', submissionText);
      if (submissionFile) {
        formData.append('file', submissionFile);
      }

      await axios.post(
        `${API_BASE_URL}/api/assignments/${selectedAssignment._id}/submit`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      setShowSubmissionModal(false);
      setSubmissionText("");
      setSubmissionFile(null);
      alert("Assignment submitted successfully!");
      fetchAssignments(getAuthToken());
    } catch (err) {
      console.error("Submission error:", err);
      alert("Failed to submit assignment");
    }
  };

  const handleTakeExam = async (exam) => {
    // Simple check - if already submitted, don't allow
    if (submittedExams.includes(exam._id)) {
      alert("You have already submitted this exam.");
      return;
    }
    // Prevent taking an exam that has expired
    if (exam.due && new Date(exam.due) < new Date()) {
      alert('This exam has expired and can no longer be taken.');
      return;
    }
    
    // Open exam modal
    setSelectedExam(exam);
    setExamAnswers({});
    setExamSubmitted(false);
    setUseCreditPoints(0); // Reset to 0
    setShowExamModal(true);
    
    try {
      
      // Open exam modal
      setSelectedExam(exam);
      setExamAnswers({});
      setExamSubmitted(false);
      setUseCreditPoints(0); // Reset to 0
      setShowExamModal(true);
    
    // Fetch user's current credit points
    try {
      const token = getAuthToken();
      const response = await axios.get(`${API_BASE_URL}/api/profile`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUserCreditPoints(response.data.creditPoints || 0);
      console.log("User credit points:", response.data.creditPoints || 0);
    } catch (err) {
      console.error("Error fetching credit points:", err);
      setUserCreditPoints(0);
    }
    
    console.log("Modal should show now");
    setExamLoading(null); // Clear loading state
    } catch (err) {
      console.error("Error opening exam:", err);
      alert("Error opening the exam. Please try again.");
      setExamLoading(null); // Clear loading state
    }
  };

  const handleAnswerChange = (questionIndex, answer) => {
    setExamAnswers(prev => ({
      ...prev,
      [questionIndex]: answer
    }));
  };

  const handleSubmitExam = async () => {
    try {
      console.log("Submitting exam:", selectedExam._id);
      console.log("Answers:", examAnswers);
      
      const submission = {
        examId: selectedExam._id,
        answers: Object.entries(examAnswers).map(([questionIndex, answer]) => ({
          questionIndex: parseInt(questionIndex),
          answer: answer
        })),
        useCreditPoints: useCreditPoints
      };

      console.log("Submission payload:", submission);

      const response = await axios.post(
        `${API_BASE_URL}/api/exam-submissions`,
        submission,
        {
          headers: { Authorization: `Bearer ${getAuthToken()}` }
        }
      );

      console.log("Submission successful:", response.data);
      
      // Immediately add exam to submitted list for instant UI update
      const updatedSubmissions = [...submittedExams, selectedExam._id];
      console.log("Updating submittedExams:", updatedSubmissions);
      setSubmittedExams(updatedSubmissions);
      setExamSubmitted(true);
      
      // Store in localStorage for persistence
      localStorage.setItem('submittedExams', JSON.stringify(updatedSubmissions));
      
      // Show visual success feedback
      setSubmissionSuccess(true);
      
      // Tell the server to notify all clients about the submission
      try {
        const socket = ensureSocketConnected();
        if (socket) {
          socket.emit('exam-submitted', { examId: selectedExam._id, className });
        }
      } catch (socketErr) {
        console.error("Error with socket notification:", socketErr);
      }
      
      const { score, totalQuestions, creditsUsed, creditPointsRemaining } = response.data;
      
      // Update user credit points after submission
      setUserCreditPoints(creditPointsRemaining || 0);
      
      let message = `Exam submitted successfully! Your score: ${score}/${totalQuestions}`;
      
      if (useCreditPoints > 0 && creditsUsed > 0) {
        message += `\n🌟 Used ${creditsUsed} credit points to improve your score!`;
        message += `\n⭐ Remaining credit points: ${creditPointsRemaining}`;
      } else if (useCreditPoints > 0 && creditsUsed === 0) {
        message += `\n✨ No credit points were needed - you got them all correct!`;
      }
      
      // Add info about timing bonus if applicable
      if (selectedExam.due) {
        const now = new Date();
        const dueDate = new Date(selectedExam.due);
        if (now < dueDate) {
          message += `\n⚡ Early submission bonus: +1 credit point!`;
        } else if (now > dueDate) {
          message += `\n⏰ Late submission penalty: -2 credit points`;
        }
      }
      
      // Fetch fresh submitted exams data from server immediately
      try {
        await fetchSubmittedExams(getAuthToken());
        console.log("✅ Successfully fetched updated submitted exams list");
        // After fetching updated submissions, navigate student to Grades
        try {
          const tab = selectedExam?.manualGrading ? 'manual' : 'auto';
          // navigate is available in this component scope
          navigate('/student/grades', { state: { tab } });
          console.log('Navigated to /student/grades with tab=', tab);
        } catch (navErr) {
          console.error('Error navigating to grades:', navErr);
        }
      } catch (fetchErr) {
        console.error("❌ Error fetching submitted exams after submission:", fetchErr);
      }
      
      // Display success message for a moment
      setTimeout(() => {
        // Close the modal
        setShowExamModal(false);
        setExamSubmitted(false); // Reset for next exam
        
        // Refresh all class data to ensure everything is in sync
        setTimeout(() => {
          console.log("Reloading class data after exam submission");
          fetchClassData();
        }, 500);
      }, 2000);
      
    } catch (err) {
      console.error("Error submitting exam:", err);
      console.error("Error response:", err.response?.data);
      console.error("Error status:", err.response?.status);
    }
  };

  if (loading) {
    return (
      <Container className="d-flex justify-content-center align-items-center" style={{ minHeight: "50vh" }}>
        <div className="text-center">
          <div className="spinner-border text-primary mb-3"></div>
          <p>Loading class content...</p>
        </div>
      </Container>
    );
  }

  if (error) {
    return (
      <Container className="mt-4">
        <Alert className="btn-custom-danger">{error}</Alert>
      </Container>
    );
  }

  return (
    <Container fluid>
      <Row>
        <Col>
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h2 className="fw-bold text-primary">{className}</h2>
            <div className="d-flex align-items-center gap-3">
              {/* Account-level notifications are provided by StudentDashboard's header */}
            </div>
          </div>

          <Nav variant="tabs" className="mb-3">
            <Nav.Item>
              <Nav.Link 
                active={activeTab === "stream"} 
                onClick={() => setActiveTab("stream")}
              >
                Stream
              </Nav.Link>
            </Nav.Item>
            <Nav.Item>
              <Nav.Link 
                active={activeTab === "classwork"} 
                onClick={() => setActiveTab("classwork")}
              >
                Exams
              </Nav.Link>
            </Nav.Item>
            <Nav.Item>
              <Nav.Link 
                active={activeTab === "people"} 
                onClick={() => setActiveTab("people")}
              >
                People
              </Nav.Link>
            </Nav.Item>
            <Nav.Item>
              <Nav.Link 
                active={activeTab === "materials"} 
                onClick={() => setActiveTab("materials")}
              >
                Materials
              </Nav.Link>
            </Nav.Item>
          </Nav>

          {activeTab === "stream" && (
            <div className="stream-content">
                {/* Topic filter */}
                {topics.length > 0 && (
                  <Card className="p-3 mb-3">
                    <h6 className="mb-2">📁 Filter by Topic</h6>
                    <div className="d-flex flex-wrap gap-2">
                      <Button 
                        variant={filterTopic === null ? "primary" : "outline-secondary"}
                        size="sm"
                        onClick={() => setFilterTopic(null)}
                      >
                        All
                      </Button>
                      {topics.map(topic => (
                        <Button 
                          key={topic._id}
                          variant={filterTopic === topic._id ? "primary" : "outline-secondary"}
                          size="sm"
                          style={{ 
                            borderColor: topic.color,
                            backgroundColor: filterTopic === topic._id ? topic.color : 'transparent',
                            color: filterTopic === topic._id ? '#fff' : topic.color
                          }}
                          onClick={() => setFilterTopic(filterTopic === topic._id ? null : topic._id)}
                        >
                          {topic.name}
                        </Button>
                      ))}
                    </div>
                  </Card>
                )}
                
                {/* Forms Section */}
                {forms.length > 0 && (
                  <div className="mb-4">
                    {forms.map((form) => (
                      <Card key={form._id} className="mb-3 border-primary">
                        <Card.Body>
                          <div className="d-flex align-items-center mb-2">
                            <div className="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center me-3" 
                                 style={{ width: 40, height: 40 }}>
                              📝
                            </div>
                            <div className="flex-grow-1">
                              <div className="d-flex align-items-center gap-2">
                                <strong>{form.owner}</strong>
                                <Badge bg="primary">
                                  {form.settings?.isQuiz ? 'Quiz' : 'Form'}
                                </Badge>
                              </div>
                              <small className="text-muted">
                                {new Date(form.createdAt).toLocaleString()}
                              </small>
                            </div>
                          </div>
                          
                          <h6 className="mb-2">{form.title}</h6>
                          {form.description && (
                            <p className="text-muted mb-2">{form.description}</p>
                          )}
                          
                          {form.settings?.deadline && (
                            <div className="mb-2">
                              <small className="text-muted">
                                <i className="bi bi-calendar me-1"></i>
                                Due: {new Date(form.settings.deadline).toLocaleString()}
                              </small>
                            </div>
                          )}
                          
                          <div className="d-flex gap-2">
                            <Button
                              variant={form.hasSubmitted === true ? "success" : "primary"}
                              size="sm"
                              disabled={form.hasSubmitted === true}
                              onClick={() => window.open(`/forms/${form._id}`, '_blank')}
                              title={form.hasSubmitted === true ? "You have already submitted this form" : ""}
                            >
                              <i className={`bi ${form.hasSubmitted === true ? 'bi-check2-circle' : 'bi-pencil-square'} me-2`}></i>
                              {form.hasSubmitted === true ? 'Submitted' : (form.settings?.isQuiz ? 'Take Quiz' : 'Fill Form')}
                            </Button>
                          </div>
                        </Card.Body>
                      </Card>
                    ))}
                  </div>
                )}
                
                {announcements.length === 0 ? (
                  <Card className="text-center p-4">
                    <p className="text-muted">No announcements yet</p>
                  </Card>
                ) : (
                  announcements.map((announcement, index) => (
                    <Card key={announcement._id || index} className="mb-3">\
                      <Card.Body>
                        <div className="d-flex align-items-center mb-2">
                          <div className="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center me-3" 
                               style={{ width: 40, height: 40 }}>
                            {announcement.teacherName ? announcement.teacherName[0].toUpperCase() : announcement.teacher ? announcement.teacher[0].toUpperCase() : 'T'}
                          </div>
                          <div className="flex-grow-1">
                            <div className="d-flex align-items-center gap-2">
                              <strong>{announcement.teacherName || announcement.teacher}</strong>
                              {announcement.topic && (
                                <span 
                                  className="topic-badge" 
                                  style={{ 
                                    '--topic-color': announcement.topic.color
                                  }}
                                >
                                  {announcement.topic.name}
                                </span>
                              )}
                            </div>
                            <small className="text-muted">{new Date(announcement.date).toLocaleString()}</small>
                          </div>
                        </div>
                        <p>{announcement.message}</p>
                        
                        {/* Display file attachments */}
                        
                          {/* Display materialRef if present */}
                          {announcement.materialRef && (
                            <div className="mt-3">
                              <div className="fw-bold mb-2">Material:</div>
                              <Card className="modern-card mb-2">
                                <Card.Body>
                                  <h6 className="text-center">{announcement.materialRef.title}</h6>
                                  {announcement.materialRef.description && (
                                    <p className="text-muted small text-center">{announcement.materialRef.description}</p>
                                  )}
                                  {announcement.materialRef.createdAt && (
                                    <small className="d-block mb-2 text-info text-center">
                                      <i className="bi bi-calendar-event me-1"></i>
                                      <strong>Uploaded:</strong> {new Date(announcement.materialRef.createdAt).toLocaleString()}
                                    </small>
                                  )}
                                  {(announcement.materialRef.openingTime || announcement.materialRef.closingTime) && (
                                    <small className="d-block mb-2 text-secondary text-center">
                                      {announcement.materialRef.openingTime && (
                                        <div className="mb-1">
                                          <i className="bi bi-clock-history me-1"></i>
                                          Opens: {new Date(announcement.materialRef.openingTime).toLocaleString()}
                                        </div>
                                      )}
                                      {announcement.materialRef.closingTime && (
                                        <div>
                                          <i className="bi bi-clock me-1"></i>
                                          Closes: {new Date(announcement.materialRef.closingTime).toLocaleString()}
                                        </div>
                                      )}
                                    </small>
                                  )}
                                  {announcement.materialRef.type === 'file' && announcement.materialRef.content && (
                                    <div className="d-flex gap-2">
                                      <Button
                                        className="materials-view-btn flex-grow-1"
                                        
                                        
                                        onClick={() => window.open(
                                          announcement.materialRef.content.startsWith('http') ? announcement.materialRef.content : `${API_BASE_URL}/${announcement.materialRef.content}`,
                                          '_blank'
                                        )}
                                      >
                                        View
                                      </Button>
                                    </div>
                                  )}
                                  {(announcement.materialRef.type === 'video' || announcement.materialRef.type === 'link') && announcement.materialRef.content && (
                                    <Button
                                      className="materials-view-btn w-100"
                                      
                                      
                                      as="a"
                                      href={announcement.materialRef.content}
                                      target="_blank"
                                    >
                                      Open
                                    </Button>
                                  )}
                                </Card.Body>
                              </Card>
                            </div>
                          )}
                        
                        {announcement.examId && (
                          <Badge bg="info" className="me-2">Exam Posted</Badge>
                        )}
                        
                        {/* Comments and Reactions Section */}
                        <Comments 
                          referenceType="announcement"
                          referenceId={announcement._id || announcement.id}
                          className={className}
                        />
                      </Card.Body>
                    </Card>
                  ))
                )}
              </div>
            )}

            {activeTab === "classwork" && (
              <div>
              {/* Exams & Quizzes Section - ONLY EXAMS, NO FILES OR LINKS */}
              {forms.length === 0 ? (
                <Card className="modern-card text-center p-4">
                  <div className="mb-3">
                    <i className="bi bi-clipboard-check" style={{ fontSize: '3rem', color: '#ccc' }}></i>
                  </div>
                  <h5>No Exams or Quizzes Yet</h5>
                  <p className="text-muted">Your teacher hasn't posted any exams or quizzes yet. Check back later!</p>
                </Card>
              ) : (
                <div className="mb-4">
                  <h5 className="mb-3">📝 Exams & Quizzes</h5>
                  {forms.map((form) => (
                    <Card key={form._id} className="mb-3 border-primary">
                      <Card.Body>
                        <div className="d-flex align-items-center mb-2">
                          <div className="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center me-3" 
                               style={{ width: 40, height: 40 }}>
                            📝
                          </div>
                          <div className="flex-grow-1">
                            <div className="d-flex align-items-center gap-2">
                              <strong>{form.owner}</strong>
                              <Badge bg="primary">
                                {form.settings?.isQuiz ? 'Quiz' : 'Exam'}
                              </Badge>
                            </div>
                            <small className="text-muted">
                              {new Date(form.createdAt).toLocaleString()}
                            </small>
                          </div>
                        </div>
                        
                        <h6 className="mb-2">{form.title}</h6>
                        {form.description && (
                          <p className="text-muted mb-2">{form.description}</p>
                        )}
                        
                        {form.settings?.deadline && (
                          <div className="mb-2">
                            <small className="text-muted">
                              <i className="bi bi-calendar me-1"></i>
                              Due: {new Date(form.settings.deadline).toLocaleString()}
                            </small>
                          </div>
                        )}
                        
                        <div className="d-flex gap-2">
                          <Button
                            variant={form.hasSubmitted === true ? "success" : "primary"}
                            size="sm"
                            disabled={form.hasSubmitted === true}
                            onClick={() => window.open(`/forms/${form._id}`, '_blank')}
                            title={form.hasSubmitted === true ? "You have already submitted this form" : ""}
                          >
                            <i className={`bi ${form.hasSubmitted === true ? 'bi-check2-circle' : 'bi-pencil-square'} me-2`}></i>
                            {form.hasSubmitted === true ? 'Submitted' : (form.settings?.isQuiz ? 'Take Quiz' : 'Fill Form')}
                          </Button>
                        </div>
                      </Card.Body>
                    </Card>
                  ))}
                </div>
              )}
              </div>
            )}

            {activeTab === "people" && (
              <Row>
                <Col md={6}>
                  <h5 className="mb-3">👨‍🏫 Teacher</h5>
                  <Card className="modern-card">
                    <Card.Body>
                      <div className="d-flex align-items-center">
                        <div className="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center me-3" 
                             style={{ width: 50, height: 50 }}>
                          {teacher ? teacher[0].toUpperCase() : 'T'}
                        </div>
                        <div>
                          <h6 className="mb-0">{teacher}</h6>
                          <small className="text-muted">Class Teacher</small>
                        </div>
                      </div>
                    </Card.Body>
                  </Card>
                </Col>
                <Col md={6}>
                  <h5 className="mb-3">👥 Students ({classmates.length})</h5>
                  <Card className="modern-card" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                    <Card.Body>
                      {classmates.map((student, index) => (
                        <div key={index} className="d-flex align-items-center mb-2">
                          <div className="bg-secondary text-white rounded-circle d-flex align-items-center justify-content-center me-3" 
                               style={{ width: 35, height: 35 }}>
                            {student[0].toUpperCase()}
                          </div>
                          <span>{student}</span>
                        </div>
                      ))}
                    </Card.Body>
                  </Card>
                </Col>
              </Row>
            )}

            {activeTab === "materials" && (
              <>
              {materials.length === 0 ? (
                <Card className="modern-card text-center p-4">
                  <p className="text-muted">No materials shared yet</p>
                </Card>
              ) : (
                <Row>
                  {materials.map((material) => (
                    <Col md={4} key={material._id} className="mb-3">
                      <Card className="modern-card h-100">
                        <Card.Body>
                          <div className="text-center mb-3">
                            {material.type === 'file' && (
                              <div className="text-primary fs-1">📄</div>
                            )}
                            {material.type === 'video' && (
                              <div className="text-danger fs-1">🎥</div>
                            )}
                            {material.type === 'link' && (
                              <div className="text-info fs-1">🔗</div>
                            )}
                          </div>
                          <h6 className="text-center">{material.title}</h6>
                          {material.description && (
                            <p className="text-muted small text-center">{material.description}</p>
                          )}
                          
                          {/* Material Upload Date & Time */}
                          {material.createdAt && (
                            <div className="mb-2 p-2 bg-info bg-opacity-10 rounded small text-center border-start border-info">
                              <i className="bi bi-calendar-event me-1"></i>
                              <strong>Uploaded:</strong> {new Date(material.createdAt).toLocaleString()}
                            </div>
                          )}
                          
                          {/* Material Availability Status */}
                          {(material.openingTime || material.closingTime) && (
                            <div className="mb-2 p-2 bg-light rounded small">
                              {material.openingTime && (
                                <div className="mb-1">
                                  <i className="bi bi-clock-history me-1"></i>
                                  <strong>Opens:</strong> {new Date(material.openingTime).toLocaleString()}
                                </div>
                              )}
                              {material.closingTime && (
                                <div>
                                  <i className="bi bi-clock me-1"></i>
                                  <strong>Closes:</strong> {new Date(material.closingTime).toLocaleString()}
                                </div>
                              )}
                              {material.openingTime && new Date() < new Date(material.openingTime) && (
                                <div className="mt-2 alert alert-warning py-1 mb-0 small">
                                  ⏳ Not yet available
                                </div>
                              )}
                              {material.closingTime && new Date() > new Date(material.closingTime) && (
                                <div className="mt-2 alert alert-danger py-1 mb-0 small">
                                  ❌ Closed
                                </div>
                              )}
                              {(!material.openingTime || new Date() >= new Date(material.openingTime)) && 
                               (!material.closingTime || new Date() <= new Date(material.closingTime)) && (
                                <div className="mt-2 alert alert-success py-1 mb-0 small">
                                  ✓ Available now
                                </div>
                              )}
                            </div>
                          )}
                          
                          {materialSubmissions[material._id] && (
                            <div className="alert alert-success py-2 mb-2 small">
                              <i className="bi bi-check-circle me-1"></i>
                              Submitted on {new Date(materialSubmissions[material._id].submittedAt).toLocaleDateString()}
                            </div>
                          )}
                          
                          {material.type === 'file' && (
                            <div className="d-flex gap-2 flex-column">
                              <Button
                                className="btn-custom-outline-primary btn-custom-sm w-100"
                                onClick={() => {
                                  const url = material.content.startsWith('http') ? material.content : `${API_BASE_URL}/${material.content}`;
                                  window.open(url, '_blank');
                                }}
                              >
                                <i className="bi bi-eye me-1"></i>View
                              </Button>
                              <Button
                                className="btn-custom-outline-success btn-custom-sm w-100"
                                
                                
                                onClick={() => {
                                  if (isMaterialExpired(material)) {
                                    alert('This material has expired and submissions are no longer accepted.');
                                    return;
                                  }
                                  setSelectedMaterial(material);
                                  setShowMaterialSubmissionModal(true);
                                }}
                                disabled={submittingMaterial === material._id || isMaterialExpired(material)}
                              >
                                <i className="bi bi-upload me-1"></i>
                                {submittingMaterial === material._id ? "Uploading..." : isMaterialExpired(material) ? "Submission Closed" : materialSubmissions[material._id] ? "Upload Again" : "Submit Response"}
                              </Button>
                            </div>
                          )}
                          {(material.type === 'video' || material.type === 'link') && (
                            <div className="d-flex gap-2 flex-column">
                              <Button
                                className="btn-custom-outline-primary btn-custom-sm w-100"
                                
                                
                                as="a"
                                href={material.content}
                                target="_blank"
                              >
                                Open
                              </Button>
                              <Button
                                className="btn-custom-outline-success btn-custom-sm w-100"
                                
                                
                                onClick={() => {
                                  if (isMaterialExpired(material)) {
                                    alert('This material has expired and submissions are no longer accepted.');
                                    return;
                                  }
                                  setSelectedMaterial(material);
                                  setShowMaterialSubmissionModal(true);
                                }}
                                disabled={submittingMaterial === material._id || isMaterialExpired(material)}
                              >
                                <i className="bi bi-upload me-1"></i>
                                {submittingMaterial === material._id ? "Uploading..." : isMaterialExpired(material) ? "Submission Closed" : materialSubmissions[material._id] ? "Upload Again" : "Submit Response"}
                              </Button>
                            </div>
                          )}
                        </Card.Body>
                      </Card>
                    </Col>
                  ))}
                </Row>
              )}
              </>
            )}


        </Col>
      </Row>

      {/* Assignment Submission Modal */}
      <Modal show={showSubmissionModal} onHide={() => setShowSubmissionModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Submit Assignment: {selectedAssignment?.title}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Submission Text</Form.Label>
              <Form.Control
                as="textarea"
                rows={5}
                value={submissionText}
                onChange={(e) => setSubmissionText(e.target.value)}
                placeholder="Enter your submission text here..."
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Upload File (optional)</Form.Label>
              <Form.Control
                type="file"
                onChange={(e) => setSubmissionFile(e.target.files[0])}
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button className="btn-custom-secondary" onClick={() => setShowSubmissionModal(false)}>
            Cancel
          </Button>
          <Button className="btn-custom-primary" onClick={handleSubmitAssignment}>
            Submit Assignment
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Material Submission Modal */}
      <Modal show={showMaterialSubmissionModal} onHide={() => { 
        setShowMaterialSubmissionModal(false); 
        setMaterialSubmissionFile(null); 
        setMaterialSubmissionLink('');
        setMaterialSubmissionType('file');
      }} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Submit Response: {selectedMaterial?.title}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {isMaterialExpired(selectedMaterial) && (
            <div className="alert alert-danger mb-3" role="alert">
              <i className="bi bi-exclamation-circle me-2"></i>
              <strong>Submission Period Closed</strong> - This material's submission deadline has passed. You can no longer submit responses.
            </div>
          )}
          <Form>
            {/* Submission Type Selector */}
            <Form.Group className="mb-3">
              <Form.Label>Submission Type</Form.Label>
              <div className="d-flex gap-3">
                <Form.Check
                  type="radio"
                  label="📄 Upload File"
                  name="submissionType"
                  checked={materialSubmissionType === 'file'}
                  onChange={() => setMaterialSubmissionType('file')}
                  disabled={isMaterialExpired(selectedMaterial)}
                />
                <Form.Check
                  type="radio"
                  label="🔗 Submit Link"
                  name="submissionType"
                  checked={materialSubmissionType === 'link'}
                  onChange={() => setMaterialSubmissionType('link')}
                  disabled={isMaterialExpired(selectedMaterial)}
                />
              </div>
            </Form.Group>

            {/* File Upload Section */}
            {materialSubmissionType === 'file' && (
              <Form.Group className="mb-3">
                <Form.Label>Upload Your File</Form.Label>
                <Form.Control
                  type="file"
                  onChange={(e) => setMaterialSubmissionFile(e.target.files[0])}
                  accept="*/*"
                  disabled={isMaterialExpired(selectedMaterial)}
                />
                {materialSubmissionFile && (
                  <small className="text-success d-block mt-2">
                    ✅ Selected: {materialSubmissionFile.name} ({(materialSubmissionFile.size / 1024 / 1024).toFixed(2)} MB)
                  </small>
                )}
                <Form.Text className="text-muted">
                  Upload documents, images, videos, or any file type
                </Form.Text>
              </Form.Group>
            )}

            {/* Link Submission Section */}
            {materialSubmissionType === 'link' && (
              <Form.Group className="mb-3">
                <Form.Label>Paste Your Link</Form.Label>
                <Form.Control
                  type="url"
                  placeholder="https://example.com/your-document"
                  value={materialSubmissionLink}
                  onChange={(e) => setMaterialSubmissionLink(e.target.value)}
                  disabled={isMaterialExpired(selectedMaterial)}
                />
                <Form.Text className="text-muted">
                  Submit links to Google Docs, Dropbox, YouTube videos, or any URL
                </Form.Text>
              </Form.Group>
            )}
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button className="btn-custom-secondary" onClick={() => { 
            setShowMaterialSubmissionModal(false); 
            setMaterialSubmissionFile(null); 
            setMaterialSubmissionLink('');
            setMaterialSubmissionType('file');
          }}>
            Cancel
          </Button>
          <Button 
            className="btn-custom-success" 
            onClick={handleMaterialSubmit}
            disabled={
              (materialSubmissionType === 'file' && !materialSubmissionFile) || 
              (materialSubmissionType === 'link' && !materialSubmissionLink.trim()) ||
              submittingMaterial === selectedMaterial?._id ||
              isMaterialExpired(selectedMaterial)
            }
          >
            {submittingMaterial === selectedMaterial?._id ? "Submitting..." : isMaterialExpired(selectedMaterial) ? "Submission Closed" : "Submit"}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Leave Class Confirmation Modal */}
      <Modal 
        show={showLeaveModal} 
        onHide={() => setShowLeaveModal(false)} 
        centered
        size="sm"
      >
        <Modal.Header closeButton>
          <Modal.Title>Leave class?</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="text-center">
            <div className="mb-3">
              <i className="bi bi-exclamation-triangle text-warning" style={{ fontSize: '48px' }}></i>
            </div>
            <p className="mb-2">
              <strong>{className}</strong>
            </p>
            <p className="text-muted">
              You'll no longer have access to class posts, assignments, and materials. 
              You can rejoin this class if your teacher shares the class code again.
            </p>
          </div>
        </Modal.Body>
        <Modal.Footer className="d-flex flex-column w-100">
          <div className="d-flex justify-content-between w-100">
            <Button 
              className="btn-custom-outline-secondary" 
              onClick={() => setShowLeaveModal(false)}
            >
              Cancel
            </Button>
            <Button 
              className="btn-custom-danger" 
              onClick={async () => {
                setShowLeaveModal(false);
                
                try {
                  // If we have class data, try API call
                  if (currentClass) {
                    const classId = currentClass._id || currentClass.id;
                    if (classId) {
                      const token = getAuthToken();
                      await axios.delete(`${API_BASE_URL}/api/leave-class/${classId}`, {
                        headers: { Authorization: `Bearer ${token}` }
                      });
                      console.log(`✅ Successfully left class ${className} via API`);
                    }
                  }
                } catch (err) {
                  console.error("❌ Leave class API error:", err);
                  // Continue anyway - we'll force navigation
                }
                
                // Update local storage to remove the class
                try {
                  const cachedClasses = localStorage.getItem('studentClasses');
                  if (cachedClasses) {
                    const classes = JSON.parse(cachedClasses);
                    const updatedClasses = classes.filter(c => c.name !== className);
                    localStorage.setItem('studentClasses', JSON.stringify(updatedClasses));
                  }
                } catch (storageErr) {
                  console.error("❌ Local storage error:", storageErr);
                }
                
                // Always navigate back to dashboard
                navigate('/student/dashboard');
              }}
            >
              Leave class
            </Button>
          </div>
          
          {/* Emergency force leave option */}
          <div className="mt-2 text-center w-100">
            <hr className="my-2" />
            <small className="text-muted mb-2 d-block">
              If you're having trouble leaving the class:
            </small>
            <Button 
              className="btn-custom-outline-secondary btn-custom-sm w-100 text-muted"
              onClick={() => {
                setShowLeaveModal(false);
                // Update local storage to remove the class
                try {
                  const cachedClasses = localStorage.getItem('studentClasses');
                  if (cachedClasses) {
                    const classes = JSON.parse(cachedClasses);
                    const updatedClasses = classes.filter(c => c.name !== className);
                    localStorage.setItem('studentClasses', JSON.stringify(updatedClasses));
                  }
                } catch (err) {
                  console.error("❌ Local storage error:", err);
                }
                navigate('/student/dashboard');
              }}
            >
              <small>Force remove from my classes</small>
            </Button>
          </div>
        </Modal.Footer>
      </Modal>

      {/* Take Exam Modal - REMOVED: Use Forms/Surveys instead */}
      {/*
      <Modal show={showExamModal} onHide={() => setShowExamModal(false)} size="lg">
        ... exam modal content removed ...
      </Modal>
      */}

      {/* File Preview Modal */}
      <Modal 
        show={showFilePreview} 
        onHide={() => setShowFilePreview(false)} 
        size="lg"
        centered
      >
    <Modal.Header closeButton>
      <Modal.Title>{previewFile?.name || 'File Preview'}</Modal.Title>
    </Modal.Header>
    <Modal.Body>
      {previewFile && (
        <div className="text-center">
          {previewFile.type === 'image' && (
            <img 
              src={previewFile.url} 
              alt={previewFile.name} 
              className="img-fluid" 
              style={{ maxHeight: '70vh' }}
            />
          )}
          
          {previewFile.type === 'video' && (
            <video 
              src={previewFile.url} 
              controls 
              className="w-100" 
              style={{ maxHeight: '70vh' }}
            >
              Your browser does not support the video tag.
            </video>
          )}
          
          {previewFile.type === 'audio' && (
            <audio 
              src={previewFile.url} 
              controls 
              className="w-100"
            >
              Your browser does not support the audio tag.
            </audio>
          )}
          
          {previewFile.type === 'document' && previewFile.extension === 'pdf' && (
            <iframe
              src={`${previewFile.url}#toolbar=0`}
              width="100%"
              height="500px"
              title={previewFile.name}
              frameBorder="0"
            />
          )}
          
          {(previewFile.type === 'document' && previewFile.extension !== 'pdf') && (
            <div className="text-center p-5">
              <div className="display-1 mb-3">📄</div>
              <p>This document cannot be previewed directly.</p>
              <Button
                className="btn-custom-primary"
                as="a"
                href={previewFile.url}
                target="_blank"
                download
              >
                Download to view
              </Button>
            </div>
          )}
          
          {previewFile.type === 'spreadsheet' && (
            <div className="text-center p-5">
              <div className="display-1 mb-3">📊</div>
              <p>This spreadsheet cannot be previewed directly.</p>
              <Button
                className="btn-custom-primary"
                as="a"
                href={previewFile.url}
                target="_blank"
                download
              >
                Download to view
              </Button>
            </div>
          )}
          
          {previewFile.type === 'presentation' && (
            <div className="text-center p-5">
              <div className="display-1 mb-3">🖼️</div>
              <p>This presentation cannot be previewed directly.</p>
              <div className="mb-3">
                <small className="text-muted">File: {previewFile.name}</small>
              </div>
              <Button
                className="btn-custom-primary"
                as="a"
                href={previewFile.url}
                target="_blank"
                download
              >
                Download to view
              </Button>
            </div>
          )}
          
          {previewFile.type === 'other' && (
            <div className="text-center p-5">
              <div className="display-1 mb-3">📄</div>
              <p>This file type cannot be previewed.</p>
              <Button
                className="btn-custom-primary"
                as="a"
                href={previewFile.url}
                target="_blank"
                download
              >
                Download to view
              </Button>
            </div>
          )}
        </div>
      )}
    </Modal.Body>
    <Modal.Footer>
      <Button className="btn-custom-secondary" onClick={() => setShowFilePreview(false)}>
        Close
      </Button>
      <Button
        className="btn-custom-primary"
        as="a"
        href={previewFile?.url}
        download
        target="_blank"
      >
        Download
      </Button>
    </Modal.Footer>
  </Modal>

  {/* Exam Result Modal */}
  <Modal 
    show={showResultModal} 
    onHide={() => setShowResultModal(false)} 
    centered
    size="lg"
  >
    <Modal.Header closeButton>
      <Modal.Title>Exam Result</Modal.Title>
    </Modal.Header>
    <Modal.Body>
      {console.log('🎯 Modal opened with selectedResult:', selectedResult)}
      {selectedResult ? (
        <div>
          <h5 className="mb-3">{selectedResult.examTitle || 'No Title'}</h5>
          
          {selectedResult.finalScore !== 'Pending' && selectedResult.finalScore !== undefined ? (
            <>
              <div className="d-flex justify-content-between align-items-center p-3 bg-light rounded mb-3">
                <div>
                  <h6 className="mb-0">Your Score</h6>
                  <small className="text-muted">
                    {selectedResult.creditsUsed > 0 && (
                      <>Raw Score: {selectedResult.rawScore}/{selectedResult.totalQuestions}<br /></>
                    )}
                  </small>
                </div>
                <h2 className="mb-0">
                  <Badge bg={selectedResult.finalScore >= selectedResult.totalQuestions * 0.9 ? 'success' : selectedResult.finalScore >= selectedResult.totalQuestions * 0.7 ? 'warning' : 'danger'}>
                    {selectedResult.finalScore}/{selectedResult.totalQuestions}
                  </Badge>
                </h2>
              </div>

              {selectedResult.creditsUsed > 0 && (
                <Alert variant="info">
                  <i className="bi bi-star-fill me-2"></i>
                  You used {selectedResult.creditsUsed} credit point{selectedResult.creditsUsed !== 1 ? 's' : ''} to improve your score!
                </Alert>
              )}

              {selectedResult.feedback && (
                <div className="mt-3">
                  <h6>Teacher Feedback</h6>
                  <div className="p-3 bg-light rounded" style={{ whiteSpace: 'pre-wrap' }}>
                    {selectedResult.feedback}
                  </div>
                </div>
              )}

              <div className="mt-3">
                <small className="text-muted">
                  Submitted: {new Date(selectedResult.submittedAt).toLocaleString()}
                  {selectedResult.isLate && <Badge bg="warning" className="ms-2">Late Submission</Badge>}
                </small>
              </div>
            </>
          ) : (
            <Alert variant="info">
              <i className="bi bi-clock-history me-2"></i>
              {selectedResult.feedback || 'Your exam is being graded. You will be notified when the results are available.'}
            </Alert>
          )}
        </div>
      ) : (
        <div>
          <Alert variant="warning">
            <i className="bi bi-exclamation-triangle me-2"></i>
            No result data available. Please try refreshing the page.
          </Alert>
          <div className="text-muted small">
            Debug info: selectedResult is {typeof selectedResult}
          </div>
        </div>
      )}
    </Modal.Body>
    <Modal.Footer>
      <Button className="btn-custom-secondary" onClick={() => setShowResultModal(false)}>
        Close
      </Button>
    </Modal.Footer>
  </Modal>
    </Container>
  );
}

// ================= Student Grades =================
function StudentGrades() {
  const [grades, setGrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showToast, setShowToast] = useState(false);
  const [activeTab, setActiveTab] = useState("all"); // "all", "auto", "manual"
  const [filterClass, setFilterClass] = useState("all");
  const location = useLocation();

  // If navigated here with a preferred tab (e.g. after submitting an exam), honor it
  useEffect(() => {
    try {
      const preferred = location?.state?.tab;
      if (preferred && ['all', 'auto', 'manual'].includes(preferred)) {
        setActiveTab(preferred);
      }
    } catch (e) {
      // ignore
    }
  }, [location?.state?.tab]);
  
  // Helper function to handle API errors gracefully for students
  const handleApiError = (err, fallbackMessage = "An error occurred") => {
    // Don't show permission errors to students - they're not relevant
    if (err.response?.status === 403 && err.response?.data?.error?.includes("Teacher or Admin")) {
      console.warn("Permission error silently ignored for student:", err.response.data.error);
      return null; // Return null to indicate error should be ignored
    }
    
    // For other errors, return the error message
    return err.response?.data?.error || fallbackMessage;
  };

  useEffect(() => {
    fetchGrades();
  }, []);

  const fetchGrades = async () => {
    setLoading(true);
    try {
      const token = getAuthToken();
      const username = getUsername();
      const response = await axios.get(`${API_BASE_URL}/api/student-grades/${username}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setGrades(response.data || []);
      
    } catch (err) {
      console.error("Error fetching grades:", err);
      const errorMsg = handleApiError(err, "Failed to fetch grades");
      if (errorMsg) {
        setError(errorMsg);
        setShowToast(true);
      }
    } finally {
      setLoading(false);
    }
  };
  
  // Filter grades based on active tab and class
  const getFilteredGrades = () => {
    let filtered = [...grades];
    
    // Filter by grading type
    if (activeTab === "auto") {
      filtered = filtered.filter(g => !g.manualGrading);
    } else if (activeTab === "manual") {
      filtered = filtered.filter(g => g.manualGrading);
    }
    
    // Filter by class
    if (filterClass !== "all") {
      filtered = filtered.filter(g => g.class === filterClass);
    }
    
    return filtered;
  };
  
  // Get unique classes
  const getUniqueClasses = () => {
    const classes = [...new Set(grades.map(g => g.class))];
    return classes.sort();
  };
  
  // Get counts
  const getAutoGradedCount = () => grades.filter(g => !g.manualGrading).length;
  const getManualGradedCount = () => grades.filter(g => g.manualGrading).length;
  
  // Get score color
  const getScoreColor = (grade) => {
    if (typeof grade === 'string' && grade.includes('/')) {
      const [score, total] = grade.split('/').map(Number);
      const percentage = (score / total) * 100;
      if (percentage >= 90) return "success";
      if (percentage >= 80) return "info";
      if (percentage >= 70) return "warning";
      return "danger";
    }
    if (grade >= 90) return "success";
    if (grade >= 80) return "info";
    if (grade >= 70) return "warning";
    return "danger";
  };

  if (loading) {
    return (
      <div className="text-center py-4">
        <Spinner animation="border" role="status" aria-label="Loading grades" />
        <p>Loading your grades...</p>
      </div>
    );
  }
  
  const filteredGrades = getFilteredGrades();
  const uniqueClasses = getUniqueClasses();
  const autoCount = getAutoGradedCount();
  const manualCount = getManualGradedCount();

  return (
    <div className="dashboard-content">
      <div className="mb-4">
        <h2 className="fw-bold mb-0">📊 My Grades</h2>
        <p className="text-muted mb-0">View your performance and feedback</p>
      </div>
      
      {error && (
        <Toast
          show={showToast}
          onClose={() => setShowToast(false)}
          delay={5000}
          autohide
          bg="danger"
          style={{ position: "fixed", top: "20px", right: "20px", zIndex: 10000 }}
        >
          <Toast.Body className="text-white">{error}</Toast.Body>
        </Toast>
      )}
      
      {/* Summary Cards */}
      {grades.length > 0 && (
        <Row className="mb-4">
          <Col md={4}>
            <Card 
              className="modern-card border-0 bg-primary text-white"
              style={{ cursor: 'pointer' }}
              onClick={() => {
                setActiveTab("all");
                setFilterClass("all");
              }}
            >
              <Card.Body>
                <h3 className="mb-0">{grades.length}</h3>
                <small>Total Grades</small>
              </Card.Body>
            </Card>
          </Col>
          <Col md={4}>
            <Card 
              className="modern-card border-0 bg-success text-white"
              style={{ cursor: 'pointer' }}
              onClick={() => {
                setActiveTab("auto");
                setFilterClass("all");
              }}
            >
              <Card.Body>
                <h3 className="mb-0">{autoCount}</h3>
                <small>Auto-Graded</small>
              </Card.Body>
            </Card>
          </Col>
          <Col md={4}>
            <Card 
              className="modern-card border-0 bg-warning text-white"
              style={{ cursor: 'pointer' }}
              onClick={() => {
                setActiveTab("manual");
                setFilterClass("all");
              }}
            >
              <Card.Body>
                <h3 className="mb-0">{manualCount}</h3>
                <small>Manual Graded</small>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}
      
      {grades.length === 0 ? (
        <Card className="modern-card p-5 text-center text-muted">
          <i className="bi bi-inbox" style={{ fontSize: '4rem', opacity: 0.3 }}></i>
          <h5 className="mt-3">No grades available yet</h5>
          <p>Your grades will appear here once your teachers have graded your submissions.</p>
        </Card>
      ) : (
        <>
          {/* Tabs and Filters */}
          <Card className="modern-card mb-4">
            <Card.Body>
              <Nav variant="tabs" className="mb-3">
                <Nav.Item>
                  <Nav.Link 
                    active={activeTab === "all"} 
                    onClick={() => setActiveTab("all")}
                  >
                    All Grades
                    <Badge bg="primary" pill className="ms-2">{grades.length}</Badge>
                  </Nav.Link>
                </Nav.Item>
                <Nav.Item>
                  <Nav.Link 
                    active={activeTab === "auto"} 
                    onClick={() => setActiveTab("auto")}
                  >
                    <i className="bi bi-robot"></i> Auto-Graded
                    <Badge bg="success" pill className="ms-2">{autoCount}</Badge>
                  </Nav.Link>
                </Nav.Item>
                <Nav.Item>
                  <Nav.Link 
                    active={activeTab === "manual"} 
                    onClick={() => setActiveTab("manual")}
                  >
                    <i className="bi bi-pencil-square"></i> Manual Graded
                    <Badge bg="warning" pill className="ms-2">{manualCount}</Badge>
                  </Nav.Link>
                </Nav.Item>
              </Nav>
              
              {/* Filter by Class */}
              {uniqueClasses.length > 1 && (
                <Row>
                  <Col md={4}>
                    <Form.Label className="small fw-bold">Filter by Class</Form.Label>
                    <Form.Select
                      value={filterClass}
                      onChange={(e) => setFilterClass(e.target.value)}
                      size="sm"
                    >
                      <option value="all">All Classes</option>
                      {uniqueClasses.map(className => (
                        <option key={className} value={className}>{className}</option>
                      ))}
                    </Form.Select>
                  </Col>
                </Row>
              )}
            </Card.Body>
          </Card>
          
          {/* Grades Grid */}
          {filteredGrades.length === 0 ? (
            <Card className="modern-card p-4 text-center text-muted">
              <h6>No grades found for this filter</h6>
            </Card>
          ) : (
            <Row>
              {filteredGrades.map((grade, index) => (
                <Col key={grade._id || index} md={6} lg={4} className="mb-3">
                  <Card className="modern-card h-100 border-0 shadow-sm">
                    <Card.Body>
                      <div className="d-flex justify-content-between align-items-start mb-3">
                        <div className="flex-grow-1">
                          <h6 className="fw-bold mb-1">{grade.class}</h6>
                          <small className="text-muted">
                            {grade.feedback?.includes('Exam:') 
                              ? grade.feedback.split('Exam:')[1]?.split('(')[0]?.trim() || 'Assignment'
                              : grade.assignment || 'Assignment'}
                          </small>
                        </div>
                        <Badge 
                          bg={getScoreColor(grade.grade)} 
                          className="px-3 py-2"
                          style={{ fontSize: '1rem' }}
                        >
                          {grade.grade}
                        </Badge>
                      </div>
                      
                      {grade.feedback && (
                        <div className="mb-2">
                          <small className="text-muted fw-bold">Feedback:</small>
                          <div className="small mt-1" style={{ 
                            whiteSpace: "pre-wrap", 
                            background: '#f8f9fa', 
                            padding: '8px', 
                            borderRadius: '8px',
                            border: '1px solid #dee2e6'
                          }}>
                            {grade.feedback}
                          </div>
                        </div>
                      )}
                      
                      <div className="d-flex justify-content-between align-items-center mt-3 pt-2 border-top">
                        <small className="text-muted">
                          <i className="bi bi-calendar3"></i> {new Date(grade.submittedAt || Date.now()).toLocaleDateString()}
                        </small>
                        {grade.manualGrading ? (
                          <Badge bg="warning" pill>
                            <i className="bi bi-pencil"></i> Manual
                          </Badge>
                        ) : (
                          <Badge bg="success" pill>
                            <i className="bi bi-robot"></i> Auto
                          </Badge>
                        )}
                      </div>
                    </Card.Body>
                  </Card>
                </Col>
              ))}
            </Row>
          )}
        </>
      )}
    </div>
  );
}

// ================= Student Profile =================
function StudentProfile() {
  const [profile, setProfile] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [showToast, setShowToast] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    username: ''
  });
  const [stats, setStats] = useState({
    totalClasses: 0,
    totalMaterials: 0,
    totalExams: 0
  });
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  
  // Statistics modals
  const [showClassesModal, setShowClassesModal] = useState(false);
  const [showMaterialsModal, setShowMaterialsModal] = useState(false);
  const [showExamsModal, setShowExamsModal] = useState(false);
  const [classes, setClasses] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [exams, setExams] = useState([]);

  const navigate = useNavigate();
  
  // Helper function to handle API errors gracefully for students
  const handleApiError = (err, fallbackMessage = "An error occurred") => {
    // Don't show permission errors to students - they're not relevant
    if (err.response?.status === 403 && err.response?.data?.error?.includes("Teacher or Admin")) {
      console.warn("Permission error silently ignored for student:", err.response.data.error);
      return null; // Return null to indicate error should be ignored
    }
    
    // For other errors, return the error message
    return err.response?.data?.error || fallbackMessage;
  };

  useEffect(() => {
    fetchProfile();
    fetchStats();
  }, []);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const token = getAuthToken();
      const response = await axios.get(`${API_BASE_URL}/api/profile`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProfile(response.data);
    } catch (err) {
      console.error("Error fetching profile:", err);
      const errorMsg = handleApiError(err, "Failed to load profile");
      if (errorMsg) {
        setError(errorMsg);
        setShowToast(true);
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const token = getAuthToken();
      const username = getUsername();
      
      // Fetch student's enrolled classes
      const classesResponse = await axios.get(`${API_BASE_URL}/api/student-classes/${username}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const classes = classesResponse.data || [];
      setClasses(classes); // Store classes for modal
      
      // Fetch materials and exams for all classes
      let totalMaterials = 0;
      let totalExams = 0;
      
      for (const cls of classes) {
        try {
          // Fetch materials for this class
          const materialsResponse = await axios.get(`${API_BASE_URL}/api/materials?className=${encodeURIComponent(cls.name)}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          totalMaterials += materialsResponse.data?.length || 0;
          
          // Fetch exams for this class
          const examsResponse = await axios.get(`${API_BASE_URL}/api/exams?className=${encodeURIComponent(cls.name)}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          totalExams += examsResponse.data?.length || 0;
        } catch (err) {
          console.warn(`Failed to fetch data for class ${cls.name}:`, err);
          // Continue with other classes
        }
      }
      
      setStats({
        totalClasses: classes.length,
        totalMaterials: totalMaterials,
        totalExams: totalExams
      });
    } catch (err) {
      console.error("Error fetching stats:", err);
      // Set default stats on error
      setStats({
        totalClasses: 0,
        totalMaterials: 0,
        totalExams: 0
      });
    }
  };

  const fetchMaterialsForModal = async () => {
    try {
      const token = getAuthToken();
      let allMaterials = [];
      
      for (const cls of classes) {
        try {
          const response = await axios.get(`${API_BASE_URL}/api/materials?className=${encodeURIComponent(cls.name)}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          const classMaterials = (response.data || []).map(mat => ({
            ...mat,
            className: cls.name
          }));
          allMaterials = [...allMaterials, ...classMaterials];
        } catch (err) {
          console.warn(`Failed to fetch materials for class ${cls.name}:`, err);
        }
      }
      
      setMaterials(allMaterials);
      setShowMaterialsModal(true);
    } catch (err) {
      console.error("Error fetching materials:", err);
    }
  };

  const fetchExamsForModal = async () => {
    try {
      const token = getAuthToken();
      let allExams = [];
      
      for (const cls of classes) {
        try {
          const response = await axios.get(`${API_BASE_URL}/api/exams?className=${encodeURIComponent(cls.name)}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          const classExams = (response.data || []).map(exam => ({
            ...exam,
            className: cls.name
          }));
          allExams = [...allExams, ...classExams];
        } catch (err) {
          console.warn(`Failed to fetch exams for class ${cls.name}:`, err);
        }
      }
      
      setExams(allExams);
      setShowExamsModal(true);
    } catch (err) {
      console.error("Error fetching exams:", err);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    navigate('/login');
  };

  const handleEditProfile = () => {
    // Allow adding email only if the account was not created via Google
    // Always set email to current profile.email, even for Google users
    setEditForm({
      name: profile.name || '',
      email: profile.email || '',
      username: profile.username || ''
    });
    setShowEditModal(true);
  };

  const handleSaveProfile = async () => {
    try {
      const token = getAuthToken();
      const response = await axios.put(`${API_BASE_URL}/api/profile`, editForm, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProfile(response.data);
      setShowEditModal(false);
      setSuccessMessage("Profile updated successfully!");
      setShowToast(true);
    } catch (err) {
      console.error("Error updating profile:", err);
      const errorMsg = handleApiError(err, "Failed to update profile");
      if (errorMsg) {
        setError(errorMsg);
        setShowToast(true);
      }
    }
  };

  const handleCleanupData = async () => {
    if (!confirm("This will remove any orphaned or stale data from your account (like notifications from deleted classes). Continue?")) {
      return;
    }
    
    try {
      const token = getAuthToken();
      const response = await axios.post(`${API_BASE_URL}/api/cleanup-my-data`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setSuccessMessage(response.data.message);
      setShowToast(true);
      
      // Refresh profile and stats after cleanup
      await fetchProfile();
      await fetchStats();
    } catch (err) {
      console.error("Error cleaning up data:", err);
      const errorMsg = handleApiError(err, "Failed to clean up data");
      if (errorMsg) {
        setError(errorMsg);
        setShowToast(true);
      }
    }
  };

  const handleDeleteAccount = async () => {
    try {
      const token = getAuthToken();
      
      // Different handling for Google OAuth vs regular accounts
      if (profile?.googleId) {
        // For Google accounts, proceed directly without password
        const response = await axios.delete(`${API_BASE_URL}/api/delete-account`, {
          headers: { Authorization: `Bearer ${token}` },
          data: { confirmDelete: true }
        });
        
        // Clear all auth data
        clearAuthData();
        setShowDeleteModal(false);
        setDeleteConfirmText('');
        
        // Show success message
        alert(response.data.message + "\n\nYou will now be redirected to the home page.");
        
        // Redirect to home page
        navigate('/');
      } else {
        // For regular accounts, require password
        if (!deletePassword) {
          setError("Please enter your password to confirm deletion");
          setShowToast(true);
          return;
        }
        
        const response = await axios.delete(`${API_BASE_URL}/api/delete-account`, {
          headers: { Authorization: `Bearer ${token}` },
          data: { password: deletePassword }
        });
        
        // Clear all auth data
        clearAuthData();
        setShowDeleteModal(false);
        setDeletePassword('');
        
        // Show success message
        alert(response.data.message + "\n\nYou will now be redirected to the home page.");
        
        // Redirect to home page
        navigate('/');
      }
    } catch (err) {
      console.error("Error deleting account:", err);
      const errorMsg = err.response?.data?.error || "Failed to delete account";
      setError(errorMsg);
      setShowToast(true);
      setDeletePassword("");
      setDeleteConfirmText("");
    }
  };

  if (loading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" role="status" aria-label="Loading profile" className="mb-3" />
        <h5>Loading your profile...</h5>
      </div>
    );
  }

  return (
    <div>
      {(error || successMessage) && (
        <Toast
          show={showToast}
          onClose={() => {
            setShowToast(false);
            setError("");
            setSuccessMessage("");
          }}
          delay={5000}
          autohide
          bg={successMessage ? "success" : "danger"}
          style={{ position: "fixed", top: "20px", right: "20px", zIndex: 10000 }}
        >
          <Toast.Body className="text-white">
            {successMessage || error}
          </Toast.Body>
        </Toast>
      )}

      {/* Header Section */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2 className="fw-bold text-primary">My Profile</h2>
        <div className="d-flex align-items-center gap-3">
          {/* Notifications are shown at the dashboard/account level, not per-class */}
          {/* Leave class dropdown menu */}
        </div>
      </div>

      <Row>
        {/* Profile Information Card */}
        <Col lg={8} className="mb-4">
          <Card className="h-100 modern-card">
            <Card.Header className="modern-card-header d-flex align-items-center justify-content-between">
              <h5 className="mb-0">
                <i className="bi bi-person-circle me-2"></i>Personal Information
              </h5>
              <div>
                <Button variant="outline-light" size="sm" onClick={handleEditProfile} aria-label="Edit profile settings">
                  <i className="bi bi-gear-fill"></i>
                </Button>
              </div>
            </Card.Header>
            <Card.Body>
              <Row>
                <Col md={6} className="mb-3">
                  <div className="p-3 bg-light rounded">
                    <div className="d-flex align-items-center mb-2">
                      <i className="bi bi-person-badge text-primary me-2"></i>
                      <strong className="text-muted">Full Name</strong>
                    </div>
                    <h6 className="mb-0">{profile.name || "Not provided"}</h6>
                  </div>
                </Col>
                <Col md={6} className="mb-3">
                  <div className="p-3 bg-light rounded">
                    <div className="d-flex align-items-center mb-2">
                      <i className="bi bi-at text-primary me-2"></i>
                      <strong className="text-muted">Username</strong>
                    </div>
                    <h6 className="mb-0">{profile.username || "N/A"}</h6>
                  </div>
                </Col>
                <Col md={6} className="mb-3">
                  <div className="p-3 bg-light rounded">
                    <div className="d-flex align-items-center mb-2">
                      <i className="bi bi-envelope text-primary me-2"></i>
                      <strong className="text-muted">Email</strong>
                    </div>
                    <h6 className="mb-0">{profile.email || "Not provided"}</h6>
                  </div>
                </Col>
                <Col md={6} className="mb-3">
                  <div className="p-3 bg-light rounded">
                    <div className="d-flex align-items-center mb-2">
                      <i className="bi bi-shield-check text-primary me-2"></i>
                      <strong className="text-muted">Role</strong>
                    </div>
                    <span className="badge bg-success fs-6">{profile.role || "Student"}</span>
                  </div>
                </Col>
                <Col md={6} className="mb-3">
                  <div className="p-3 bg-warning bg-opacity-10 rounded">
                    <div className="d-flex align-items-center mb-2">
                      <i className="bi bi-star-fill text-warning me-2"></i>
                      <strong className="text-muted">Credit Points</strong>
                    </div>
                    <h6 className="mb-0 text-warning fw-bold">{profile.creditPoints || 0} ⭐</h6>
                  </div>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Col>

        {/* Statistics Card */}
        <Col lg={4} className="mb-4">
          <Card className="h-100 modern-card">
            <Card.Header className="modern-card-header">
              <h5 className="mb-0">
                <i className="bi bi-graph-up me-2"></i>Academic Statistics
              </h5>
            </Card.Header>
            <Card.Body>
              <div className="row g-3">
                <div className="col-6">
                  <div 
                    className="text-center p-3 bg-primary bg-opacity-10 rounded" 
                    style={{ cursor: 'pointer' }}
                    onClick={() => setShowClassesModal(true)}
                  >
                    <i className="bi bi-journal-bookmark-fill text-primary fs-3"></i>
                    <h3 className="fw-bold text-primary mb-0">{stats.totalClasses}</h3>
                    <small className="text-muted">Enrolled Classes</small>
                  </div>
                </div>
                <div className="col-6">
                  <div 
                    className="text-center p-3 bg-success bg-opacity-10 rounded"
                    style={{ cursor: 'pointer' }}
                    onClick={fetchMaterialsForModal}
                  >
                    <i className="bi bi-book-fill text-success fs-3"></i>
                    <h3 className="fw-bold text-success mb-0">{stats.totalMaterials}</h3>
                    <small className="text-muted">Materials</small>
                  </div>
                </div>
                <div className="col-12">
                  <div 
                    className="text-center p-3 bg-info bg-opacity-10 rounded"
                    style={{ cursor: 'pointer' }}
                    onClick={fetchExamsForModal}
                  >
                    <i className="bi bi-clipboard-check-fill text-info fs-3"></i>
                    <h3 className="fw-bold text-info mb-0">{stats.totalExams}</h3>
                    <small className="text-muted">Available Exams</small>
                  </div>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Maintenance & Settings Section */}
      <Row>
        <Col lg={12} className="mb-4">
          <Card className="modern-card">
            <Card.Header className="modern-card-header">
              <h5 className="mb-0">
                <i className="bi bi-tools me-2"></i>Account Maintenance
              </h5>
            </Card.Header>
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center mb-3 pb-3 border-bottom">
                <div>
                  <h6 className="mb-1">Clean Up Stale Data</h6>
                  <small className="text-muted">
                    Remove orphaned notifications, assignments from deleted classes, and other stale data.
                  </small>
                </div>
                <Button 
                  className="btn-custom-outline-primary btn-custom-sm ms-3" 
                  onClick={handleCleanupData}
                >
                  <i className="bi bi-trash me-1"></i>
                  Clean Up
                </Button>
              </div>
              
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h6 className="mb-1 text-danger">Delete Account</h6>
                  <small className="text-muted">
                    Permanently delete your account and all associated data. You can reuse the same username later.
                  </small>
                </div>
                <Button 
                  className="btn-custom-outline-danger btn-custom-sm ms-3" 
                  onClick={() => setShowDeleteModal(true)}
                >
                  <i className="bi bi-exclamation-triangle me-1"></i>
                  Delete Account
                </Button>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Quick Actions removed to match Teacher profile; Settings button moved to profile header */}

      {/* Edit Profile Modal */}
      <Modal show={showEditModal} onHide={() => setShowEditModal(false)} centered>
        <Modal.Header closeButton className="border-0">
          <Modal.Title>⚙️ Edit Profile</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Name</Form.Label>
              <Form.Control
                type="text"
                value={editForm.name}
                onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                placeholder="Enter your name"
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Username</Form.Label>
              <Form.Control
                type="text"
                value={editForm.username}
                onChange={(e) => setEditForm({...editForm, username: e.target.value})}
                placeholder="Enter your username"
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Email</Form.Label>
              <Form.Control
                type="email"
                value={editForm.email || ''}
                onChange={(e) => setEditForm({...editForm, email: e.target.value})}
                placeholder={!!profile?.googleId ? (editForm.email || '') : "Enter your email"}
                disabled={!!profile?.googleId}
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer className="border-0">
          <Button className="btn-custom-outline-secondary" onClick={() => setShowEditModal(false)}>
            Cancel
          </Button>
          <Button className="btn-modern-primary" onClick={handleSaveProfile}>
            <i className="bi bi-check-circle me-2"></i>
            Save Changes
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Delete Account Confirmation Modal */}
      <Modal show={showDeleteModal} onHide={() => { setShowDeleteModal(false); setDeletePassword(''); setDeleteConfirmText(''); }} centered>
        <Modal.Header closeButton className="border-0 bg-danger text-white">
          <Modal.Title>
            <i className="bi bi-exclamation-triangle me-2"></i>
            Delete Account
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="text-center py-3">
            <i className="bi bi-exclamation-octagon text-danger" style={{ fontSize: '3rem' }}></i>
            <h5 className="mt-3 mb-2 text-danger">⚠️ Warning: This Action Cannot Be Undone</h5>
            <p className="text-muted mb-3">
              Deleting your account will permanently remove:
            </p>
            <ul className="text-start text-muted mb-3">
              <li>All your class memberships and data</li>
              <li>All exam submissions and grades</li>
              <li>All assignments and materials</li>
              <li>All notifications and comments</li>
              <li>Your entire profile and settings</li>
            </ul>
            <p className="text-muted mb-4">
              <strong>Note:</strong> Your username will become available for reuse after deletion.
            </p>
            
            {/* Show password field only for non-Google accounts */}
            {!profile?.googleId && (
              <Form.Group className="mb-3">
                <Form.Label className="text-start d-block">
                  <strong>Enter your password to confirm deletion:</strong>
                </Form.Label>
                <Form.Control
                  type="password"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  placeholder="Enter your password"
                  autoFocus
                />
              </Form.Group>
            )}
            
            {/* Show different message for Google accounts */}
            {profile?.googleId && (
              <div className="alert alert-warning mb-0">
                <i className="bi bi-google me-2"></i>
                <strong>Google Account:</strong> Click the button below to proceed with account deletion. 
                No password required.
              </div>
            )}
          </div>
        </Modal.Body>
        <Modal.Footer className="border-0">
          <Button 
            className="btn-custom-outline-secondary" 
            onClick={() => { setShowDeleteModal(false); setDeletePassword(''); setDeleteConfirmText(''); }}
          >
            Cancel
          </Button>
          <Button 
            className="btn-custom-danger" 
            onClick={handleDeleteAccount}
            disabled={!profile?.googleId && !deletePassword.trim()}
          >
            <i className="bi bi-trash me-2"></i>
            Yes, Delete My Account
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Logout Confirmation Modal */}
      <Modal show={showLogoutModal} onHide={() => setShowLogoutModal(false)} centered>
        <Modal.Header closeButton className="border-0">
          <Modal.Title>🚪 Confirm Logout</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="text-center py-3">
            <i className="bi bi-question-circle text-warning" style={{ fontSize: '3rem' }}></i>
            <h5 className="mt-3 mb-2">Are you sure you want to logout?</h5>
            <p className="text-muted">You will need to login again to access your account.</p>
          </div>
        </Modal.Body>
        <Modal.Footer className="border-0">
          <Button className="btn-custom-outline-secondary" onClick={() => setShowLogoutModal(false)}>
            Cancel
          </Button>
          <Button className="btn-custom-danger" onClick={handleLogout}>
            <i className="bi bi-box-arrow-right me-2"></i>
            Logout
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Classes Modal */}
      <Modal show={showClassesModal} onHide={() => setShowClassesModal(false)} size="lg" centered>
        <Modal.Header closeButton className="border-0 modern-card-header">
          <Modal.Title>
            <i className="bi bi-journal-bookmark-fill me-2"></i>
            My Enrolled Classes
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {classes.length === 0 ? (
            <div className="text-center py-5 text-muted">
              <i className="bi bi-inbox fs-1"></i>
              <p className="mt-3">You are not enrolled in any classes yet.</p>
            </div>
          ) : (
            <div className="row g-3">
              {classes.map((cls, index) => (
                <div key={index} className="col-md-6">
                  <Card className="modern-card h-100 border-0 shadow-sm" style={{ cursor: 'pointer' }} onClick={() => {
                    setShowClassesModal(false);
                    navigate(`/student/class/${encodeURIComponent(cls.name)}`);
                  }}>
                    <Card.Body>
                      <div className="d-flex align-items-start">
                        <div className="p-3 bg-primary bg-opacity-10 rounded me-3">
                          <i className="bi bi-book text-primary fs-4"></i>
                        </div>
                        <div className="flex-grow-1">
                          <h6 className="fw-bold mb-1">{cls.name}</h6>
                          <small className="text-muted">
                            <i className="bi bi-person me-1"></i>
                            {cls.teacher || 'Unknown Teacher'}
                          </small>
                          {cls.code && (
                            <div className="mt-2">
                              <Badge bg="secondary" className="font-monospace">
                                {cls.code}
                              </Badge>
                            </div>
                          )}
                        </div>
                        <i className="bi bi-chevron-right text-muted"></i>
                      </div>
                    </Card.Body>
                  </Card>
                </div>
              ))}
            </div>
          )}
        </Modal.Body>
      </Modal>

      {/* Materials Modal */}
      <Modal show={showMaterialsModal} onHide={() => setShowMaterialsModal(false)} size="lg" centered>
        <Modal.Header closeButton className="border-0 modern-card-header">
          <Modal.Title>
            <i className="bi bi-book-fill me-2"></i>
            All Materials
          </Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ maxHeight: '500px', overflowY: 'auto' }}>
          {materials.length === 0 ? (
            <div className="text-center py-5 text-muted">
              <i className="bi bi-inbox fs-1"></i>
              <p className="mt-3">No materials available yet.</p>
            </div>
          ) : (
            <div className="list-group">
              {materials.map((material, index) => (
                <div key={index} className="list-group-item list-group-item-action border-0 mb-2 rounded" style={{ cursor: 'pointer' }} onClick={() => {
                  setShowMaterialsModal(false);
                  navigate(`/student/class/${encodeURIComponent(material.className)}`);
                }}>
                  <div className="d-flex align-items-start">
                    <div className="p-2 bg-success bg-opacity-10 rounded me-3">
                      <i className={`bi ${material.file ? 'bi-file-earmark-pdf' : 'bi-link-45deg'} text-success fs-5`}></i>
                    </div>
                    <div className="flex-grow-1">
                      <h6 className="mb-1 fw-bold">{material.title}</h6>
                      <p className="mb-1 text-muted small">{material.description || 'No description'}</p>
                      {material.createdAt && (
                        <small className="d-block mb-2 text-info">
                          <i className="bi bi-calendar-event me-1"></i>
                          <strong>Uploaded:</strong> {new Date(material.createdAt).toLocaleString()}
                        </small>
                      )}
                      {(material.openingTime || material.closingTime) && (
                        <small className="d-block mb-1">
                          {material.openingTime && (
                            <div className="mb-1">
                              <i className="bi bi-clock-history me-1"></i>
                              Opens: {new Date(material.openingTime).toLocaleString()}
                            </div>
                          )}
                          {material.closingTime && (
                            <div>
                              <i className="bi bi-clock me-1"></i>
                              Closes: {new Date(material.closingTime).toLocaleString()}
                            </div>
                          )}
                        </small>
                      )}
                      <small className="text-muted">
                        <Badge bg="secondary" className="me-2">{material.className}</Badge>
                      </small>
                    </div>
                    <i className="bi bi-chevron-right text-muted"></i>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Modal.Body>
      </Modal>

      {/* Exams Modal */}
      <Modal show={showExamsModal} onHide={() => setShowExamsModal(false)} size="lg" centered>
        <Modal.Header closeButton className="border-0 modern-card-header">
          <Modal.Title>
            <i className="bi bi-clipboard-check-fill me-2"></i>
            All Available Exams
          </Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ maxHeight: '500px', overflowY: 'auto' }}>
          {exams.length === 0 ? (
            <div className="text-center py-5 text-muted">
              <i className="bi bi-inbox fs-1"></i>
              <p className="mt-3">No exams available yet.</p>
            </div>
          ) : (
            <div className="list-group">
              {exams.map((exam, index) => (
                <div key={index} className="list-group-item list-group-item-action border-0 mb-2 rounded" style={{ cursor: 'pointer' }} onClick={() => {
                  setShowExamsModal(false);
                  navigate(`/student/class/${encodeURIComponent(exam.className)}`);
                }}>
                  <div className="d-flex align-items-start">
                    <div className="p-2 bg-info bg-opacity-10 rounded me-3">
                      <i className="bi bi-clipboard-check text-info fs-5"></i>
                    </div>
                    <div className="flex-grow-1">
                      <h6 className="mb-1 fw-bold">{exam.title}</h6>
                      <p className="mb-1 text-muted small">{exam.instructions || 'No instructions'}</p>
                      <small className="text-muted">
                        <Badge bg="secondary" className="me-2">{exam.className}</Badge>
                        <Badge bg={exam.manualGrading ? 'warning' : 'success'} className="me-2">
                          {exam.manualGrading ? 'Manual Grading' : 'Auto Graded'}
                        </Badge>
                        {exam.questions?.length || 0} Questions
                      </small>
                    </div>
                    <i className="bi bi-chevron-right text-muted"></i>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Modal.Body>
      </Modal>
    </div>
  );
}

export default StudentDashboard;



