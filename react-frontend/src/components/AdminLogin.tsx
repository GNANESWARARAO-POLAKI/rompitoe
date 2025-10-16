import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiService from '../services/api';
import './AdminLogin.css';

const AdminLogin: React.FC = () => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  
  useEffect(() => {
    // Force re-validation of token and admin status
    const checkAuth = () => {
      console.log('AdminLogin: Checking authentication');
      if (apiService.isAuthenticated() && apiService.isAdmin()) {
        console.log('AdminLogin: Already authenticated as admin, redirecting');
        navigate('/admin-panel');
      } else {
        // Clear any potentially stale auth data
        if (localStorage.getItem('adminAuthenticated') === 'true' && !apiService.isAuthenticated()) {
          console.log('AdminLogin: Found stale admin auth, clearing');
          apiService.logout();
        }
      }
    };
    
    checkAuth();
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      // Call the API for admin login
      await apiService.adminLogin(password);
      navigate('/admin-panel');
    } catch (err: any) {
      console.error('Admin login error:', err);
      setError(err.response?.data?.error || 'Invalid password');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="admin-login-container">
      <div className="admin-login-card">
        <h1>Admin Login</h1>
        <p>Enter the admin password to continue</p>
        
        {error && <div className="error-message">{error}</div>}
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="password">Admin Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Enter password"
              disabled={isLoading}
            />
          </div>
          
          <div className="form-actions">
            <button 
              type="button" 
              className="cancel-button"
              onClick={() => navigate('/')}
              disabled={isLoading}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="login-button"
              disabled={isLoading}
            >
              {isLoading ? 'Logging in...' : 'Login'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdminLogin;