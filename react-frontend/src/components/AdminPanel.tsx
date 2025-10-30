import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiService from '../services/api';
import { Test } from '../types';
import './AdminDashboard.css';
import './AnalysisCharts.css';

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
  const [notAttemptedPage, setNotAttemptedPage] = useState<number>(1);
  const [notAttemptedPageSize] = useState<number>(10);

  // Check admin authentication
  useEffect(() => {
    const isAuthenticated = localStorage.getItem('adminAuthenticated') === 'true';
    if (!isAuthenticated) {
      navigate('/admin');
    } else {
      fetchTests();
    }
  }, [navigate]);

  // Fetch scores when scores tab is active
  useEffect(() => {
    if (activeTab === 'scores' && selectedTest) {
      fetchScores(selectedTest.id);
    }
  }, [activeTab, selectedTest?.id]);

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

  const handleTabChange = (tab: 'tests' | 'scores' | 'analysis') => {
    setActiveTab(tab);
    if (tab === 'scores' && selectedTest) {
      fetchScores(selectedTest.id);
    }
    if (tab === 'analysis' && selectedTest) {
      fetchAnalysisData(selectedTest.id);
    }
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
    setNotAttemptedPage(1); // Reset pagination when fetching new data

    try {
      const response = await apiService.getTestAnalysis(testId);
      const submissions = response.submissions;
      
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
    const result: any = {
      participation: participationData,
      totalSubmissions: submissions.length,
      scoreDistribution: null,
      performance: null,
      timeDistribution: null,
    };

    if (submissions.length === 0) {
      return result;
    }

    const totalSubmissions = submissions.length;
    const percentages = submissions.map(s => s.score.percentage);
    
    const avgScore = percentages.reduce((a, b) => a + b, 0) / totalSubmissions;
    const highestScore = Math.max(...percentages);
    const lowestScore = Math.min(...percentages);
    
    const scoreBuckets = {
      '0-25': percentages.filter(p => p >= 0 && p <= 25).length,
      '26-50': percentages.filter(p => p > 25 && p <= 50).length,
      '51-75': percentages.filter(p => p > 50 && p <= 75).length,
      '76-100': percentages.filter(p => p > 75 && p <= 100).length,
    };

    const passCutoff = 35;
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

    if (totalSubmissions >= 5) {
      const sortedByPercentage = [...submissions].sort((a, b) => b.score.percentage - a.score.percentage);
      const top10PercentIndex = Math.max(1, Math.ceil(totalSubmissions * 0.1));
      const bottom20PercentIndex = Math.max(0, Math.floor(totalSubmissions * 0.8));
      
      result.performance = {
        topPerformers: sortedByPercentage.slice(0, top10PercentIndex),
        strugglingUsers: bottom20PercentIndex < totalSubmissions ? sortedByPercentage.slice(bottom20PercentIndex) : [],
      };
    }

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
      await apiService.downloadScores();
    } catch (error: any) {
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
      fetchTests();
    } catch (error: any) {
      setError(error.response?.data?.error || 'Failed to delete test.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    apiService.logout();
    navigate('/admin');
  };

  const handleSort = (field: 'percentage' | 'submitted_at') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

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

  const getPaginatedNotAttemptedUsers = () => {
    if (!analysisData?.participation?.not_attempted_users) {
      return [];
    }
    const users = analysisData.participation.not_attempted_users;
    const startIndex = (notAttemptedPage - 1) * notAttemptedPageSize;
    const endIndex = startIndex + notAttemptedPageSize;
    return users.slice(startIndex, endIndex);
  };

  const getTotalNotAttemptedPages = () => {
    if (!analysisData?.participation?.not_attempted_users) {
      return 0;
    }
    return Math.ceil(analysisData.participation.not_attempted_users.length / notAttemptedPageSize);
  };

  const handleNextNotAttemptedPage = () => {
    const totalPages = getTotalNotAttemptedPages();
    if (notAttemptedPage < totalPages) {
      setNotAttemptedPage(notAttemptedPage + 1);
    }
  };

  const handlePrevNotAttemptedPage = () => {
    if (notAttemptedPage > 1) {
      setNotAttemptedPage(notAttemptedPage - 1);
    }
  };

  return (
    <div className="admin-dashboard">
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
                  {/* KEY METRICS - Most Important */}
                  <div className="analysis-section">
                    <h3 className="section-title">📊 Key Performance Indicators</h3>
                    <div className="kpi-grid">
                      <div className="kpi-card primary">
                        <div className="kpi-icon">🎯</div>
                        <div className="kpi-content">
                          <div className="kpi-value">{analysisData.participation.attempted_percentage}%</div>
                          <div className="kpi-label">Participation Rate</div>
                          <div className="kpi-subtitle">{analysisData.participation.total_attempted} of {analysisData.participation.total_assigned} attempted</div>
                        </div>
                      </div>
                      {analysisData.scoreDistribution && (
                        <>
                          <div className="kpi-card success">
                            <div className="kpi-icon">✅</div>
                            <div className="kpi-content">
                              <div className="kpi-value">{analysisData.scoreDistribution.passRate}%</div>
                              <div className="kpi-label">Pass Rate</div>
                              <div className="kpi-subtitle">{analysisData.scoreDistribution.passCount} students passed</div>
                            </div>
                          </div>
                          <div className="kpi-card info">
                            <div className="kpi-icon">📈</div>
                            <div className="kpi-content">
                              <div className="kpi-value">{analysisData.scoreDistribution.average}%</div>
                              <div className="kpi-label">Average Score</div>
                              <div className="kpi-subtitle">Class performance</div>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* PARTICIPATION PIE CHART */}
                  <div className="analysis-section">
                    <h3 className="section-title">👥 Participation Breakdown</h3>
                    <div className="chart-grid">
                      <div className="dashboard-card">
                        <div className="card-header-simple">
                          <h4>Student Participation</h4>
                          <p className="card-subtitle">Visual breakdown of test attempts</p>
                        </div>
                        <div className="pie-chart-container">
                          <div 
                            className="pie-chart"
                            style={{
                              '--percentage': analysisData.participation.attempted_percentage
                            } as React.CSSProperties}
                          ></div>
                          <div className="pie-legend">
                            <div className="legend-item">
                              <span className="legend-color attempted"></span>
                              <span className="legend-label">Attempted</span>
                              <span className="legend-value">{analysisData.participation.total_attempted} ({analysisData.participation.attempted_percentage}%)</span>
                            </div>
                            <div className="legend-item">
                              <span className="legend-color not-attempted"></span>
                              <span className="legend-label">Not Attempted</span>
                              <span className="legend-value">{analysisData.participation.total_not_attempted} ({(100 - analysisData.participation.attempted_percentage).toFixed(1)}%)</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="dashboard-card">
                        <div className="card-header-simple">
                          <h4>Participation Details</h4>
                          <p className="card-subtitle">Complete participation statistics</p>
                        </div>
                        <div className="stats-list">
                          <div className="stat-row">
                            <span className="stat-icon">👥</span>
                            <span className="stat-label">Total Assigned</span>
                            <span className="stat-value">{analysisData.participation.total_assigned}</span>
                          </div>
                          <div className="stat-row success">
                            <span className="stat-icon">✅</span>
                            <span className="stat-label">Attempted</span>
                            <span className="stat-value">{analysisData.participation.total_attempted}</span>
                          </div>
                          <div className="stat-row danger">
                            <span className="stat-icon">⏳</span>
                            <span className="stat-label">Not Attempted</span>
                            <span className="stat-value">{analysisData.participation.total_not_attempted}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {analysisData.participation.not_attempted_users && analysisData.participation.not_attempted_users.length > 0 && (
                      <div className="dashboard-card" style={{ marginTop: '1.5rem' }}>
                        <div className="card-header-simple danger">
                          <h4>⏳ Students Who Haven't Attempted</h4>
                          <p className="card-subtitle">Total: {analysisData.participation.not_attempted_users.length} students</p>
                        </div>
                        <div className="user-grid">
                          {getPaginatedNotAttemptedUsers().map((user: any, index: number) => (
                            <div key={index} className="user-card">
                              <span className="user-id-badge">ID: {user.user_id}</span>
                              <span className="user-name-text">Name: {user.name}</span>
                            </div>
                          ))}
                        </div>
                        {getTotalNotAttemptedPages() > 1 && (
                          <div className="pagination-controls">
                            <button 
                              className="pagination-btn"
                              onClick={handlePrevNotAttemptedPage}
                              disabled={notAttemptedPage === 1}
                            >
                              ← Previous
                            </button>
                            <span className="pagination-info">
                              Page {notAttemptedPage} of {getTotalNotAttemptedPages()}
                            </span>
                            <button 
                              className="pagination-btn"
                              onClick={handleNextNotAttemptedPage}
                              disabled={notAttemptedPage === getTotalNotAttemptedPages()}
                            >
                              Next →
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* SCORE DISTRIBUTION BAR CHART */}
                  {analysisData.scoreDistribution && (
                    <div className="analysis-section">
                      <h3 className="section-title">📊 Score Distribution</h3>
                      <div className="dashboard-card">
                        <div className="card-header-simple">
                          <h4>Score Range Breakdown</h4>
                          <p className="card-subtitle">Based on {analysisData.scoreDistribution.totalSubmissions} submission{analysisData.scoreDistribution.totalSubmissions !== 1 ? 's' : ''}</p>
                        </div>
                        <div className="horizontal-bar-chart">
                          {Object.entries(analysisData.scoreDistribution.buckets)
                            .reverse() // Reverse the order to show highest percentage first
                            .map(([range, count]: [string, any]) => {
                            const percentage = (count / analysisData.scoreDistribution.totalSubmissions) * 100;
                            const colorClass = range === '0-25' ? 'poor' : range === '26-50' ? 'average' : range === '51-75' ? 'good' : 'excellent';
                            // Ensure minimum width for visibility, especially for 0%
                            const displayWidth = count === 0 ? 0 : Math.max(percentage, 3);
                            return (
                              <div key={range} className="bar-item">
                                <div className="bar-header">
                                  <span className={`bar-label ${colorClass}`}>{range}%</span>
                                  <span className="bar-count">{count} students ({percentage.toFixed(0)}%)</span>
                                </div>
                                <div className="bar-track">
                                  {count > 0 ? (
                                    <div 
                                      className={`bar-fill ${colorClass}`}
                                      style={{ width: `${displayWidth}%` }}
                                    >
                                      <span className="bar-percentage">{percentage.toFixed(0)}%</span>
                                    </div>
                                  ) : (
                                    <div className="bar-empty">
                                      <span className="bar-empty-text">No students</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div className="metrics-grid" style={{ marginTop: '1.5rem' }}>
                        <div className="metric-card highlight">
                          <div className="metric-icon">📈</div>
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
                    </div>
                  )}

                  {/* PERFORMANCE SEGMENTATION */}
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
                                  <span className="percentage-badge excellent">
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
                            <h4>📚 Struggling Students (Bottom 20%)</h4>
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

                  {/* TIME DISTRIBUTION */}
                  {analysisData.timeDistribution && (
                    <div className="analysis-section">
                      <h3 className="section-title">🕐 Submission Timeline</h3>
                      <div className="dashboard-card">
                        <div className="card-header-simple">
                          <h4>When Students Submit</h4>
                          <p className="card-subtitle">Distribution across different times of day</p>
                        </div>
                        <div className="time-distribution">
                          {[
                            { key: 'morning', label: 'Morning', range: '6:00 AM - 12:00 PM', icon: '🌅' },
                            { key: 'afternoon', label: 'Afternoon', range: '12:00 PM - 6:00 PM', icon: '☀️' },
                            { key: 'evening', label: 'Evening', range: '6:00 PM - 12:00 AM', icon: '🌆' },
                            { key: 'night', label: 'Night', range: '12:00 AM - 6:00 AM', icon: '🌙' }
                          ].map(({ key, label, range, icon }) => {
                            const count = analysisData.timeDistribution[key];
                            const percentage = analysisData.totalSubmissions > 0 ? (count / analysisData.totalSubmissions) * 100 : 0;
                            return (
                              <div key={key} className="time-item">
                                <div className="time-header">
                                  <div className="time-icon">{icon}</div>
                                  <div className="time-info">
                                    <div className="time-label">{label}</div>
                                    <div className="time-range">{range}</div>
                                  </div>
                                  <div className="time-count">
                                    <strong>{count}</strong>
                                    <span className="time-percentage">({percentage.toFixed(0)}%)</span>
                                  </div>
                                </div>
                                <div className="time-bar">
                                  <div 
                                    className={`time-fill ${key}`}
                                    style={{ width: `${percentage}%` }}
                                  ></div>
                                </div>
                              </div>
                            );
                          })}
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
