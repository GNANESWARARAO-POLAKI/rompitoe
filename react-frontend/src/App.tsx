import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ExamProvider } from './context/ExamContext';
import Login from './components/Login';
import ExamLayout from './components/ExamLayout';
import Result from './components/Result';
import AdminLogin from './components/AdminLogin';
import AdminPanel from './components/AdminPanel';
import ProtectedRoute from './components/ProtectedRoute';
import TestList from './components/TestList';
import './App.css';

function App() {
  return (
    <ExamProvider>
      <Router>
        <div className="App">
          <Routes>
            <Route path="/" element={<Login />} />
            <Route path="/tests" element={
              <ProtectedRoute element={<TestList />} />
            } />
            <Route path="/exam/:testId" element={
              <ProtectedRoute element={<ExamLayout />} />
            } />
            <Route path="/result" element={
              <ProtectedRoute element={<Result />} />
            } />
            <Route path="/admin" element={<AdminLogin />} />
            <Route path="/admin-panel" element={
              <ProtectedRoute element={<AdminPanel />} requireAdmin={true} />
            } />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </div>
      </Router>
    </ExamProvider>
  );
}

export default App;
