import React from 'react';
import { useNavigate } from 'react-router-dom';
import './LandingPage.css';

const LandingPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="landing-page">
      <div className="landing-content">
        <div className="landing-hero">
          <h1 className="landing-title">
            <span className="title-main">Rompit-OE Platform</span>
            <span className="title-sub">Online Examination System</span>
          </h1>
          <p className="landing-description">
            Take your engineering entrance exams with confidence
          </p>
          <div className="landing-buttons">
            <button 
              className="btn-primary" 
              onClick={() => navigate('/login')}
            >
              Login to Start
            </button>
          </div>
        </div>
        
        <div className="landing-features">
          <div className="feature-card">
            <div className="feature-icon">📝</div>
            <h3>Practice Tests</h3>
            <p>Access comprehensive mock tests</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">📊</div>
            <h3>Detailed Analysis</h3>
            <p>Get insights on your performance</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">⏱️</div>
            <h3>Timed Exams</h3>
            <p>Real exam experience</p>
          </div>
        </div>
      </div>
      
      <div className="landing-footer">
        <p>© 2025 EAMCET Examination Platform. All rights reserved.</p>
      </div>
    </div>
  );
};

export default LandingPage;
