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
    updateQuestionState(
      question.id, 
      'answered', 
      option
    );
  };
  
  // Handle mark for review
  const handleMarkForReview = () => {
    const currentStatus = questionState?.status || 'not-visited';
    const newStatus = currentStatus === 'marked-for-review' 
      ? (questionState?.answer ? 'answered' : 'not-answered')
      : 'marked-for-review';
    
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
        {question.question}
      </div>
      
      <div className="options-container">
        {Object.entries(question.options).map(([key, value]) => (
          <div 
            key={key} 
            className={`option ${isOptionSelected(key) ? 'selected' : ''}`}
            onClick={() => handleOptionSelect(key)}
          >
            <div className="option-key">{key}</div>
            <div className="option-value">{value}</div>
          </div>
        ))}
      </div>
      
      <div className="question-actions">
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
      </div>
    </div>
  );
};

export default QuestionCard;