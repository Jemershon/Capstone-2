// Debug component for TeacherD.jsx
import React from 'react';

function DebugTeacherDashboard() {
  return (
    <div style={{padding: '20px'}}>
      <h1>Debug Teacher Dashboard</h1>
      <p>This is a debug version of the Teacher Dashboard to identify issues.</p>
      <div style={{border: '1px solid red', padding: '10px'}}>
        <h2>Key Components:</h2>
        <ul>
          <li>TeacherDashboard (main component)</li>
          <li>DashboardAndClasses</li>
          <li>TeacherClassStream</li>
          <li>FilePreviewModal</li>
        </ul>
      </div>
    </div>
  );
}

export default DebugTeacherDashboard;
