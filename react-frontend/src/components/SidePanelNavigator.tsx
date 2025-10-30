import React from 'react';
import { useExam } from '../context/ExamContext';
import './SidePanelNavigator.css';

const SidePanelNavigator: React.FC = () => {
  const { 
    examData, 
    questionStates, 
    currentSectionId, 
    currentQuestionId,
    goToQuestion
  } = useExam();
  
  if (!examData) {
    return <div className="side-panel">Loading questions...</div>;
  }
  
  // Get status class for question button
  const getStatusClass = (questionId: number) => {
    const state = questionStates.find(state => state.id === questionId);
    return state?.status || 'not-visited';
  };
  
  // Check if a question is active (currently viewing)
  const isActive = (sectionId: number, questionId: number) => {
    return currentSectionId === sectionId && currentQuestionId === questionId;
  };
  
  // Handle click on a question button
  const handleQuestionClick = (sectionId: number, questionId: number) => {
    goToQuestion(sectionId, questionId);
  };
  
  return (
    <div className="side-panel">
      <div className="panel-header">
        <h3>Exam Navigation</h3>
      </div>
      
      <div className="status-legend">
        <div className="legend-item">
          <div className="status-dot not-visited"></div>
          <span>Not Visited</span>
        </div>
        <div className="legend-item">
          <div className="status-dot not-answered"></div>
          <span>Not Answered</span>
        </div>
        <div className="legend-item">
          <div className="status-dot answered"></div>
          <span>Answered</span>
        </div>
        <div className="legend-item">
          <div className="status-dot marked-for-review"></div>
          <span>Marked for Review</span>
        </div>
        <div className="legend-item">
          <div className="status-dot answered-marked"></div>
          <span>Answered & Marked</span>
        </div>
      </div>
      
      <div className="sections-container">
        {examData.sections
          .filter(section => section.id === currentSectionId)
          .map(section => (
          <div key={section.id} className="section-container">
            <div className="section-header">
              {section.name}
            </div>
            <div className="questions-grid">
              {section.questions.map(question => {
                const statusClass = getStatusClass(question.id);
                return (
                  <div key={question.id} className="question-button-container">
                    <button
                      className={`question-button ${statusClass} ${isActive(section.id, question.question_id) ? 'active' : ''}`}
                      onClick={() => handleQuestionClick(section.id, question.question_id)}
                    >
                      {question.question_id}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      
      <div className="exam-summary">
        <div className="summary-item">
          <span className="label">Total Questions:</span>
          <span className="value">
            {examData.sections.reduce((acc, section) => acc + section.questions.length, 0)}
          </span>
        </div>
        <div className="summary-item">
          <span className="label">Answered:</span>
          <span className="value answered-count">
            {questionStates.filter(state => state.status === 'answered').length}
          </span>
        </div>
        <div className="summary-item">
          <span className="label">Not Answered:</span>
          <span className="value not-answered-count">
            {questionStates.filter(state => state.status === 'not-answered').length}
          </span>
        </div>
        <div className="summary-item">
          <span className="label">Marked for Review:</span>
          <span className="value marked-count">
            {questionStates.filter(state => state.status === 'marked-for-review').length}
          </span>
        </div>
        <div className="summary-item">
          <span className="label">Answered & Marked:</span>
          <span className="value answered-marked-count">
            {questionStates.filter(state => state.status === 'answered-marked').length}
          </span>
        </div>
        <div className="summary-item">
          <span className="label">Not Visited:</span>
          <span className="value not-visited-count">
            {questionStates.filter(state => state.status === 'not-visited').length}
          </span>
        </div>
      </div>
    </div>
  );
};

export default SidePanelNavigator;