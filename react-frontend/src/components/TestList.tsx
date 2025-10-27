import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiService from '../services/api';
import { Test } from '../types';
import { useExam } from '../context/ExamContext';
import './TestList.css';

const TestList: React.FC = () => {
  const [tests, setTests] = useState<Test[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const navigate = useNavigate();
  const { user } = useExam();

  useEffect(() => {
    // Check if user is authenticated
    if (!apiService.isAuthenticated()) {
      navigate('/');
      return;
    }

    const fetchTests = async () => {
      try {
        const availableTests = await apiService.getActiveTests();
        setTests(availableTests);
      } catch (err: any) {
        console.error('Error fetching tests:', err);
        setError(err.response?.data?.error || 'Failed to load available tests.');
      } finally {
        setLoading(false);
      }
    };

    fetchTests();
  }, [navigate]);

  const handleTestSelection = async (testId: number) => {
    try {
      setLoading(true);
      console.log(`User selected test ID: ${testId}`);

      // Don't try to load questions here, just navigate to the exam page
      // The ExamLayout component will load the questions
      navigate(`/exam/${testId}`);
    } catch (err: any) {
      console.error('Error navigating to test:', err);
      setError(err.response?.data?.error || 'Failed to navigate to the selected test.');
      setLoading(false);
    }
  };

  const handleLogout = () => {
    apiService.logout();
    navigate('/');
  };

  if (loading) {
    return (
      <div className="test-list-container">
        <div className="loading-spinner">Loading available tests...</div>
      </div>
    );
  }

  return (
    <div className="test-list-container">
      <div className="test-list-header">
        <h1>Available Tests</h1>
        <div className="user-section">
          {user && <p>Welcome, {user.name || user.user_id}</p>}
          <button className="logout-button" onClick={handleLogout}>Logout</button>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      {tests.length === 0 ? (
        <div className="no-tests-message">
          <p>No tests are currently available for you.</p>
          <p>Please contact your administrator if you believe this is an error.</p>
        </div>
      ) : (
        <div className="tests-grid">
          {tests.map(test => (
            <div
              key={test.id}
              className="test-card"
              onClick={() => handleTestSelection(test.id)}
            >
              <h2 className="test-title">{test.name}</h2>
              <p className="test-description">{test.description}</p>
              <div className="test-details">
                <span className="test-duration">Duration: {test.duration_minutes} minutes</span>
              </div>
              <button className="start-test-button">Start Test</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TestList;