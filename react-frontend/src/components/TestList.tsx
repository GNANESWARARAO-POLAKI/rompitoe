import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiService from '../services/api';
import { Test, SubmissionRecord } from '../types';
import { useExam } from '../context/ExamContext';
import './TestList.css';

interface TestWithStatus extends Test {
  hasSubmission?: boolean;
  submissionScore?: number;
  submissionId?: number;
}

const TestList: React.FC = () => {
  const [tests, setTests] = useState<TestWithStatus[]>([]);
  const [submissions, setSubmissions] = useState<SubmissionRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [showInstructions, setShowInstructions] = useState<boolean>(false);
  const [selectedTest, setSelectedTest] = useState<TestWithStatus | null>(null);
  const navigate = useNavigate();
  const { user } = useExam();

  useEffect(() => {
    // Check if user is authenticated
    if (!apiService.isAuthenticated()) {
      navigate('/');
      return;
    }

    const fetchData = async () => {
      try {
        const availableTests = await apiService.getActiveTests();
        
        // Fetch user's submissions
        let userSubmissions: SubmissionRecord[] = [];
        try {
          const submissionsData = await apiService.getMySubmissions();
          userSubmissions = submissionsData.submissions || [];
          setSubmissions(userSubmissions);
        } catch (submissionErr) {
          console.log('No submissions found or error fetching submissions');
          setSubmissions([]);
        }

        // Map tests with submission status
        const testsWithStatus: TestWithStatus[] = availableTests.map((test: Test) => {
          const submission = userSubmissions.find(sub => sub.test_id === test.id);
          return {
            ...test,
            hasSubmission: !!submission,
            submissionScore: submission?.score.percentage,
            submissionId: submission?.id
          };
        });

        setTests(testsWithStatus);
      } catch (err: any) {
        console.error('Error fetching tests:', err);
        setError(err.response?.data?.error || 'Failed to load available tests.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [navigate]);

  const handleStartTestClick = (test: TestWithStatus) => {
    setSelectedTest(test);
    setShowInstructions(true);
  };

  const handleCloseInstructions = () => {
    setShowInstructions(false);
    setSelectedTest(null);
  };

  const handleConfirmStart = async () => {
    if (!selectedTest) return;
    
    try {
      setLoading(true);
      setShowInstructions(false);
      console.log(`User confirmed start for test ID: ${selectedTest.id}`);

      // Clear all previous exam data from localStorage
      localStorage.removeItem('examStartTime');
      localStorage.removeItem('questionStates');
      localStorage.removeItem('examData');
      
      console.log('Cleared previous exam data from localStorage');

      // Navigate to the exam page
      navigate(`/exam/${selectedTest.id}`);
    } catch (err: any) {
      console.error('Error navigating to test:', err);
      setError(err.response?.data?.error || 'Failed to navigate to the selected test.');
      setLoading(false);
    }
  };

  const handleViewResults = async (submissionId: number) => {
    try {
      setLoading(true);
      // Fetch detailed submission analysis
      const analysisData = await apiService.getSubmissionDetails(submissionId);
      
      // Navigate to result analysis with the fetched data
      navigate('/result-analysis', { 
        state: { 
          analysisData 
        } 
      });
    } catch (err: any) {
      console.error('Error viewing results:', err);
      setError('Failed to load results.');
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
    <div className="test-list-wrapper">
      <div className="test-list-header">
        <div className="header-content">
          <h1>📚 Available Tests</h1>
          <div className="header-details">
            <p className="user-info">👤 {user?.name || user?.user_id || 'Student'}</p>
          </div>
        </div>
      </div>

      <div className="test-list-container">
        <div className="sidebar-menu">
          <div className="sidebar-header">
            <h3>Menu</h3>
          </div>
          <button className="menu-item active">
            <span className="menu-icon">📝</span>
            <span className="menu-label">My Tests</span>
          </button>
          <button className="sidebar-logout-btn" onClick={handleLogout}>
            <span className="logout-icon">🚪</span>
            <span className="logout-label">Logout</span>
          </button>
        </div>

        <div className="main-content">
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
                  className={`test-card ${test.hasSubmission ? 'completed' : ''}`}
                >
                  <h2 className="test-title">{test.name}</h2>
                  <p className="test-description">{test.description}</p>
                  <div className="test-details">
                    <span className="test-duration">Duration: {test.duration_minutes} minutes</span>
                    {test.hasSubmission && (
                      <span className="test-score">Score: {test.submissionScore?.toFixed(2)}%</span>
                    )}
                  </div>
                  {test.hasSubmission ? (
                    <button 
                      className="view-results-button"
                      onClick={() => handleViewResults(test.submissionId!)}
                    >
                      View Results
                    </button>
                  ) : (
                    <button 
                      className="start-test-button"
                      onClick={() => handleStartTestClick(test)}
                    >
                      Start Test
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Instructions Dialog */}
      {showInstructions && selectedTest && (
        <div className="instructions-overlay" onClick={handleCloseInstructions}>
          <div className="instructions-dialog" onClick={(e) => e.stopPropagation()}>
            <button className="close-dialog" onClick={handleCloseInstructions}>✕</button>
            
            <h2 className="instructions-title">📋 Test Instructions</h2>
            <div className="test-info-banner">
              <h3>{selectedTest.name}</h3>
              <p>Duration: {selectedTest.duration_minutes} minutes</p>
            </div>

            <div className="instructions-content">
              <div className="instruction-section">
                <h4>⏰ Time Management</h4>
                <ul>
                  <li>The test duration is <strong>{selectedTest.duration_minutes} minutes</strong></li>
                  <li>A timer will be displayed at the top showing remaining time</li>
                  <li>The test will automatically submit when time expires</li>
                  <li>Manage your time wisely across all sections</li>
                </ul>
              </div>

              <div className="instruction-section">
                <h4>📝 Navigation & Answering</h4>
                <ul>
                  <li>Use <strong>Next</strong> and <strong>Previous</strong> buttons to navigate between questions</li>
                  <li>You can jump to any question using the question palette on the right</li>
                  <li>Select your answer by clicking on the option (A, B, C, or D)</li>
                  <li>You can change your answer anytime before submission</li>
                  <li>Use <strong>Clear Answer</strong> button to deselect your current answer</li>
                </ul>
              </div>

              <div className="instruction-section">
                <h4>🏷️ Question Status</h4>
                <ul>
                  <li><span className="status-badge answered">Answered</span> - You have selected an answer</li>
                  <li><span className="status-badge not-answered">Not Answered</span> - Question not attempted yet</li>
                  <li><span className="status-badge marked">Marked for Review</span> - Flagged for later review</li>
                  <li><span className="status-badge answered-marked">Answered & Marked</span> - Answered but marked for review</li>
                  <li><span className="status-badge not-visited">Not Visited</span> - Question not seen yet</li>
                </ul>
              </div>

              <div className="instruction-section">
                <h4>✅ Important Guidelines</h4>
                <ul>
                  <li>Ensure stable internet connection throughout the test</li>
                  <li>Do not refresh or close the browser during the test</li>
                  <li>Do not use browser back/forward buttons</li>
                  <li>Review all your answers before final submission</li>
                  <li>Once submitted, you cannot retake the test</li>
                  <li>Click <strong>Submit Test</strong> only when you're ready to finish</li>
                </ul>
              </div>

              <div className="instruction-section warning">
                <h4>⚠️ Warning</h4>
                <ul>
                  <li>Any attempt to switch tabs or windows may be flagged</li>
                  <li>Copying questions or sharing answers is strictly prohibited</li>
                  <li>Test must be completed in one sitting - no pause option available</li>
                </ul>
              </div>
            </div>

            <div className="instructions-footer">
              <button className="cancel-btn" onClick={handleCloseInstructions}>
                Cancel
              </button>
              <button className="confirm-btn" onClick={handleConfirmStart}>
                I Understand, Start Test →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TestList;