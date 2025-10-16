import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import QuestionCard from './QuestionCard';
import SidePanelNavigator from './SidePanelNavigator';
import { useExam } from '../context/ExamContext';
import apiService from '../services/api';
import './ExamLayout.css';
// import { profile } from 'console';

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
      // The context's start time update is async; using the duration constant
      // prevents a brief 00:00:00 display.
      remaining = 3 * 60 * 60 * 1000; // match context's examDuration
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

      console.log('Submitting exam with answers:', answers);
      console.log('Test ID:', examData.test_id);

      const response = await apiService.submitExam({
        user_id: user.user_id,
        answers,
        test_id: examData.test_id
      });

      console.log('Submission response:', response);

      // Redirect to result page with score data and test info
      navigate('/result', {
        state: {
          score: response.score.percentage,
          points: response.score.points,
          total: response.score.total,
          testId: response.test_id,
          testTitle: response.test_name
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
          Previous
        </button>

        {currentQuestion && (
          <>
            <button
              className={`nav-button mark-review ${questionStates.find(qs => qs.id === currentQuestion.id)?.status === 'marked-for-review'
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
              Clear Answer
            </button>
          </>
        )}

        {/* Disable Next button on last question */}
        <button
          className="nav-button next"
          onClick={goToNextQuestion}
          disabled={
            // Disable if it's the last question of the last section
            currentSectionId === examData.sections[examData.sections.length - 1]?.id &&
            currentQuestionId === examData.sections[examData.sections.length - 1]?.questions[
              examData.sections[examData.sections.length - 1]?.questions.length - 1
            ]?.question_id
          }
        >
          Next
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
    </div>
  );
};

export default ExamLayout;