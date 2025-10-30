import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiService from '../services/api';
import { Test } from '../types';
import './AdminDashboard.css';

const AdminPanel: React.FC = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [scoreData, setScoreData] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'tests' | 'scores' | 'analysis'>('tests');
  const [tests, setTests] = useState<Test[]>([]);
  const [selectedTest, setSelectedTest] = useState<Test | null>(null);
  const [sortField, setSortField] = useState<'percentage' | 'submitted_at'>('submitted_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [analysisData, setAnalysisData] = useState<any>(null);

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
  const handleTabChange = (tab: 'tests' | 'scores' | 'analysis') => {
    setActiveTab(tab);
    // If switching to scores tab, fetch the scores
    if (tab === 'scores' && selectedTest) {
      fetchScores(selectedTest.id);
    }
    // If switching to analysis tab, fetch analysis data
    if (tab === 'analysis' && selectedTest) {
      fetchAnalysisData(selectedTest.id);
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

  const fetchAnalysisData = async (testId: number) => {
    setIsLoading(true);
    setError('');

    try {
      const response = await apiService.getTestAnalysis(testId);
      const submissions = response.submissions;
      
      // Calculate analysis metrics using real participation data
      const analysis = calculateAnalysisMetrics(submissions, response.participation);
      setAnalysisData(analysis);
    } catch (error: any) {
      console.error('Failed to fetch analysis data:', error);
      setError(error.response?.data?.error || 'Failed to fetch analysis data.');
    } finally {
      setIsLoading(false);
    }
  };

  const calculateAnalysisMetrics = (submissions: any[], participationData: any) => {
    // Always include participation data
    const result: any = {
      participation: participationData,
      totalSubmissions: submissions.length,
      scoreDistribution: null,
      performance: null,
      timeDistribution: null,
    };

    // Only calculate score metrics if there are submissions
    if (submissions.length === 0) {
      return result;
    }

    const totalSubmissions = submissions.length;
    const percentages = submissions.map(s => s.score.percentage);
    
    // Score Distribution
    const avgScore = percentages.reduce((a, b) => a + b, 0) / totalSubmissions;
    const highestScore = Math.max(...percentages);
    const lowestScore = Math.min(...percentages);
    
    const scoreBuckets = {
      '0-25': percentages.filter(p => p >= 0 && p <= 25).length,
      '26-50': percentages.filter(p => p > 25 && p <= 50).length,
      '51-75': percentages.filter(p => p > 50 && p <= 75).length,
      '76-100': percentages.filter(p => p > 75 && p <= 100).length,
    };

    const passCutoff = 35; // Configurable pass percentage
    const passCount = percentages.filter(p => p >= passCutoff).length;
    const failCount = totalSubmissions - passCount;

    result.scoreDistribution = {
      average: avgScore.toFixed(1),
      highest: highestScore.toFixed(1),
      lowest: lowestScore.toFixed(1),
      buckets: scoreBuckets,
      passCount: passCount,
      failCount: failCount,
      passRate: ((passCount / totalSubmissions) * 100).toFixed(1),
      failRate: ((failCount / totalSubmissions) * 100).toFixed(1),
      passCutoff,
      totalSubmissions,
    };

    // Performance Segmentation (only if enough submissions)
    if (totalSubmissions >= 5) {
      const sortedByPercentage = [...submissions].sort((a, b) => b.score.percentage - a.score.percentage);
      const top10PercentIndex = Math.max(1, Math.ceil(totalSubmissions * 0.1));
      const bottom20PercentIndex = Math.max(0, Math.floor(totalSubmissions * 0.8));
      
      result.performance = {
        topPerformers: sortedByPercentage.slice(0, top10PercentIndex),
        strugglingUsers: bottom20PercentIndex < totalSubmissions ? sortedByPercentage.slice(bottom20PercentIndex) : [],
      };
    }

    // Time Analysis
    const submissionTimes = submissions.map(s => new Date(s.submitted_at));
    const timeOfDayDistribution = {
      morning: submissionTimes.filter(d => d.getHours() >= 6 && d.getHours() < 12).length,
      afternoon: submissionTimes.filter(d => d.getHours() >= 12 && d.getHours() < 18).length,
      evening: submissionTimes.filter(d => d.getHours() >= 18 && d.getHours() < 24).length,
      night: submissionTimes.filter(d => d.getHours() >= 0 && d.getHours() < 6).length,
    };

    result.timeDistribution = timeOfDayDistribution;

    return result;
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

  const handleLogout = () => {
    // Use the API service's logout function
    apiService.logout();
    navigate('/admin');
  };

  // Sorting function
  const handleSort = (field: 'percentage' | 'submitted_at') => {
    if (sortField === field) {
      // Toggle direction if same field
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // New field, default to descending
      setSortField(field);
      setSortDirection('desc');
    }
  };

  // Get sorted scores
  const getSortedScores = () => {
    return [...scoreData].sort((a, b) => {
      let aValue, bValue;
      
      if (sortField === 'percentage') {
        aValue = a.score.percentage;
        bValue = b.score.percentage;
      } else {
        aValue = new Date(a.submitted_at).getTime();
        bValue = new Date(b.submitted_at).getTime();
      }
      
      if (sortDirection === 'asc') {
        return aValue - bValue;
      } else {
        return bValue - aValue;
      }
    });
  };

  return (
    <div className="admin-dashboard">
      {/* Sidebar Navigation */}
      <aside className="admin-sidebar">
        <div className="sidebar-header">
          <div className="logo">
            <span className="logo-icon">🎓</span>
            <h2>Rompit OE</h2>
          </div>
          <p className="sidebar-subtitle">Admin Dashboard</p>
        </div>

        <nav className="sidebar-nav">
          <button
            className={`nav-item ${activeTab === 'tests' ? 'active' : ''}`}
            onClick={() => handleTabChange('tests')}
          >
            <span className="nav-icon">📋</span>
            <span className="nav-label">Manage Tests</span>
          </button>
          <button
            className={`nav-item ${activeTab === 'scores' ? 'active' : ''}`}
            onClick={() => handleTabChange('scores')}
          >
            <span className="nav-icon">📊</span>
            <span className="nav-label">View Scores</span>
          </button>
          <button
            className={`nav-item ${activeTab === 'analysis' ? 'active' : ''}`}
            onClick={() => handleTabChange('analysis')}
          >
            <span className="nav-icon">📈</span>
            <span className="nav-label">Test Analysis</span>
          </button>
        </nav>

        <div className="sidebar-footer">
          <button className="logout-btn" onClick={handleLogout}>
            <span className="logout-icon">🚪</span>
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="admin-main">
        <div className="main-header">
          <div className="header-content">
            <h1>
              {activeTab === 'tests' ? 'Tests Management' : activeTab === 'scores' ? 'Student Scores' : 'Test Analysis'}
            </h1>
            <p className="breadcrumb">
              Dashboard / {activeTab === 'tests' ? 'Tests' : activeTab === 'scores' ? 'Scores' : 'Analysis'}
            </p>
          </div>
        </div>

        <div className="main-content">
        {message && (
          <div className="success-message">
            <span className="message-icon">✓</span>
            {message}
          </div>
        )}
        {error && (
          <div className="error-message">
            <span className="message-icon">⚠</span>
            {error}
          </div>
        )}

          {activeTab === 'tests' && (
          <div className="dashboard-card">
            <div className="card-toolbar">
              <div className="toolbar-left">
                <h2>All Tests</h2>
                <span className="test-count">{tests.length} total</span>
              </div>
              <button
                className="btn-create-test"
                onClick={() => navigate('/admin-panel/test/new')}
              >
                <span className="btn-icon">+</span>
                Create New Test
              </button>
            </div>

            {isLoading ? (
              <div className="loading-container">
                <div className="spinner"></div>
                <p>Loading tests...</p>
              </div>
            ) : tests.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📋</div>
                <h3>No tests found</h3>
                <p>Create your first test to get started</p>
                <button
                  className="btn-create-test"
                  onClick={() => navigate('/admin-panel/test/new')}
                >
                  <span className="btn-icon">+</span>
                  Create New Test
                </button>
              </div>
            ) : (
              <div className="tests-grid">
                {tests.map(test => (
                  <div key={test.id} className="test-card">
                    <div className="test-card-header">
                      <h3>{test.name}</h3>
                      <span className={`status-badge ${test.is_active ? 'active' : 'inactive'}`}>
                        <span className="status-dot"></span>
                        {test.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    
                    <p className="test-description">
                      {test.description || 'No description provided'}
                    </p>
                    
                    <div className="test-stats">
                      <div className="stat-item">
                        <span className="stat-icon">❓</span>
                        <div className="stat-content">
                          <span className="stat-label">Questions</span>
                          <span className="stat-value">{test.questions_count || 0}</span>
                        </div>
                      </div>
                      <div className="stat-item">
                        <span className="stat-icon">⏱️</span>
                        <div className="stat-content">
                          <span className="stat-label">Duration</span>
                          <span className="stat-value">{test.duration_minutes} min</span>
                        </div>
                      </div>
                    </div>

                    <div className="test-card-actions">
                      <button
                        className="btn-edit"
                        onClick={() => navigate(`/admin-panel/test/${test.id}`)}
                      >
                        <span className="btn-icon">✏️</span>
                        Edit
                      </button>
                      <button
                        className="btn-delete"
                        onClick={() => handleDeleteTest(test.id)}
                      >
                        <span className="btn-icon">🗑️</span>
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'scores' && (
          <div className="dashboard-card">
            <div className="card-toolbar">
              <div className="toolbar-left">
                <h2>Student Submissions</h2>
                {selectedTest && (
                  <div className="test-filter">
                    <label>Test:</label>
                    <select
                      value={selectedTest.id}
                      onChange={(e) => {
                        const testId = parseInt(e.target.value);
                        const test = tests.find(t => t.id === testId) || null;
                        setSelectedTest(test);
                        if (test) {
                          fetchScores(test.id);
                        }
                      }}
                    >
                      {tests.map(test => (
                        <option key={test.id} value={test.id}>{test.name}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
              <div className="toolbar-actions">
                <button
                  className="btn-refresh"
                  onClick={() => fetchScores(selectedTest?.id)}
                  disabled={isLoading}
                >
                  <span className="btn-icon">🔄</span>
                  {isLoading ? 'Loading...' : 'Refresh'}
                </button>
                <button
                  className="btn-download"
                  onClick={handleDownloadScores}
                  disabled={isDownloading || isLoading || scoreData.length === 0}
                >
                  <span className="btn-icon">📥</span>
                  {isDownloading ? 'Downloading...' : 'Download Excel'}
                </button>
              </div>
            </div>

            {isLoading ? (
              <div className="loading-container">
                <div className="spinner"></div>
                <p>Loading scores...</p>
              </div>
            ) : scoreData.length > 0 ? (
              <div className="scores-table-container">
                <table className="scores-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>User ID</th>
                      <th>Score</th>
                      <th 
                        className="sortable-header"
                        onClick={() => handleSort('percentage')}
                      >
                        Percentage
                        <span className="sort-icon">
                          {sortField === 'percentage' ? (sortDirection === 'asc' ? ' ▲' : ' ▼') : ' ⇅'}
                        </span>
                      </th>
                      <th 
                        className="sortable-header"
                        onClick={() => handleSort('submitted_at')}
                      >
                        Submitted At
                        <span className="sort-icon">
                          {sortField === 'submitted_at' ? (sortDirection === 'asc' ? ' ▲' : ' ▼') : ' ⇅'}
                        </span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {getSortedScores().map(submission => (
                      <tr key={submission.id}>
                        <td>{submission.id}</td>
                        <td>{submission.user_id}</td>
                        <td>
                          <span className="score-badge">
                            {submission.score.points} / {submission.score.total}
                          </span>
                        </td>
                        <td>
                          <span className={`percentage-badge ${
                            submission.score.percentage >= 75 ? 'excellent' :
                            submission.score.percentage >= 50 ? 'good' :
                            submission.score.percentage >= 35 ? 'average' : 'poor'
                          }`}>
                            {submission.score.percentage}%
                          </span>
                        </td>
                        <td>{new Date(submission.submitted_at).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-state">
                <div className="empty-icon">📊</div>
                <h3>No submissions found</h3>
                <p>Student scores will appear here once they submit the test</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'analysis' && (
          <div className="analysis-container">
            {/* Test Selector */}
            <div className="dashboard-card">
              <div className="card-toolbar">
                <div className="toolbar-left">
                  <h2>📈 Select Test for Analysis</h2>
                </div>
                {selectedTest && (
                  <div className="test-filter">
                    <label>Test:</label>
                    <select
                      value={selectedTest.id}
                      onChange={(e) => {
                        const testId = parseInt(e.target.value);
                        const test = tests.find(t => t.id === testId) || null;
                        setSelectedTest(test);
                        if (test) {
                          fetchAnalysisData(test.id);
                        }
                      }}
                    >
                      {tests.map(test => (
                        <option key={test.id} value={test.id}>{test.name}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>

            {isLoading ? (
              <div className="loading-container">
                <div className="spinner"></div>
                <p>Loading analysis data...</p>
              </div>
            ) : analysisData ? (
              <>
                {/* Participation Metrics */}
                <div className="analysis-section">
                  <h3 className="section-title">👥 Participation Metrics</h3>
                  <div className="metrics-grid">
                    <div className="metric-card highlight">
                      <div className="metric-icon">�</div>
                      <div className="metric-content">
                        <div className="metric-value">{analysisData.participation.total_assigned}</div>
                        <div className="metric-label">Total Users Assigned</div>
                      </div>
                    </div>
                    <div className="metric-card success">
                      <div className="metric-icon">✅</div>
                      <div className="metric-content">
                        <div className="metric-value">{analysisData.participation.total_attempted}</div>
                        <div className="metric-label">Users Attempted</div>
                      </div>
                    </div>
                    <div className="metric-card danger">
                      <div className="metric-icon">⏳</div>
                      <div className="metric-content">
                        <div className="metric-value">{analysisData.participation.total_not_attempted}</div>
                        <div className="metric-label">Users Not Attempted</div>
                      </div>
                    </div>
                    <div className="metric-card">
                      <div className="metric-icon">📊</div>
                      <div className="metric-content">
                        <div className="metric-value">{analysisData.participation.attempted_percentage}%</div>
                        <div className="metric-label">Participation Rate</div>
                      </div>
                    </div>
                  </div>

                  {/* Not Attempted Users List */}
                  {analysisData.participation.not_attempted_users && analysisData.participation.not_attempted_users.length > 0 && (
                    <div className="dashboard-card" style={{ marginTop: '1.5rem' }}>
                      <div className="card-header-simple danger">
                        <h4>⏳ Users Who Haven't Attempted (Showing up to 50)</h4>
                      </div>
                      <div className="performance-list">
                        {analysisData.participation.not_attempted_users.map((user: any, index: number) => (
                          <div key={index} className="performance-item">
                            <span className="user-id">User: {user.user_id}</span>
                            <span className="user-name">{user.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Score Distribution */}
                <div className="analysis-section">
                  <h3 className="section-title">🧮 Score Distribution</h3>
                  {analysisData.scoreDistribution ? (
                  <>
                  <div className="metrics-grid">
                    <div className="metric-card highlight">
                      <div className="metric-icon">📊</div>
                      <div className="metric-content">
                        <div className="metric-value">{analysisData.scoreDistribution.average}%</div>
                        <div className="metric-label">Average Score</div>
                      </div>
                    </div>
                    <div className="metric-card success">
                      <div className="metric-icon">🏆</div>
                      <div className="metric-content">
                        <div className="metric-value">{analysisData.scoreDistribution.highest}%</div>
                        <div className="metric-label">Highest Score</div>
                      </div>
                    </div>
                    <div className="metric-card danger">
                      <div className="metric-icon">📉</div>
                      <div className="metric-content">
                        <div className="metric-value">{analysisData.scoreDistribution.lowest}%</div>
                        <div className="metric-label">Lowest Score</div>
                      </div>
                    </div>
                  </div>

                  {/* Score Buckets */}
                  <div className="dashboard-card" style={{ marginTop: '1.5rem' }}>
                    <div className="card-header-simple">
                      <h4>📊 Score Range Distribution</h4>
                      <p className="card-subtitle">Based on {analysisData.scoreDistribution.totalSubmissions} submission{analysisData.scoreDistribution.totalSubmissions !== 1 ? 's' : ''}</p>
                    </div>
                    <div className="score-buckets">
                      <div className="bucket-item">
                        <div className="bucket-label">
                          <span className="bucket-range">0-25%</span>
                          <span className="bucket-tag poor">Poor</span>
                        </div>
                        <div className="bucket-bar">
                          <div 
                            className="bucket-fill poor" 
                            style={{ width: `${(analysisData.scoreDistribution.buckets['0-25'] / analysisData.scoreDistribution.totalSubmissions) * 100}%` }}
                          ></div>
                        </div>
                        <div className="bucket-count">
                          <strong>{analysisData.scoreDistribution.buckets['0-25']}</strong> 
                          <span className="bucket-percentage">
                            ({((analysisData.scoreDistribution.buckets['0-25'] / analysisData.scoreDistribution.totalSubmissions) * 100).toFixed(0)}%)
                          </span>
                        </div>
                      </div>
                      <div className="bucket-item">
                        <div className="bucket-label">
                          <span className="bucket-range">26-50%</span>
                          <span className="bucket-tag average">Average</span>
                        </div>
                        <div className="bucket-bar">
                          <div 
                            className="bucket-fill average" 
                            style={{ width: `${(analysisData.scoreDistribution.buckets['26-50'] / analysisData.scoreDistribution.totalSubmissions) * 100}%` }}
                          ></div>
                        </div>
                        <div className="bucket-count">
                          <strong>{analysisData.scoreDistribution.buckets['26-50']}</strong>
                          <span className="bucket-percentage">
                            ({((analysisData.scoreDistribution.buckets['26-50'] / analysisData.scoreDistribution.totalSubmissions) * 100).toFixed(0)}%)
                          </span>
                        </div>
                      </div>
                      <div className="bucket-item">
                        <div className="bucket-label">
                          <span className="bucket-range">51-75%</span>
                          <span className="bucket-tag good">Good</span>
                        </div>
                        <div className="bucket-bar">
                          <div 
                            className="bucket-fill good" 
                            style={{ width: `${(analysisData.scoreDistribution.buckets['51-75'] / analysisData.scoreDistribution.totalSubmissions) * 100}%` }}
                          ></div>
                        </div>
                        <div className="bucket-count">
                          <strong>{analysisData.scoreDistribution.buckets['51-75']}</strong>
                          <span className="bucket-percentage">
                            ({((analysisData.scoreDistribution.buckets['51-75'] / analysisData.scoreDistribution.totalSubmissions) * 100).toFixed(0)}%)
                          </span>
                        </div>
                      </div>
                      <div className="bucket-item">
                        <div className="bucket-label">
                          <span className="bucket-range">76-100%</span>
                          <span className="bucket-tag excellent">Excellent</span>
                        </div>
                        <div className="bucket-bar">
                          <div 
                            className="bucket-fill excellent" 
                            style={{ width: `${(analysisData.scoreDistribution.buckets['76-100'] / analysisData.scoreDistribution.totalSubmissions) * 100}%` }}
                          ></div>
                        </div>
                        <div className="bucket-count">
                          <strong>{analysisData.scoreDistribution.buckets['76-100']}</strong>
                          <span className="bucket-percentage">
                            ({((analysisData.scoreDistribution.buckets['76-100'] / analysisData.scoreDistribution.totalSubmissions) * 100).toFixed(0)}%)
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Pass/Fail */}
                  <div className="metrics-grid" style={{ marginTop: '1.5rem' }}>
                    <div className="metric-card success">
                      <div className="metric-icon">✅</div>
                      <div className="metric-content">
                        <div className="metric-value">{analysisData.scoreDistribution.passCount}</div>
                        <div className="metric-label">Students Passed</div>
                        <div className="metric-subtitle">{analysisData.scoreDistribution.passRate}% of submissions</div>
                      </div>
                    </div>
                    <div className="metric-card danger">
                      <div className="metric-icon">❌</div>
                      <div className="metric-content">
                        <div className="metric-value">{analysisData.scoreDistribution.failCount}</div>
                        <div className="metric-label">Students Failed</div>
                        <div className="metric-subtitle">{analysisData.scoreDistribution.failRate}% of submissions</div>
                      </div>
                    </div>
                    <div className="metric-card highlight">
                      <div className="metric-icon">🎯</div>
                      <div className="metric-content">
                        <div className="metric-value">{analysisData.scoreDistribution.passCutoff}%</div>
                        <div className="metric-label">Pass Cutoff</div>
                        <div className="metric-subtitle">Minimum passing score</div>
                      </div>
                    </div>
                  </div>
                  </>
                  ) : (
                    <p className="no-data">No score data available yet</p>
                  )}
                </div>

                {/* Performance Segmentation */}
                {analysisData.performance && (
                <div className="analysis-section">
                  <h3 className="section-title">🏆 Performance Segmentation</h3>
                  <div className="performance-grid">
                    <div className="dashboard-card">
                      <div className="card-header-simple success">
                        <h4>🌟 Top Performers (Top 10%)</h4>
                      </div>
                      <div className="performance-list">
                        {analysisData.performance.topPerformers.length > 0 ? (
                          analysisData.performance.topPerformers.map((user: any) => (
                            <div key={user.id} className="performance-item">
                              <span className="user-id">User: {user.user_id}</span>
                              <span className={`percentage-badge excellent`}>
                                {user.score.percentage}%
                              </span>
                            </div>
                          ))
                        ) : (
                          <p className="no-data">No data available</p>
                        )}
                      </div>
                    </div>

                    <div className="dashboard-card">
                      <div className="card-header-simple danger">
                        <h4>📚 Struggling Users (Bottom 20%)</h4>
                      </div>
                      <div className="performance-list">
                        {analysisData.performance.strugglingUsers.length > 0 ? (
                          analysisData.performance.strugglingUsers.map((user: any) => (
                            <div key={user.id} className="performance-item">
                              <span className="user-id">User: {user.user_id}</span>
                              <span className={`percentage-badge ${
                                user.score.percentage >= 50 ? 'average' : 'poor'
                              }`}>
                                {user.score.percentage}%
                              </span>
                            </div>
                          ))
                        ) : (
                          <p className="no-data">No data available</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                )}

                {/* User Behavior Insights */}
                {analysisData.timeDistribution && (
                <div className="analysis-section">
                  <h3 className="section-title">� Submission Timeline</h3>
                  <div className="dashboard-card">
                    <div className="card-header-simple">
                      <h4>When Students Submit</h4>
                      <p className="card-subtitle">Distribution across different times of day</p>
                    </div>
                    <div className="time-distribution">
                      <div className="time-item">
                        <div className="time-header">
                          <div className="time-icon">🌅</div>
                          <div className="time-info">
                            <div className="time-label">Morning</div>
                            <div className="time-range">6:00 AM - 12:00 PM</div>
                          </div>
                          <div className="time-count">
                            <strong>{analysisData.timeDistribution.morning}</strong>
                            <span className="time-percentage">
                              ({analysisData.totalSubmissions > 0 ? ((analysisData.timeDistribution.morning / analysisData.totalSubmissions) * 100).toFixed(0) : 0}%)
                            </span>
                          </div>
                        </div>
                        <div className="time-bar">
                          <div 
                            className="time-fill morning" 
                            style={{ width: analysisData.totalSubmissions > 0 ? `${(analysisData.timeDistribution.morning / analysisData.totalSubmissions) * 100}%` : '0%' }}
                          ></div>
                        </div>
                      </div>
                      <div className="time-item">
                        <div className="time-header">
                          <div className="time-icon">☀️</div>
                          <div className="time-info">
                            <div className="time-label">Afternoon</div>
                            <div className="time-range">12:00 PM - 6:00 PM</div>
                          </div>
                          <div className="time-count">
                            <strong>{analysisData.timeDistribution.afternoon}</strong>
                            <span className="time-percentage">
                              ({analysisData.totalSubmissions > 0 ? ((analysisData.timeDistribution.afternoon / analysisData.totalSubmissions) * 100).toFixed(0) : 0}%)
                            </span>
                          </div>
                        </div>
                        <div className="time-bar">
                          <div 
                            className="time-fill afternoon" 
                            style={{ width: analysisData.totalSubmissions > 0 ? `${(analysisData.timeDistribution.afternoon / analysisData.totalSubmissions) * 100}%` : '0%' }}
                          ></div>
                        </div>
                      </div>
                      <div className="time-item">
                        <div className="time-header">
                          <div className="time-icon">🌆</div>
                          <div className="time-info">
                            <div className="time-label">Evening</div>
                            <div className="time-range">6:00 PM - 12:00 AM</div>
                          </div>
                          <div className="time-count">
                            <strong>{analysisData.timeDistribution.evening}</strong>
                            <span className="time-percentage">
                              ({analysisData.totalSubmissions > 0 ? ((analysisData.timeDistribution.evening / analysisData.totalSubmissions) * 100).toFixed(0) : 0}%)
                            </span>
                          </div>
                        </div>
                        <div className="time-bar">
                          <div 
                            className="time-fill evening" 
                            style={{ width: analysisData.totalSubmissions > 0 ? `${(analysisData.timeDistribution.evening / analysisData.totalSubmissions) * 100}%` : '0%' }}
                          ></div>
                        </div>
                      </div>
                      <div className="time-item">
                        <div className="time-header">
                          <div className="time-icon">🌙</div>
                          <div className="time-info">
                            <div className="time-label">Night</div>
                            <div className="time-range">12:00 AM - 6:00 AM</div>
                          </div>
                          <div className="time-count">
                            <strong>{analysisData.timeDistribution.night}</strong>
                            <span className="time-percentage">
                              ({analysisData.totalSubmissions > 0 ? ((analysisData.timeDistribution.night / analysisData.totalSubmissions) * 100).toFixed(0) : 0}%)
                            </span>
                          </div>
                        </div>
                        <div className="time-bar">
                          <div 
                            className="time-fill night" 
                            style={{ width: analysisData.totalSubmissions > 0 ? `${(analysisData.timeDistribution.night / analysisData.totalSubmissions) * 100}%` : '0%' }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                )}
              </>
            ) : (
              <div className="empty-state">
                <div className="empty-icon">📈</div>
                <h3>No analysis data available</h3>
                <p>Analysis will appear once students submit the test</p>
              </div>
            )}
          </div>
        )}
        </div>
      </main>
    </div>
  );
};

export default AdminPanel;