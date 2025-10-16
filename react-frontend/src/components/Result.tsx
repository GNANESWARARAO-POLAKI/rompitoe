import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ScoreResult } from '../types';
import apiService from '../services/api';
import './Result.css';

interface LocationState {
  score: number;
  points?: number;
  total?: number;
  testId?: number;
  testTitle?: string;
}

const Result: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { score, points, total, testId, testTitle } = (location.state as LocationState) || { score: null };

  // Move useEffect to the top level of the component
  useEffect(() => {
    // Only navigate if there's no score
    if (score === null || score === undefined) {
      navigate('/');
    }
  }, [navigate, score]);

  // Early return if no score
  if (score === null || score === undefined) {
    return <div className="loading">Redirecting...</div>;
  }

  // Get grade based on percentage
  const getGrade = (percentage: number) => {
    if (percentage >= 90) return { grade: 'A+', color: '#4caf50' };
    if (percentage >= 80) return { grade: 'A', color: '#8bc34a' };
    if (percentage >= 70) return { grade: 'B+', color: '#cddc39' };
    if (percentage >= 60) return { grade: 'B', color: '#ffeb3b' };
    if (percentage >= 50) return { grade: 'C', color: '#ffc107' };
    if (percentage >= 40) return { grade: 'D', color: '#ff9800' };
    return { grade: 'F', color: '#f44336' };
  };

  const { grade, color } = getGrade(score);

  return (
    <div className="result-container">
      <div className="result-card">
        <h2>Exam Results</h2>
        {testTitle && <h3>{testTitle}</h3>}

        <div className="score-circle" style={{ borderColor: color }}>
          <div className="percentage" style={{ color }}>
            {score}%
          </div>
          <div className="grade" style={{ color }}>
            {grade}
          </div>
        </div>

        <div className="score-details">
          <div className="detail-row">
            <span>Score:</span>
            <span>{score}%</span>
          </div>
          {points !== undefined && total !== undefined && (
            <div className="detail-row">
              <span>Correct Answers:</span>
              <span>{points} out of {total}</span>
            </div>
          )}
          <div className="detail-row">
            <span>Result:</span>
            <span>{score >= 70 ? 'Pass' : 'Fail'}</span>
          </div>
        </div>

        <div className="result-actions">
          <button
            className="retry-button"
            onClick={() => {
              if (testId) {
                navigate(`/exam/${testId}`);
              } else {
                navigate('/tests');
              }
            }}
          >
            Retry Test
          </button>
          <button
            className="tests-button"
            onClick={() => {
              navigate('/tests');
            }}
          >
            View All Tests
          </button>
          <button
            className="home-button"
            onClick={() => {
              // Log out the user before navigating to home
              apiService.logout();
              navigate('/');
            }}
          >
            Back to Home
          </button>
        </div>
      </div>
    </div>
  );
};

export default Result;