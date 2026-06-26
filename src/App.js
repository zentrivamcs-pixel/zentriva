import React from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import FormPage from './FormPage';
import AdminGate from './AdminGate';
import './App.css';

function App() {
  return (
    <div className="App">
      {/* Navigation Bar (public — no admin link) */}
      <nav className="nav-bar">
        <div className="nav-container">
          <Link to="/" className="nav-logo">⛪ CTCA Directory</Link>
        </div>
      </nav>

      {/* Routes */}
      <Routes>
        <Route path="/" element={<FormPage />} />
        <Route path="/admin" element={<AdminGate />} />
        <Route path="*" element={<FormPage />} />
      </Routes>
    </div>
  );
}

export default App;
