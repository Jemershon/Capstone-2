import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import 'bootstrap/dist/css/bootstrap.min.css';
import "bootstrap-icons/font/bootstrap-icons.css";


import LandingPage from "./GCR/MainPage";
import AdminDashboard from "./GCR/AdminD";
import StudentDashboard from "./GCR/StudentD"; 
import TeacherDashboard from "./GCR/TeacherD";
import ResetPassword from "./GCR/ResetPassword";

function App() {
  return (
    <Router>
      <Routes>    
        <Route path="/" element={<LandingPage />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/admin/*" element={<AdminDashboard />} />
        <Route path="/student/*" element={<StudentDashboard />} />
        <Route path="/teacher/*" element={<TeacherDashboard />} />
      </Routes>
    </Router>
  );
}

export default App;
