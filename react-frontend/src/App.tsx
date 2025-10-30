import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ExamProvider } from './context/ExamContext';
import LandingPage from './components/LandingPage';
import Login from './components/Login';
import ExamLayout from './components/ExamLayout';
import Result from './components/Result';
import ResultAnalysis from './components/ResultAnalysis';
import AdminLogin from './components/AdminLogin';
import AdminPanel from './components/AdminPanel';
import TestEditor from './components/TestEditor';
import ProtectedRoute from './components/ProtectedRoute';
import TestList from './components/TestList';
import './App.css';

function App() {
  return (
    <ExamProvider>
      <Router>
        <div className="App">
          <Routes>
            <Route path="/" element={
              <div className="scrollable-page">
                <LandingPage />
              </div>
            } />
            <Route path="/login" element={
              <div className="scrollable-page">
                <Login />
              </div>
            } />
            <Route path="/tests" element={
              <div className="scrollable-page">
                <ProtectedRoute element={<TestList />} />
              </div>
            } />
            <Route path="/exam/:testId" element={
              <div className="exam-page">
                <ProtectedRoute element={<ExamLayout />} />
              </div>
            } />
            <Route path="/result" element={
              <div className="scrollable-page">
                <ProtectedRoute element={<Result />} />
              </div>
            } />
            <Route path="/result-analysis" element={
              <div className="scrollable-page">
                <ProtectedRoute element={<ResultAnalysis />} />
              </div>
            } />
            <Route path="/admin" element={
              <div className="scrollable-page">
                <AdminLogin />
              </div>
            } />
            <Route path="/admin-panel" element={
              <div className="scrollable-page">
                <ProtectedRoute element={<AdminPanel />} requireAdmin={true} />
              </div>
            } />
            <Route path="/admin-panel/test/new" element={
              <div className="scrollable-page">
                <ProtectedRoute element={<TestEditor />} requireAdmin={true} />
              </div>
            } />
            <Route path="/admin-panel/test/:testId" element={
              <div className="scrollable-page">
                <ProtectedRoute element={<TestEditor />} requireAdmin={true} />
              </div>
            } />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </div>
      </Router>
    </ExamProvider>
  );
}

export default App;
