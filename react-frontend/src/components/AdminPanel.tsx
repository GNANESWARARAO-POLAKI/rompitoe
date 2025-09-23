import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiService from '../services/api';
import './AdminPanel.css';

const AdminPanel: React.FC = () => {
  const navigate = useNavigate();
  const [userFile, setUserFile] = useState<File | null>(null);
  const [examFile, setExamFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [scoreData, setScoreData] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'upload' | 'scores'>('upload');
  
  // Check admin authentication
  useEffect(() => {
    const isAuthenticated = localStorage.getItem('adminAuthenticated') === 'true';
    if (!isAuthenticated) {
      navigate('/admin');
    }
  }, [navigate]);
  
  // Fetch scores when scores tab is active
  useEffect(() => {
    if (activeTab === 'scores') {
      fetchScores();
    }
  }, [activeTab]);
  
  const fetchScores = async () => {
    setIsLoading(true);
    setError('');
    
    try {
      const response = await apiService.getScores();
      setScoreData(response.submissions);
    } catch (error: any) {
      console.error('Failed to fetch scores:', error);
      setError(error.response?.data?.error || 'Failed to fetch scores.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleUserFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setUserFile(e.target.files[0]);
    }
  };
  
  const handleExamFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setExamFile(e.target.files[0]);
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!userFile || !examFile) {
      setError('Please select both user data and exam data files.');
      return;
    }
    
    setIsLoading(true);
    setError('');
    setMessage('');
    
    try {
      const response = await apiService.uploadFiles(userFile, examFile);
      console.log('Upload response:', response);
      setMessage(`Files uploaded successfully! ${response.users_count} users and ${response.questions_count} questions processed.`);
      
      // Reset file inputs after successful upload
      setUserFile(null);
      setExamFile(null);
      
      // Clear any file input elements
      const userFileInput = document.getElementById('user-file') as HTMLInputElement;
      const examFileInput = document.getElementById('exam-file') as HTMLInputElement;
      if (userFileInput) userFileInput.value = '';
      if (examFileInput) examFileInput.value = '';
    } catch (error: any) {
      console.error('Upload error:', error);
      setError(error.response?.data?.error || 'Failed to upload files. Please check file format and try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleDownloadScores = async () => {
    setIsDownloading(true);
    setError('');
    
    try {
      console.log('Initiating download...');
      await apiService.downloadScores();
      console.log('Download initiated');
      // Downloading is handled by the browser redirecting to the download URL
    } catch (error: any) {
      console.error('Download error:', error);
      setError(error.response?.data?.error || 'Failed to download scores.');
    } finally {
      setIsDownloading(false);
    }
  };
  
  const handleLogout = () => {
    // Use the API service's logout function
    apiService.logout();
    navigate('/admin');
  };
  
  return (
    <div className="admin-container">
      <div className="admin-header">
        <h1>Rompit OE Admin Panel</h1>
        <div className="admin-actions">
          <button 
            className="logout-button"
            onClick={handleLogout}
          >
            Logout
          </button>
        </div>
      </div>
      
      <div className="admin-tabs">
        <button 
          className={`tab-button ${activeTab === 'upload' ? 'active' : ''}`}
          onClick={() => setActiveTab('upload')}
        >
          Upload Data
        </button>
        <button 
          className={`tab-button ${activeTab === 'scores' ? 'active' : ''}`}
          onClick={() => setActiveTab('scores')}
        >
          View Scores
        </button>
      </div>
      
      <div className="admin-content">
        {activeTab === 'upload' && (
          <div className="admin-card">
            <h2>Upload Exam Data</h2>
            
            {message && <div className="success-message">{message}</div>}
            {error && <div className="error-message">{error}</div>}
            
            <form onSubmit={handleSubmit}>
              <div className="file-upload-section">
                <h3>User Data</h3>
                <p>Upload Excel file with User ID and Date of Birth columns</p>
                
                <div className="file-input-container">
                  <input
                    type="file"
                    id="user-file"
                    accept=".xlsx,.xls"
                    onChange={handleUserFileChange}
                    disabled={isLoading}
                  />
                  <label 
                    htmlFor="user-file" 
                    className={userFile ? 'has-file' : ''}
                  >
                    {userFile ? userFile.name : 'Select User Data File (.xlsx)'}
                  </label>
                </div>
              </div>
              
              <div className="file-upload-section">
                <h3>Exam Data</h3>
                <p>Upload Excel file with question sheets (each sheet = one section)</p>
                
                <div className="file-input-container">
                  <input
                    type="file"
                    id="exam-file"
                    accept=".xlsx,.xls"
                    onChange={handleExamFileChange}
                    disabled={isLoading}
                  />
                  <label 
                    htmlFor="exam-file"
                    className={examFile ? 'has-file' : ''}
                  >
                    {examFile ? examFile.name : 'Select Exam Data File (.xlsx)'}
                  </label>
                </div>
              </div>
              
              <div className="format-guidelines">
                <h3>File Format Guidelines</h3>
                <div className="guideline-section">
                  <h4>User Data Excel Format:</h4>
                  <table>
                    <thead>
                      <tr>
                        <th>user_id</th>
                        <th>dob</th>
                        <th>name (optional)</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>test123</td>
                        <td>2000-01-01</td>
                        <td>Test User</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                
                <div className="guideline-section">
                  <h4>Exam Data Excel Format (per sheet):</h4>
                  <table>
                    <thead>
                      <tr>
                        <th>question</th>
                        <th>option_a</th>
                        <th>option_b</th>
                        <th>option_c</th>
                        <th>option_d</th>
                        <th>correct_answer</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>What is...?</td>
                        <td>Option A</td>
                        <td>Option B</td>
                        <td>Option C</td>
                        <td>Option D</td>
                        <td>A</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
              
              <button 
                type="submit" 
                className="upload-button"
                disabled={isLoading}
              >
                {isLoading ? 'Uploading...' : 'Upload Files'}
              </button>
            </form>
          </div>
        )}
        
        {activeTab === 'scores' && (
          <div className="admin-card">
            <h2>Student Scores</h2>
            
            {error && <div className="error-message">{error}</div>}
            
            <div className="scores-actions">
              <button
                className="download-button"
                onClick={handleDownloadScores}
                disabled={isDownloading || isLoading || scoreData.length === 0}
              >
                {isDownloading ? 'Downloading...' : 'Download Scores (Excel)'}
              </button>
              <button
                className="refresh-button"
                onClick={fetchScores}
                disabled={isLoading}
              >
                {isLoading ? 'Loading...' : 'Refresh Scores'}
              </button>
            </div>
            
            {isLoading ? (
              <div className="loading-message">Loading scores...</div>
            ) : scoreData.length > 0 ? (
              <div className="scores-table-container">
                <table className="scores-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>User ID</th>
                      <th>Score</th>
                      <th>Percentage</th>
                      <th>Submitted At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scoreData.map(submission => (
                      <tr key={submission.id}>
                        <td>{submission.id}</td>
                        <td>{submission.user_id}</td>
                        <td>{submission.score.points} / {submission.score.total}</td>
                        <td>{submission.score.percentage}%</td>
                        <td>{new Date(submission.submitted_at).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="no-data-message">No submissions found.</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPanel;