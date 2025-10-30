import React from 'react';
import { Question } from '../types';
import { useExam } from '../context/ExamContext';
import './QuestionCard.css';

interface QuestionCardProps {
  question: Question;
}

const QuestionCard: React.FC<QuestionCardProps> = ({ question }) => {
  const { questionStates, updateQuestionState } = useExam();
  
  // Find current question state
  const questionState = questionStates.find(state => state.id === question.id);
  
  // Handle answer selection
  const handleOptionSelect = (option: string) => {
    const currentStatus = questionState?.status || 'not-visited';
    
    // If already marked for review, change to 'answered-marked', else just 'answered'
    const newStatus = (currentStatus === 'marked-for-review') 
      ? 'answered-marked' 
      : 'answered';
    
    updateQuestionState(
      question.id, 
      newStatus, 
      option
    );
  };
  
  // Handle mark for review
  const handleMarkForReview = () => {
    const currentStatus = questionState?.status || 'not-visited';
    const hasAnswer = !!questionState?.answer;
    
    let newStatus: 'answered' | 'not-answered' | 'marked-for-review' | 'answered-marked' | 'not-visited';
    
    if (currentStatus === 'marked-for-review' || currentStatus === 'answered-marked') {
      // Unmarking: if has answer, set to 'answered', else 'not-answered'
      newStatus = hasAnswer ? 'answered' : 'not-answered';
    } else {
      // Marking: if has answer, set to 'answered-marked', else 'marked-for-review'
      newStatus = hasAnswer ? 'answered-marked' : 'marked-for-review';
    }
    
    updateQuestionState(
      question.id,
      newStatus,
      questionState?.answer
    );
  };
  
  // Check if an option is selected
  const isOptionSelected = (option: string) => {
    return questionState?.answer === option;
  };
  
  // Format the question number
  const questionNumber = `Q${question.question_id}`;
  
  return (
    <div className="question-card">
      <div className="question-header">
        <div className="question-number">
          {questionNumber}
        </div>
        <div className="section-name">{question.section_name}</div>
      </div>
      
      <div className="question-text">
        {question.question.split('\\n').map((line, idx) => (
          <React.Fragment key={idx}>
        {line}
        {idx < question.question.split('\\n').length - 1 && <br />}
          </React.Fragment>
        ))}
      </div>
      
      <div className="options-container">
        {Object.entries(question.options).map(([key, value]) => (
          <div 
        key={key} 
        className={`option ${isOptionSelected(key) ? 'selected' : ''}`}
        onClick={() => handleOptionSelect(key)}
          >
        <div className="option-key">{key}</div>
        <div className="option-value">
          {value.split('\\n').map((line, idx) => (
            <React.Fragment key={idx}>
          {line}
          {idx < value.split('\\n').length - 1 && <br />}
            </React.Fragment>
          ))}
        </div>
          </div>
        ))}
      </div>
      
      {/* <div className="question-actions">
        <button 
          className={`review-button ${questionState?.status === 'marked-for-review' ? 'active' : ''}`}
          onClick={handleMarkForReview}
        >
          {questionState?.status === 'marked-for-review' 
            ? 'Unmark for Review' 
            : 'Mark for Review'}
        </button>
        
        <div className="question-status">
          Status: <span className={`status ${questionState?.status || 'not-visited'}`}>
            {questionState?.status === 'answered' ? 'Answered' : 
              questionState?.status === 'not-answered' ? 'Not Answered' :
              questionState?.status === 'marked-for-review' ? 'Marked for Review' : 
              'Not Visited'}
          </span>
        </div>
      </div> */}
    </div>
  );
};

export default QuestionCard;