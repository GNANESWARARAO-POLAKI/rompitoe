import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import QuestionCard from './QuestionCard';
import SidePanelNavigator from './SidePanelNavigator';
import { useExam } from '../context/ExamContext';
import apiService from '../services/api';
import './ExamLayout.css';

const ExamLayout: React.FC = () => {
  const navigate = useNavigate();
  const {
    user,
    examData,
    questionStates,
    currentSectionId,
    currentQuestionId,
    goToNextQuestion,
    goToPreviousQuestion,
    getCurrentSection,
    getCurrentQuestion,
    getAnswersMap,
    getRemainingTime,
    goToQuestion,
    updateQuestionState
  } = useExam();
  
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submissionError, setSubmissionError] = useState<string>('');
  const [timeRemaining, setTimeRemaining] = useState<number>(getRemainingTime());
  const [showSubmitConfirm, setShowSubmitConfirm] = useState<boolean>(false);
  
  // Check if user is logged in and load exam data if needed
  useEffect(() => {
    const checkAuthAndLoadData = async () => {
      if (!user) {
        navigate('/');
        return;
      }
      
      if (!examData && apiService.isAuthenticated()) {
        try {
          const data = await apiService.getQuestions();
          // setExamData is not directly accessible here, but the ExamContext
          // should handle loading the data when the user is authenticated
        } catch (error) {
          console.error('Failed to load exam data:', error);
          navigate('/');
        }
      }
    };
    
    checkAuthAndLoadData();
  }, [user, examData, navigate]);
  
  // Update timer
  useEffect(() => {
    const timer = setInterval(() => {
      const remaining = getRemainingTime();
      setTimeRemaining(remaining);
      
      if (remaining <= 0) {
        clearInterval(timer);
        handleSubmitExam();
      }
    }, 1000);
    
    return () => clearInterval(timer);
  }, []);
  
  // Format time remaining
  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };
  
  // Get current question
  const currentQuestion = getCurrentQuestion();
  
  // Submit exam
  const handleSubmitExam = async () => {
    if (!user) return;
    
    setIsSubmitting(true);
    setSubmissionError('');
    
    try {
      const answers = getAnswersMap();
      
      const response = await apiService.submitExam({
        user_id: user.user_id,
        answers
      });
      
      // Redirect to result page with score data
      navigate('/result', { state: { score: response.score } });
    } catch (err: any) {
      console.error('Submission error:', err);
      setSubmissionError(err.response?.data?.error || 'Failed to submit exam. Please try again.');
      setIsSubmitting(false);
      setShowSubmitConfirm(false);
    }
  };
  
  // Calculate progress
  const calculateProgress = () => {
    const totalQuestions = examData?.sections.reduce(
      (acc, section) => acc + section.questions.length, 
      0
    ) || 0;
    
    const answeredCount = questionStates.filter(
      state => state.status === 'answered'
    ).length;
    
    return (answeredCount / totalQuestions) * 100;
  };
  
  if (!examData || !currentQuestion) {
    return <div className="loading">Loading exam...</div>;
  }
  
  return (
    <div className="exam-layout">
      <header className="exam-header">
        <div className="exam-info">
          <h2>Rompit Online Exam</h2>
          <div className="user-info">
            <span>User ID: {user?.user_id}</span>
            {user?.name && <span>Name: {user.name}</span>}
          </div>
        </div>
        
        <div className="timer-container">
          <div className="timer">
            Time Remaining: <span className={timeRemaining < 300000 ? 'low-time' : ''}>
              {formatTime(timeRemaining)}
            </span>
          </div>
        </div>
        
        <button 
          className="submit-button"
          onClick={() => setShowSubmitConfirm(true)}
          disabled={isSubmitting}
        >
          Submit
        </button>
      </header>
      
      <div className="exam-content">
        <div className="side-panel-container">
          <SidePanelNavigator />
        </div>
        
        <div className="main-content">
          <div className="progress-bar-container">
            <div className="progress-label">Progress: {Math.round(calculateProgress())}%</div>
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ width: `${calculateProgress()}%` }}
              ></div>
            </div>
          </div>
          
          <div className="section-navigation">
            {/* <div className="section-label">Sections:</div> */}
            <div className="section-tabs">
              {examData.sections.map(section => (
                <button
                  key={section.id}
                  className={`section-nav-tab ${section.id === currentSectionId ? 'active' : ''}`}
                  onClick={() => {
                    // Navigate to the first question of this section
                    const firstQuestion = section.questions[0];
                    if (firstQuestion) {
                      goToQuestion(section.id, firstQuestion.question_id);
                    }
                  }}
                >
                  {section.name}
                </button>
              ))}
            </div>
          </div>
          
          {currentQuestion && (
            <div className="question-container">
              <QuestionCard question={currentQuestion} />
              
              <div className="navigation-buttons">
                <button 
                  className="nav-button prev"
                  onClick={goToPreviousQuestion}
                >
                  Previous
                </button>
                
                {currentQuestion && (
                  <button 
                    className={`nav-button mark-review ${
                      questionStates.find(qs => qs.id === currentQuestion.id)?.status === 'marked-for-review' 
                        ? 'active' 
                        : ''
                    }`}
                    onClick={() => {
                      const state = questionStates.find(qs => qs.id === currentQuestion.id);
                      const newStatus = state?.status === 'marked-for-review' 
                        ? (state?.answer ? 'answered' : 'not-answered')
                        : 'marked-for-review';
                      
                      updateQuestionState(currentQuestion.id, newStatus, state?.answer);
                    }}
                  >
                    {questionStates.find(qs => qs.id === currentQuestion.id)?.status === 'marked-for-review'
                      ? 'Unmark for Review'
                      : 'Mark for Review'
                    }
                  </button>
                )}
                
                <button 
                  className="nav-button next"
                  onClick={goToNextQuestion}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {showSubmitConfirm && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Confirm Submission</h3>
            <p>Are you sure you want to submit your exam?</p>
            
            <div className="exam-summary">
              <div className="summary-row">
                <span>Total Questions:</span>
                <span>{examData.sections.reduce((acc, section) => acc + section.questions.length, 0)}</span>
              </div>
              <div className="summary-row">
                <span>Answered:</span>
                <span>{questionStates.filter(state => state.status === 'answered').length}</span>
              </div>
              <div className="summary-row">
                <span>Not Answered:</span>
                <span>{questionStates.filter(state => state.status === 'not-answered').length}</span>
              </div>
              <div className="summary-row">
                <span>Marked for Review:</span>
                <span>{questionStates.filter(state => state.status === 'marked-for-review').length}</span>
              </div>
              <div className="summary-row">
                <span>Not Visited:</span>
                <span>{questionStates.filter(state => state.status === 'not-visited').length}</span>
              </div>
            </div>
            
            {submissionError && (
              <div className="error-message">{submissionError}</div>
            )}
            
            <div className="modal-actions">
              <button 
                className="cancel-button"
                onClick={() => setShowSubmitConfirm(false)}
                disabled={isSubmitting}
              >
                Cancel
              </button>
              
              <button 
                className="confirm-button"
                onClick={handleSubmitExam}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Submitting...' : 'Confirm Submit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExamLayout;