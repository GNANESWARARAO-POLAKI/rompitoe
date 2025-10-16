import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiService from '../services/api';
import { Test } from '../types';
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
  const [activeTab, setActiveTab] = useState<'tests' | 'upload' | 'scores'>('tests');
  const [tests, setTests] = useState<Test[]>([]);
  const [selectedTest, setSelectedTest] = useState<Test | null>(null);
  const [newTest, setNewTest] = useState<{
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
  const [isEditingTest, setIsEditingTest] = useState<boolean>(false);

  // Check admin authentication
  useEffect(() => {
    const isAuthenticated = localStorage.getItem('adminAuthenticated') === 'true';
    if (!isAuthenticated) {
      navigate('/admin');
    } else {
      // Fetch tests when component mounts
      fetchTests();
    }
  }, [navigate]);

  // Fetch scores when scores tab is active
  useEffect(() => {
    if (activeTab === 'scores' && selectedTest) {
      fetchScores(selectedTest.id);
    }
  }, [activeTab, selectedTest?.id]); // Add selectedTest.id as a dependency

  const fetchTests = async () => {
    setIsLoading(true);
    setError('');

    try {
      const tests = await apiService.getAllTests();
      setTests(tests);
      if (tests.length > 0 && !selectedTest) {
        setSelectedTest(tests[0]);
      }
    } catch (error: any) {
      console.error('Failed to fetch tests:', error);
      setError(error.response?.data?.error || 'Failed to fetch tests.');
    } finally {
      setIsLoading(false);
    }
  };

  // Add this function to handle tab changes
  const handleTabChange = (tab: 'tests' | 'upload' | 'scores') => {
    setActiveTab(tab);
    // If switching to scores tab, fetch the scores
    if (tab === 'scores' && selectedTest) {
      fetchScores(selectedTest.id);
    }
    // Clear any messages when switching tabs
    setMessage('');
    setError('');
  };

  const fetchScores = async (testId?: number) => {
    setIsLoading(true);
    setError('');

    try {
      const response = await apiService.getScores(testId);
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

    if (!selectedTest) {
      setError('Please select a test before uploading files.');
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
      const response = await apiService.uploadFiles(userFile, examFile, selectedTest.id);
      console.log('Upload response:', response);

      let successMessage = 'Files uploaded successfully!';
      if (response.users_count) {
        successMessage += ` ${response.users_count} users processed.`;
      }
      if (response.questions_count) {
        successMessage += ` ${response.questions_count} questions processed.`;
      }

      setMessage(successMessage);

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

  const handleCreateTest = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      if (!newTest.name.trim()) {
        throw new Error('Test name is required');
      }

      await apiService.createTest(newTest);
      setMessage('Test created successfully!');
      setNewTest({
        name: '',
        description: '',
        duration_minutes: 60,
        is_active: true
      });
      fetchTests();  // Refresh the test list
    } catch (error: any) {
      console.error('Create test error:', error);
      setError(error.message || error.response?.data?.error || 'Failed to create test.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTest) return;

    setIsLoading(true);
    setError('');

    try {
      if (!newTest.name.trim()) {
        throw new Error('Test name is required');
      }

      await apiService.updateTest(selectedTest.id, newTest);
      setMessage('Test updated successfully!');
      setIsEditingTest(false);
      fetchTests();  // Refresh the test list
    } catch (error: any) {
      console.error('Update test error:', error);
      setError(error.message || error.response?.data?.error || 'Failed to update test.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteTest = async (testId: number) => {
    if (!window.confirm('Are you sure you want to delete this test? This action cannot be undone.')) {
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await apiService.deleteTest(testId);
      setMessage('Test deleted successfully!');
      if (selectedTest?.id === testId) {
        setSelectedTest(null);
      }
      fetchTests();  // Refresh the test list
    } catch (error: any) {
      console.error('Delete test error:', error);
      setError(error.response?.data?.error || 'Failed to delete test.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditTest = (test: Test) => {
    setSelectedTest(test);
    setNewTest({
      name: test.name,
      description: test.description,
      duration_minutes: test.duration_minutes,
      is_active: test.is_active
    });
    setIsEditingTest(true);
    handleTabChange('tests');
  };

  const cancelEditTest = () => {
    setIsEditingTest(false);
    setNewTest({
      name: '',
      description: '',
      duration_minutes: 60,
      is_active: true
    });
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
          className={`tab-button ${activeTab === 'tests' ? 'active' : ''}`}
          onClick={() => handleTabChange('tests')}
        >
          Manage Tests
        </button>
        <button
          className={`tab-button ${activeTab === 'upload' ? 'active' : ''}`}
          onClick={() => handleTabChange('upload')}
        >
          Upload Data
        </button>
        <button
          className={`tab-button ${activeTab === 'scores' ? 'active' : ''}`}
          onClick={() => handleTabChange('scores')}
        >
          View Scores
        </button>
      </div>

      <div className="admin-content">
        {activeTab === 'tests' && (
          <div className="admin-card">
            <h2>Manage Tests</h2>

            {message && <div className="success-message">{message}</div>}
            {error && <div className="error-message">{error}</div>}

            <div className="tests-container">
              <div className="tests-list">
                <h3>Available Tests</h3>
                {isLoading ? (
                  <div className="loading">Loading tests...</div>
                ) : tests.length === 0 ? (
                  <div className="no-data">No tests found. Create a new test to get started.</div>
                ) : (
                  <ul className="test-list">
                    {tests.map(test => (
                      <li
                        key={test.id}
                        className={`test-item ${selectedTest?.id === test.id ? 'selected' : ''}`}
                        onClick={() => setSelectedTest(test)}
                      >
                        <div className="test-item-title">
                          <span>{test.name}</span>
                          <span className={`status-badge ${test.is_active ? 'active' : 'inactive'}`}>
                            {test.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                        <div className="test-item-meta">
                          <span>Questions: {test.questions_count || 0}</span>
                          <span>Duration: {test.duration_minutes} min</span>
                        </div>
                        <div className="test-item-actions">
                          <button
                            type="button"
                            className="edit-button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditTest(test);
                            }}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="delete-button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteTest(test.id);
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="test-form">
                <h3>{isEditingTest ? `Edit Test: ${selectedTest?.name}` : 'Create New Test'}</h3>
                <form onSubmit={isEditingTest ? handleUpdateTest : handleCreateTest}>
                  <div className="form-group">
                    <label htmlFor="test-title">Test Name</label>
                    <input
                      id="test-title"
                      type="text"
                      value={newTest.name}
                      onChange={(e) => setNewTest({ ...newTest, name: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="test-description">Description</label>
                    <textarea
                      id="test-description"
                      value={newTest.description}
                      onChange={(e) => setNewTest({ ...newTest, description: e.target.value })}
                      rows={3}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="test-duration">Duration (minutes)</label>
                    <input
                      id="test-duration"
                      type="number"
                      min="1"
                      value={newTest.duration_minutes}
                      onChange={(e) => setNewTest({ ...newTest, duration_minutes: parseInt(e.target.value) || 60 })}
                      required
                    />
                  </div>

                  <div className="form-group checkbox-group">
                    <label>
                      <input
                        type="checkbox"
                        checked={newTest.is_active}
                        onChange={(e) => setNewTest({ ...newTest, is_active: e.target.checked })}
                      />
                      Active
                    </label>
                  </div>

                  {isEditingTest && (
                    <div className="upload-options">
                      <h4>Upload Data for This Test</h4>
                      <button
                        type="button"
                        className="upload-button"
                        onClick={() => handleTabChange('upload')}
                      >
                        Upload User & Exam Data
                      </button>
                    </div>
                  )}

                  <div className="form-actions">
                    {isEditingTest && (
                      <button
                        type="button"
                        className="cancel-button"
                        onClick={cancelEditTest}
                      >
                        Cancel
                      </button>
                    )}
                    <button
                      type="submit"
                      className="submit-button"
                      disabled={isLoading}
                    >
                      {isLoading ? 'Saving...' : isEditingTest ? 'Update Test' : 'Create Test'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'upload' && (
          <div className="admin-card">
            <h2>Upload Exam Data {selectedTest ? `for "${selectedTest.name}"` : ''}</h2>

            {message && <div className="success-message">{message}</div>}
            {error && <div className="error-message">{error}</div>}

            <form onSubmit={handleSubmit}>
              {!selectedTest ? (
                <div className="test-selector">
                  <h3>Select Test</h3>
                  {tests.length === 0 ? (
                    <p>No tests available. Please create a test first.</p>
                  ) : (
                    <select
                      value=""
                      onChange={(e) => {
                        const testId = parseInt(e.target.value);
                        const test = tests.find(t => t.id === testId) || null;
                        setSelectedTest(test);
                      }}
                    >
                      <option value="" disabled>Select a test</option>
                      {tests.map(test => (
                        <option key={test.id} value={test.id}>{test.name}</option>
                      ))}
                    </select>
                  )}
                </div>
              ) : (
                <div className="selected-test-info">
                  <p>You are uploading data for <strong>{selectedTest.name}</strong></p>
                  <button
                    type="button"
                    className="change-test-button"
                    onClick={() => setSelectedTest(null)}
                  >
                    Change Test
                  </button>
                </div>
              )}

              <div className="file-upload-section">
                <h3>User Data (Optional)</h3>
                <p>Upload Excel file with user information</p>

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
                <h3>Exam Data (Optional)</h3>
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
                disabled={isLoading || !selectedTest || (!userFile && !examFile)}
              >
                {isLoading ? 'Uploading...' : 'Upload Files'}
              </button>
            </form>
          </div>
        )}

        {activeTab === 'scores' && (
          <div className="admin-card">
            <h2>Student Scores {selectedTest ? `for "${selectedTest.name}"` : ''}</h2>

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
                onClick={() => fetchScores(selectedTest?.id)}
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