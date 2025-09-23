import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LoginCredentials } from '../types';
import apiService from '../services/api';
import { useExam } from '../context/ExamContext';
import './Login.css';

const Login: React.FC = () => {
  const [credentials, setCredentials] = useState<LoginCredentials>({
    user_id: '',
    dob: ''
  });
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  
  const navigate = useNavigate();
  const { setUser, setExamData, user } = useExam();
  
  // Check if user is already authenticated
  useEffect(() => {
    const checkAuth = async () => {
      if (apiService.isAuthenticated() && !apiService.isAdmin()) {
        try {
          // If there's a user in context, redirect to exam
          if (user) {
            navigate('/exam');
            return;
          }
          
          // If there's a user in localStorage but not in context
          const storedUser = apiService.getCurrentUser();
          if (storedUser) {
            setUser(storedUser);
            
            // Load exam data if needed
            try {
              const examData = await apiService.getQuestions();
              setExamData(examData);
              navigate('/exam');
            } catch (err) {
              console.error('Failed to load exam data:', err);
              // If loading exam data fails, clear token and stay on login page
              apiService.logout();
            }
          }
        } catch (err) {
          console.error('Authentication check failed:', err);
        }
      }
    };
    
    checkAuth();
  }, [navigate, setUser, setExamData, user]);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCredentials(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      // Validate form
      if (!credentials.user_id || !credentials.dob) {
        setError('Please fill in all fields');
        return;
      }
      
      // Format the date properly if needed
      const formattedCredentials = {
        ...credentials,
        // The date input already returns YYYY-MM-DD format which is what we need
      };
      
      // Login user
      const response = await apiService.login(formattedCredentials);
      setUser(response.user);
      
      // Fetch exam data
      const examData = await apiService.getQuestions();
      setExamData(examData);
      
      // Navigate to exam page
      navigate('/exam');
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.response?.data?.error || 'Failed to login. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="login-container">
      <div className="login-card">
        <h2>Rompit Online Exam Platform</h2>
        <h3>Login</h3>
        
        {error && <div className="error-message">{error}</div>}
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="user_id">User ID</label>
            <input
              type="text"
              id="user_id"
              name="user_id"
              value={credentials.user_id}
              onChange={handleChange}
              placeholder="Enter your user ID"
              disabled={loading}
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="dob">Date of Birth</label>
            <input
              type="date"
              id="dob"
              name="dob"
              value={credentials.dob}
              onChange={handleChange}
              placeholder="YYYY-MM-DD"
              disabled={loading}
            />
            <small className="form-help">Format: YYYY-MM-DD</small>
          </div>
          
          <button type="submit" disabled={loading}>
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
        
        <div className="login-info">
          <p>For testing, use:</p>
          <p>User ID: test123</p>
          <p>DOB: 2000-01-01 (January 1, 2000)</p>
        </div>
        
        <div className="admin-link">
          <p>
            Are you an administrator?{' '}
            <a href="#" onClick={() => navigate('/admin')}>
              Go to Admin Panel
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;