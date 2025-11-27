import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import CertificateManager from './components/CertificateManager';
import EnhancedVerifyPage from './components/EnhancedVerifyPage';

// Simple test router for your new components
const TestApp = () => {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <nav className="bg-white shadow-sm border-b p-4">
          <div className="max-w-7xl mx-auto flex space-x-4">
            <Link to="/manage" className="text-blue-600 hover:text-blue-800 font-medium">
              Manage Certificates
            </Link>
            <Link to="/verify" className="text-blue-600 hover:text-blue-800 font-medium">
              Verify Certificate
            </Link>
          </div>
        </nav>
        
        <Routes>
          <Route path="/" element={
            <div className="p-8 text-center">
              <h1 className="text-3xl font-bold mb-4">Certificate System Test</h1>
              <div className="space-x-4">
                <Link to="/manage" className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
                  Manage Certificates
                </Link>
                <Link to="/verify" className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600">
                  Verify Certificate
                </Link>
              </div>
            </div>
          } />
          <Route path="/manage" element={<CertificateManager />} />
          <Route path="/verify" element={<EnhancedVerifyPage />} />
          <Route path="/verify/:tokenId" element={<EnhancedVerifyPage />} />
        </Routes>
      </div>
    </Router>
  );
};

export default TestApp;