import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import apiService from '../services/api';
import { Test } from '../types';
import './TestEditor.css';

const TestEditor: React.FC = () => {
  const navigate = useNavigate();
  const { testId } = useParams<{ testId?: string }>();
  const isEditMode = !!testId;

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [userFile, setUserFile] = useState<File | null>(null);
  const [examFile, setExamFile] = useState<File | null>(null);
  
  const [testData, setTestData] = useState<{
    name: string;
    description: string;
    duration_minutes: number;
    is_active: boolean;
  }>({
    name: '',
    description: '',
    duration_minutes: 60,
    is_active: true
  });

  // Check admin authentication
  useEffect(() => {
    const isAuthenticated = localStorage.getItem('adminAuthenticated') === 'true';
    if (!isAuthenticated) {
      navigate('/admin');
      return;
    }

    // If editing, fetch test data
    if (isEditMode) {
      fetchTestData();
    }
  }, [navigate, testId]);

  const fetchTestData = async () => {
    if (!testId) return;
    
    setIsLoading(true);
    try {
      const tests = await apiService.getAllTests();
      const test = tests.find((t: Test) => t.id === parseInt(testId));
      if (test) {
        setTestData({
          name: test.name,
          description: test.description,
          duration_minutes: test.duration_minutes,
          is_active: test.is_active
        });
      } else {
        setError('Test not found');
      }
    } catch (error: any) {
      console.error('Failed to fetch test:', error);
      setError(error.response?.data?.error || 'Failed to fetch test.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!testData.name.trim()) {
      setError('Test name is required');
      return;
    }

    setIsLoading(true);
    setError('');
    setMessage('');

    try {
      if (isEditMode) {
        await apiService.updateTest(parseInt(testId!), testData);
        setMessage('Test updated successfully!');
      } else {
        await apiService.createTest(testData);
        setMessage('Test created successfully!');
        // Reset form after creation
        setTestData({
          name: '',
          description: '',
          duration_minutes: 60,
          is_active: true
        });
      }
      
      // Navigate back after a short delay
      setTimeout(() => {
        navigate('/admin-panel');
      }, 1500);
    } catch (error: any) {
      console.error('Save test error:', error);
      setError(error.message || error.response?.data?.error || 'Failed to save test.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!testId) {
      setError('Please save the test first before uploading files.');
      return;
    }

    if (!userFile && !examFile) {
      setError('Please select at least one file to upload.');
      return;
    }

    setIsLoading(true);
    setError('');
    setMessage('');

    try {
      const response = await apiService.uploadFiles(userFile, examFile, parseInt(testId));
      
      let successMessage = 'Files uploaded successfully!';
      if (response.users_count) {
        successMessage += ` ${response.users_count} users processed.`;
      }
      if (response.questions_count) {
        successMessage += ` ${response.questions_count} questions processed.`;
      }

      setMessage(successMessage);
      setUserFile(null);
      setExamFile(null);

      // Clear file inputs
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

  return (
    <div className="test-editor-container">
      <div className="test-editor-header">
        <button className="back-button" onClick={() => navigate('/admin-panel')}>
          <span className="back-icon">←</span> Back to Admin Panel
        </button>
        <h1>{isEditMode ? 'Edit Test' : 'Create New Test'}</h1>
      </div>

      <div className="test-editor-content">
        {message && <div className="success-message">{message}</div>}
        {error && <div className="error-message">{error}</div>}

        {/* Test Details Form */}
        <div className="editor-card">
          <div className="card-header">
            <h2>Test Details</h2>
            <span className="card-subtitle">Configure your test settings</span>
          </div>
          
          <form onSubmit={handleSubmit} className="test-form">
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="test-name">
                  Test Name <span className="required">*</span>
                </label>
                <input
                  id="test-name"
                  type="text"
                  value={testData.name}
                  onChange={(e) => setTestData({ ...testData, name: e.target.value })}
                  placeholder="e.g., EAMCET 2025 Practice Test"
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group full-width">
                <label htmlFor="test-description">Description</label>
                <textarea
                  id="test-description"
                  value={testData.description}
                  onChange={(e) => setTestData({ ...testData, description: e.target.value })}
                  placeholder="Provide a brief description of the test..."
                  rows={4}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="test-duration">
                  Duration (minutes) <span className="required">*</span>
                </label>
                <input
                  id="test-duration"
                  type="number"
                  min="1"
                  value={testData.duration_minutes}
                  onChange={(e) => setTestData({ ...testData, duration_minutes: parseInt(e.target.value) || 60 })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="toggle-label">
                  <span>Active Status</span>
                  <div className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={testData.is_active}
                      onChange={(e) => setTestData({ ...testData, is_active: e.target.checked })}
                    />
                    <span className="toggle-slider"></span>
                  </div>
                </label>
                <small className="help-text">
                  {testData.is_active ? 'Test is visible to students' : 'Test is hidden from students'}
                </small>
              </div>
            </div>

            <div className="form-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => navigate('/admin-panel')}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={isLoading}
              >
                {isLoading ? 'Saving...' : isEditMode ? 'Update Test' : 'Create Test'}
              </button>
            </div>
          </form>
        </div>

        {/* File Upload Section - Only show in edit mode */}
        {isEditMode && (
          <div className="editor-card">
            <div className="card-header">
              <h2>Upload Data</h2>
              <span className="card-subtitle">Upload user and exam data for this test</span>
            </div>

            <form onSubmit={handleFileUpload} className="upload-form">
              <div className="upload-section">
                <div className="upload-area">
                  <div className="upload-icon">📄</div>
                  <h3>User Data</h3>
                  <p>Upload Excel file with user information</p>
                  
                  <input
                    type="file"
                    id="user-file"
                    accept=".xlsx,.xls"
                    onChange={handleUserFileChange}
                    disabled={isLoading}
                    className="file-input"
                  />
                  <label htmlFor="user-file" className={`file-label ${userFile ? 'has-file' : ''}`}>
                    {userFile ? (
                      <>
                        <span className="file-icon">✓</span>
                        <span className="file-name">{userFile.name}</span>
                      </>
                    ) : (
                      <>
                        <span className="file-icon">+</span>
                        <span>Choose User Data File (.xlsx)</span>
                      </>
                    )}
                  </label>
                </div>

                <div className="upload-area">
                  <div className="upload-icon">📝</div>
                  <h3>Exam Data</h3>
                  <p>Upload Excel file with questions and answers</p>
                  
                  <input
                    type="file"
                    id="exam-file"
                    accept=".xlsx,.xls"
                    onChange={handleExamFileChange}
                    disabled={isLoading}
                    className="file-input"
                  />
                  <label htmlFor="exam-file" className={`file-label ${examFile ? 'has-file' : ''}`}>
                    {examFile ? (
                      <>
                        <span className="file-icon">✓</span>
                        <span className="file-name">{examFile.name}</span>
                      </>
                    ) : (
                      <>
                        <span className="file-icon">+</span>
                        <span>Choose Exam Data File (.xlsx)</span>
                      </>
                    )}
                  </label>
                </div>
              </div>

              <div className="format-info">
                <h4>📋 File Format Guidelines</h4>
                <div className="format-columns">
                  <div className="format-column">
                    <h5>User Data Format:</h5>
                    <table className="format-table">
                      <thead>
                        <tr>
                          <th>user_id</th>
                          <th>dob</th>
                          <th>name</th>
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

                  <div className="format-column">
                    <h5>Exam Data Format:</h5>
                    <table className="format-table">
                      <thead>
                        <tr>
                          <th>question</th>
                          <th>option_a</th>
                          <th>option_b</th>
                          <th>correct_answer</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td>What is...?</td>
                          <td>Option A</td>
                          <td>Option B</td>
                          <td>A</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                className="btn btn-primary btn-upload"
                disabled={isLoading || (!userFile && !examFile)}
              >
                {isLoading ? 'Uploading...' : 'Upload Files'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default TestEditor;
