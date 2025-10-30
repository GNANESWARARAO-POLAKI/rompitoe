import React, { useState, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import './ResultAnalysis.css';

interface OverallSummary {
  score_points: number;
  score_total: number;
  score_percentage: number;
  pass_status: string;
  accuracy: number;
  total_questions: number;
  attempted: number;
  not_attempted: number;
  correct: number;
  incorrect: number;
  marked_for_review: number;
}

interface SectionAnalysis {
  section_name: string;
  total_questions: number;
  attempted: number;
  correct: number;
  incorrect: number;
  score_percentage: number;
  performance: string;
}

interface QuestionDetail {
  question_number: number;
  section_name: string;
  question_text: string;
  options?: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  correct_answer: string;
  correct_answer_text?: string;
  your_answer: string | null;
  your_answer_text?: string;
  is_correct: boolean;
  is_attempted: boolean;
  is_marked_for_review: boolean;
  status: string;
}

interface AnalysisData {
  message: string;
  submission_id: number;
  test_id: number;
  test_name: string;
  test_duration_minutes: number;
  overall_summary: OverallSummary;
  section_analysis: SectionAnalysis[];
  question_details: QuestionDetail[];
}

const ResultAnalysis: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const analysisData = location.state?.analysisData;

  const [activeTab, setActiveTab] = useState<'summary' | 'sections' | 'questions'>('summary');
  const [selectedSection, setSelectedSection] = useState<string>('all');

  // Get user info from localStorage
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  // Filter questions by selected section
  const filteredQuestions = useMemo(() => {
    if (!analysisData?.question_details) return [];
    if (selectedSection === 'all') return analysisData.question_details;
    return analysisData.question_details.filter((q: QuestionDetail) => q.section_name === selectedSection);
  }, [analysisData, selectedSection]);

  // Get unique sections
  const sections = useMemo(() => {
    if (!analysisData?.question_details) return [];
    return Array.from(new Set(analysisData.question_details.map((q: QuestionDetail) => q.section_name))) as string[];
  }, [analysisData]);

  if (!analysisData) {
    return (
      <div className="result-analysis-wrapper">
        <div className="error-container">
          <h2>No Analysis Data Available</h2>
          <p>Please submit an exam to view your results.</p>
          <button onClick={() => navigate('/tests')} className="btn-primary">
            Back to Tests
          </button>
        </div>
      </div>
    );
  }

  const overall_summary = analysisData.overall_summary || {};
  const section_analysis = analysisData.section_analysis || [];
  const test_name = analysisData.test_name || 'Exam';

  // Get grade info based on percentage
  const getGradeInfo = (percentage: number) => {
    if (percentage >= 90) return { grade: 'A+', color: '#10b981', emoji: '🏆' };
    if (percentage >= 80) return { grade: 'A', color: '#22c55e', emoji: '🎉' };
    if (percentage >= 70) return { grade: 'B+', color: '#84cc16', emoji: '😊' };
    if (percentage >= 60) return { grade: 'B', color: '#eab308', emoji: '👍' };
    if (percentage >= 50) return { grade: 'C', color: '#f59e0b', emoji: '📚' };
    if (percentage >= 40) return { grade: 'D', color: '#f97316', emoji: '💪' };
    return { grade: 'F', color: '#ef4444', emoji: '😔' };
  };

  const gradeInfo = getGradeInfo(overall_summary.score_percentage || 0);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'correct': return '✓';
      case 'incorrect': return '✗';
      case 'not_attempted': return '○';
      default: return '○';
    }
  };

  const getPerformanceColor = (performance: string) => {
    switch (performance) {
      case 'Strong': return '#10b981';
      case 'Average': return '#f59e0b';
      case 'Needs Improvement': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const renderSummary = () => (
    <div className="analysis-content">
      <div className="summary-container">
        {/* Score Circle and Pass/Fail Status */}
        <div className="summary-top">
          <div className="score-display">
            <div className="score-circle" style={{ borderColor: gradeInfo.color }}>
              <div className="score-value">{overall_summary.score_percentage}%</div>
              <div className="grade-badge" style={{ color: gradeInfo.color }}>
                {gradeInfo.grade} {gradeInfo.emoji}
              </div>
            </div>
            <div className="pass-status" style={{ 
              backgroundColor: overall_summary.pass_status === 'Pass' ? '#dcfce7' : '#fee2e2',
              color: overall_summary.pass_status === 'Pass' ? '#16a34a' : '#dc2626'
            }}>
              {overall_summary.pass_status}
            </div>
          </div>
        </div>

        {/* Performance Stats */}
        <div className="summary-section">
          <h3 className="section-title">📊 Performance Metrics</h3>
          <div className="stats-row">
            <div className="stat-box primary">
              <div className="stat-icon">📝</div>
              <div className="stat-info">
                <div className="stat-label">Total Score</div>
                <div className="stat-value">{overall_summary.score_points}/{overall_summary.score_total}</div>
              </div>
            </div>
            <div className="stat-box success">
              <div className="stat-icon">🎯</div>
              <div className="stat-info">
                <div className="stat-label">Accuracy</div>
                <div className="stat-value">{overall_summary.accuracy}%</div>
              </div>
            </div>
            <div className="stat-box info">
              <div className="stat-icon">📋</div>
              <div className="stat-info">
                <div className="stat-label">Total Questions</div>
                <div className="stat-value">{overall_summary.total_questions}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Question Statistics */}
        <div className="summary-section">
          <h3 className="section-title">📈 Question Analysis</h3>
          <div className="stats-row">
            <div className="stat-box success">
              <div className="stat-icon">✓</div>
              <div className="stat-info">
                <div className="stat-label">Correct Answers</div>
                <div className="stat-value">{overall_summary.correct}</div>
              </div>
            </div>
            <div className="stat-box danger">
              <div className="stat-icon">✗</div>
              <div className="stat-info">
                <div className="stat-label">Incorrect Answers</div>
                <div className="stat-value">{overall_summary.incorrect}</div>
              </div>
            </div>
            <div className="stat-box warning">
              <div className="stat-icon">○</div>
              <div className="stat-info">
                <div className="stat-label">Not Attempted</div>
                <div className="stat-value">{overall_summary.not_attempted}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Attempt Summary */}
        <div className="summary-section">
          <h3 className="section-title">📊 Completion Status</h3>
          <div className="completion-bars">
            <div className="completion-item">
              <div className="completion-header">
                <span className="completion-label">Attempted Questions</span>
                <span className="completion-value">{overall_summary.attempted} of {overall_summary.total_questions}</span>
              </div>
              <div className="progress-bar">
                <div 
                  className="progress-fill success" 
                  style={{ width: `${(overall_summary.attempted / overall_summary.total_questions) * 100}%` }}
                />
              </div>
            </div>
            <div className="completion-item">
              <div className="completion-header">
                <span className="completion-label">Correct Answers</span>
                <span className="completion-value">{overall_summary.correct} of {overall_summary.attempted}</span>
              </div>
              <div className="progress-bar">
                <div 
                  className="progress-fill primary" 
                  style={{ width: `${overall_summary.attempted > 0 ? (overall_summary.correct / overall_summary.attempted) * 100 : 0}%` }}
                />
              </div>
            </div>
            {overall_summary.marked_for_review > 0 && (
              <div className="completion-item">
                <div className="completion-header">
                  <span className="completion-label">Marked for Review</span>
                  <span className="completion-value">{overall_summary.marked_for_review}</span>
                </div>
                <div className="progress-bar">
                  <div 
                    className="progress-fill warning" 
                    style={{ width: `${(overall_summary.marked_for_review / overall_summary.total_questions) * 100}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const renderSections = () => (
    <div className="analysis-content">
      <div className="sections-grid">
        {section_analysis.map((section: SectionAnalysis, index: number) => (
          <div key={index} className="section-card">
            <div className="section-header">
              <h3>{section.section_name}</h3>
              <span className="performance-badge" style={{ 
                backgroundColor: getPerformanceColor(section.performance) + '20',
                color: getPerformanceColor(section.performance)
              }}>
                {section.performance}
              </span>
            </div>
            <div className="section-stats">
              <div className="section-score">{section.score_percentage}%</div>
              <div className="section-details">
                <div className="detail-row">
                  <span>Correct:</span>
                  <strong className="success">{section.correct}/{section.total_questions}</strong>
                </div>
                <div className="detail-row">
                  <span>Incorrect:</span>
                  <strong className="danger">{section.incorrect}</strong>
                </div>
                <div className="detail-row">
                  <span>Not Attempted:</span>
                  <strong className="warning">{section.total_questions - section.attempted}</strong>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderQuestions = () => (
    <div className="analysis-content">
      <div className="section-filter">
        <label>Filter by Section:</label>
        <select 
          value={selectedSection} 
          onChange={(e) => setSelectedSection(e.target.value)}
          className="section-select"
        >
          <option value="all">All Sections</option>
          {sections.map((section: string, index: number) => (
            <option key={index} value={section}>{section}</option>
          ))}
        </select>
      </div>

      <div className="questions-list">
        {filteredQuestions.map((question: QuestionDetail, index: number) => (
          <div key={index} className={`question-item ${question.status}`}>
            <div className="question-header">
              <div className="question-meta">
                <span className="question-number">Q{question.question_number}</span>
                <span className="section-tag">{question.section_name}</span>
                <span className={`status-badge status-${question.status}`}>
                  {getStatusIcon(question.status)} {question.status.replace('_', ' ')}
                </span>
              </div>
            </div>

            <div className="question-body">
              <p className="question-text">{question.question_text}</p>
              
              <div className="options-grid">
                {question.options && Object.entries(question.options).map(([key, value]) => {
                  const isCorrect = key === question.correct_answer;
                  const isSelected = key === question.your_answer;
                  
                  return (
                    <div 
                      key={key} 
                      className={`option-box ${isCorrect ? 'correct-option' : ''} ${isSelected && !isCorrect ? 'wrong-option' : ''} ${isSelected ? 'selected-option' : ''}`}
                    >
                      <div className="option-label">
                        <span className="option-letter">{key}</span>
                        {isCorrect && <span className="correct-mark">✓ Correct</span>}
                        {isSelected && !isCorrect && <span className="wrong-mark">✗ Your Answer</span>}
                      </div>
                      <div className="option-text">{value}</div>
                    </div>
                  );
                })}
              </div>

              <div className="answer-summary">
                <div className="answer-row">
                  <span className="label">Correct Answer:</span>
                  <strong className="correct-answer">
                    {question.correct_answer_text 
                      ? `${question.correct_answer}: ${question.correct_answer_text}` 
                      : `Option ${question.correct_answer}`}
                  </strong>
                </div>
                {question.your_answer && question.your_answer !== 'Not Attempted' && (
                  <div className="answer-row">
                    <span className="label">Your Answer:</span>
                    <strong className={question.status === 'correct' ? 'correct-answer' : 'wrong-answer'}>
                      {question.your_answer_text 
                        ? `${question.your_answer}: ${question.your_answer_text}` 
                        : `Option ${question.your_answer}`}
                    </strong>
                  </div>
                )}
                {(!question.your_answer || question.your_answer === 'Not Attempted') && (
                  <div className="answer-row">
                    <span className="label">Your Answer:</span>
                    <strong className="not-attempted-text">Not Attempted</strong>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="result-analysis-wrapper">
      <div className="analysis-header">
        <div className="header-content">
          <h1>Exam Results Analysis</h1>
          <div className="header-details">
            <p className="test-name">📝 {analysisData.test_name}</p>
            <p className="user-info">👤 {user.name || 'Student'} (ID: {user.user_id})</p>
          </div>
        </div>
      </div>

      <div className="analysis-container">
        <div className="sidebar-tabs">
          <button
            className={`tab-button ${activeTab === 'summary' ? 'active' : ''}`}
            onClick={() => setActiveTab('summary')}
          >
            <span className="tab-icon">📊</span>
            <span className="tab-label">Overall Summary</span>
          </button>
          <button
            className={`tab-button ${activeTab === 'sections' ? 'active' : ''}`}
            onClick={() => setActiveTab('sections')}
          >
            <span className="tab-icon">📚</span>
            <span className="tab-label">Section Analysis</span>
          </button>
          <button
            className={`tab-button ${activeTab === 'questions' ? 'active' : ''}`}
            onClick={() => setActiveTab('questions')}
          >
            <span className="tab-icon">❓</span>
            <span className="tab-label">Question Details</span>
          </button>
          
          <button 
            onClick={() => navigate('/tests')} 
            className="sidebar-logout-btn"
          >
            ← Back to Tests
          </button>
        </div>

        <div className="main-content">
          {activeTab === 'summary' && renderSummary()}
          {activeTab === 'sections' && renderSections()}
          {activeTab === 'questions' && renderQuestions()}
        </div>
      </div>
    </div>
  );
};

export default ResultAnalysis;
