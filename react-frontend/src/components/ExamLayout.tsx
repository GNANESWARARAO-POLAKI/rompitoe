import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import QuestionCard from './QuestionCard';
import SidePanelNavigator from './SidePanelNavigator';
import { useExam } from '../context/ExamContext';
import { QuestionStatus } from '../types';
import apiService from '../services/api';
import './ExamLayout.css';

const ExamLayout: React.FC = () => {
  const navigate = useNavigate();
  const { testId } = useParams<{ testId: string }>();
  const {
    user,
    examData,
    setExamData,
    questionStates,
    currentSectionId,
    currentQuestionId,
    goToNextQuestion,
    goToPreviousQuestion,
    getCurrentSection,
    getCurrentQuestion,
    getAnswersMap,
    getRemainingTime,
  resetExamStartTime,
    goToQuestion,
    updateQuestionState,

  } = useExam();

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submissionError, setSubmissionError] = useState<string>('');
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState<boolean>(false);
  const [showFullscreenWarning, setShowFullscreenWarning] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Check if user is logged in and load exam data if needed
  useEffect(() => {
    const checkAuthAndLoadData = async () => {
      // Check if user is authenticated
      if (!apiService.isAuthenticated()) {
        console.log('User not authenticated, redirecting to login');
        navigate('/');
        return;
      }

      // Check if test ID is provided
      if (!testId) {
        console.error('No test ID provided');
        navigate('/tests');
        return;
      }

      try {
        // Always load the exam data fresh when component mounts
        console.log(`Loading exam data for test ID: ${testId}`);
        const data = await apiService.getQuestions(parseInt(testId));
        console.log('Exam data loaded:', data);
        setExamData(data);
      } catch (error) {
        console.error(`Failed to load exam data for test ${testId}:`, error);
        navigate('/tests');
      }
    };

    checkAuthAndLoadData();
  }, [navigate, testId, setExamData]);

  // Update timer: initialize when examData or remaining-time function changes
  useEffect(() => {
    // Set initial remaining time immediately
    let remaining = 0;
    try {
      remaining = getRemainingTime();
    } catch (e) {
      remaining = 0;
    }

    // If remaining is zero but we have exam data, assume saved start time expired
    // and reset it so the exam starts fresh instead of showing 00:00:00.
    if (remaining === 0 && examData) {
      resetExamStartTime();
      // set displayed remaining to the full exam duration immediately.
      // The context's start time update is async; using the duration from examData
      // prevents a brief 00:00:00 display.
      const durationMinutes = examData.duration_minutes || 180; // Default to 180 minutes (3 hours)
      remaining = durationMinutes * 60 * 1000; // Convert to milliseconds
    }

    setTimeRemaining(remaining);

    const timer = setInterval(() => {
      const remaining = getRemainingTime();
      setTimeRemaining(remaining);

      if (remaining <= 0) {
        clearInterval(timer);
        // call submit handler directly
        try {
          handleSubmitExam();
        } catch (e) {
          console.error('Auto-submit failed:', e);
        }
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [getRemainingTime, examData]);

  // Fullscreen check and enforcement
  useEffect(() => {
    const checkFullscreen = () => {
      const isCurrentlyFullscreen = !!(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).mozFullScreenElement ||
        (document as any).msFullscreenElement
      );
      
      setIsFullscreen(isCurrentlyFullscreen);
      
      // Show warning if not in fullscreen
      if (!isCurrentlyFullscreen && examData) {
        setShowFullscreenWarning(true);
      }
    };

    // Check immediately on mount
    checkFullscreen();

    // Listen for fullscreen changes
    const handleFullscreenChange = () => {
      checkFullscreen();
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, [examData]);

  // Request fullscreen
  const requestFullscreen = () => {
    const elem = document.documentElement;
    
    if (elem.requestFullscreen) {
      elem.requestFullscreen();
    } else if ((elem as any).webkitRequestFullscreen) {
      (elem as any).webkitRequestFullscreen();
    } else if ((elem as any).mozRequestFullScreen) {
      (elem as any).mozRequestFullScreen();
    } else if ((elem as any).msRequestFullscreen) {
      (elem as any).msRequestFullscreen();
    }
    
    setShowFullscreenWarning(false);
  };

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
    if (!user || !examData) {
      setSubmissionError('Cannot submit: Missing user or exam data');
      return;
    }

    setIsSubmitting(true);
    setSubmissionError('');

    try {
      const answers = getAnswersMap();

      // Check if we have any answers
      if (Object.keys(answers).length === 0) {
        setSubmissionError('You must answer at least one question before submitting.');
        setIsSubmitting(false);
        return;
      }

      // Ensure we have a valid test_id
      if (!examData.test_id) {
        setSubmissionError('Invalid test data. Please try again or contact support.');
        setIsSubmitting(false);
        return;
      }

      // Prepare question states for analysis
      const statesMap: any = {};
      questionStates.forEach(state => {
        statesMap[state.id.toString()] = {
          marked_for_review: state.status === 'marked-for-review'
        };
      });

      console.log('Submitting exam with answers:', answers);
      console.log('Test ID:', examData.test_id);

      const response = await apiService.submitExam({
        user_id: user.user_id,
        answers,
        test_id: examData.test_id,
        question_states: statesMap
      });

      console.log('Submission response:', response);

      // Redirect to result analysis page with complete data
      navigate('/result-analysis', {
        state: {
          analysisData: response
        }
      });
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
        <div className='user-image'>
          <img  id='user-image' src={user?.profilePicture} alt="User"  />

        </div>
        <div className="exam-info">
          <h2>Rompit OE</h2>
          <div className="exam-name">{examData.title}</div>
          <div className="user-info">
            <span>User ID: {user?.user_id}</span>
            {user?.name && <span>Name: {user.name}</span>}
          </div>
        </div>

        <div className={`timer-container ${timeRemaining < 300000 ? 'low-time-container' : ''}`}>
          <div className="timer">
            Time Remaining: <span className={timeRemaining < 300000 ? 'low-time' : ''}>
              {formatTime(timeRemaining)}
            </span>
          </div>
        </div>

        {/* Spacer to maintain layout balance */}
        <div style={{ width: '80px' }}></div>

        <button
          className="submit-button"
          onClick={() => setShowSubmitConfirm(true)}
          disabled={isSubmitting}
        >
          Submit
        </button>
      </header>

      <div className="exam-content">
        <div className="main-content" style={{ padding: '0rem' ,marginRight: '0' }}>
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
            </div>
          )}
        </div>
        
        <div className="side-panel-container">
          <SidePanelNavigator />
        </div>
      </div>
      
      {/* Fixed navigation buttons at bottom */}
      <div className="fixed-navigation-buttons">
        {/* Disable Previous button on first question */}
        <button
          className="nav-button prev"
          onClick={goToPreviousQuestion}
          disabled={
            // Disable if it's the first question of the first section
            currentSectionId === examData.sections[0]?.id &&
            currentQuestionId === examData.sections[0]?.questions[0]?.question_id
          }
        >
          <span className="btn-icon">←</span>
          <span className="btn-text">Previous</span>
        </button>

        {currentQuestion && (
          <>
            <button
              className={`nav-button mark-review ${
                ['marked-for-review', 'answered-marked'].includes(
                  questionStates.find(qs => qs.id === currentQuestion.id)?.status || ''
                )
                  ? 'active'
                  : ''
              }`}
              onClick={() => {
                const state = questionStates.find(qs => qs.id === currentQuestion.id);
                const currentStatus = state?.status || 'not-visited';
                const hasAnswer = !!state?.answer;
                
                let newStatus: QuestionStatus;
                
                if (currentStatus === 'marked-for-review' || currentStatus === 'answered-marked') {
                  // Unmarking: if has answer, set to 'answered', else 'not-answered'
                  newStatus = hasAnswer ? 'answered' : 'not-answered';
                } else {
                  // Marking: if has answer, set to 'answered-marked', else 'marked-for-review'
                  newStatus = hasAnswer ? 'answered-marked' : 'marked-for-review';
                }

                updateQuestionState(currentQuestion.id, newStatus, state?.answer);
              }}
            >
              <span className="btn-icon">
                {['marked-for-review', 'answered-marked'].includes(
                  questionStates.find(qs => qs.id === currentQuestion.id)?.status || ''
                )
                  ? '★'
                  : '☆'
                }
              </span>
              <span className="btn-text">
                {['marked-for-review', 'answered-marked'].includes(
                  questionStates.find(qs => qs.id === currentQuestion.id)?.status || ''
                )
                  ? 'Unmark Review'
                  : 'Mark Review'
                }
              </span>
            </button>
            
            {/* New Clear Answer button */}
            <button
              className="nav-button clear-answer"
              onClick={() => {
                const state = questionStates.find(qs => qs.id === currentQuestion.id);
                if (state?.answer) {
                  updateQuestionState(currentQuestion.id, 'not-answered', undefined);
                }
              }}
              disabled={!questionStates.find(qs => qs.id === currentQuestion.id)?.answer}
            >
              <span className="btn-icon">×</span>
              <span className="btn-text">Clear Answer</span>
            </button>
          </>
        )}

        {/* Save & Next button - always enabled, wraps to first question if at the end */}
        <button
          className="nav-button next"
          onClick={goToNextQuestion}
        >
          <span className="btn-text">Save & Next</span>
          <span className="btn-icon">→</span>
        </button>
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

      {/* Fullscreen Warning Dialog */}
      {showFullscreenWarning && (
        <div className="fullscreen-overlay">
          <div className="fullscreen-dialog">
            <div className="fullscreen-icon">⚠️</div>
            <h2>Fullscreen Required</h2>
            <p>
              For a better exam experience and to prevent distractions, 
              this exam must be taken in fullscreen mode.
            </p>
            <div className="fullscreen-benefits">
              <p><strong>Benefits of fullscreen mode:</strong></p>
              <ul>
                <li>✓ Minimize distractions</li>
                <li>✓ Better focus on questions</li>
                <li>✓ More screen space for content</li>
                <li>✓ Professional exam environment</li>
              </ul>
            </div>
            <p className="fullscreen-note">
              <strong>Note:</strong> Press <kbd>F11</kbd> or <kbd>Esc</kbd> anytime to exit fullscreen.
            </p>
            <button 
              className="fullscreen-button"
              onClick={requestFullscreen}
            >
              Enter Fullscreen Mode
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExamLayout;