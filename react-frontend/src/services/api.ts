import axios from 'axios';
import {
  LoginCredentials,
  LoginResponse,
  ExamData,
  SubmissionData,
  SubmissionResponse,
  User,
  AdminLoginCredentials,
  AdminLoginResponse,
  ScoresResponse,
  Test
} from '../types';

// Create an axios instance with base URL
const api = axios.create({
  baseURL: 'http://localhost:5000',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add interceptor to add token to every request
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// API service functions
export const apiService = {
  // Check if API is running
  checkHealth: async () => {
    try {
      const response = await api.get('/');
      return response.data;
    } catch (error) {
      console.error('Health check failed:', error);
      throw error;
    }
  },

  // Login user
  login: async (credentials: LoginCredentials): Promise<LoginResponse> => {
    try {
      const response = await api.post<LoginResponse>('/login', credentials);
      // Save token and user data to localStorage
      if (response.data.token) {
        // Add a default profile picture since it's not in the response data
        response.data.user.profilePicture = "https://i.pinimg.com/736x/d6/64/b2/d664b27cca7eaf4d64c41622b5bb9b6c.jpg";

        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));

        // If it's an admin user, also set the adminAuthenticated flag
        if (response.data.user && response.data.user.is_admin) {
          localStorage.setItem('adminAuthenticated', 'true');
        }
      }
      return response.data;
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  },

  // Admin login
  adminLogin: async (password: string): Promise<AdminLoginResponse> => {
    try {
      // First clear any existing authentication
      localStorage.removeItem('token');
      localStorage.removeItem('adminAuthenticated');
      localStorage.removeItem('user');

      const response = await api.post<AdminLoginResponse>('/admin-login', { password });
      console.log('Admin login response:', response.data);

      // Save token to localStorage
      if (response.data.token) {
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('adminAuthenticated', 'true');

        // Store user data if it's available in the response
        if (response.data.user) {
          localStorage.setItem('user', JSON.stringify(response.data.user));
        }
      }
      return response.data;
    } catch (error) {
      console.error('Admin login failed:', error);
      throw error;
    }
  },

  // Logout (clear token)
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('adminAuthenticated');
    // Also clear exam state
    localStorage.removeItem('questionStates');
    localStorage.removeItem('examStartTime');
  },

  // Get all tests (for admin)
  getAllTests: async () => {
    try {
      const response = await api.get('/tests');
      return response.data.tests;
    } catch (error) {
      console.error('Failed to fetch tests:', error);
      throw error;
    }
  },

  // Get active tests (for student login)
  getActiveTests: async () => {
    try {
      console.log('Fetching active tests...');
      const response = await api.get('/active-tests');
      console.log('Active tests response:', response.data);
      return response.data.tests || [];
    } catch (error) {
      console.error('Failed to fetch active tests:', error);
      throw error;
    }
  },

  // Get a specific test by ID
  getTestById: async (testId: number) => {
    try {
      const response = await api.get(`/tests/${testId}`);
      return response.data.test;
    } catch (error) {
      console.error(`Failed to fetch test ${testId}:`, error);
      throw error;
    }
  },

  // Create a new test
  createTest: async (testData: Omit<Test, 'id' | 'created_at' | 'sections_count' | 'questions_count'>) => {
    try {
      // Rename title to name to match backend expectations
      const backendData = {
        name: testData.name,
        description: testData.description,
        duration_minutes: testData.duration_minutes,
        is_active: testData.is_active
      };

      console.log('Creating test with data:', backendData);
      const response = await api.post('/tests', backendData);
      return response.data;
    } catch (error) {
      console.error('Failed to create test:', error);
      throw error;
    }
  },

  // Update an existing test
  updateTest: async (testId: number, testData: Partial<Test>) => {
    try {
      // Convert frontend field names to backend field names
      const backendData: any = {};

      if (testData.name !== undefined) backendData.name = testData.name;
      if (testData.description !== undefined) backendData.description = testData.description;
      if (testData.duration_minutes !== undefined) backendData.duration_minutes = testData.duration_minutes;
      if (testData.is_active !== undefined) backendData.is_active = testData.is_active;

      console.log(`Updating test ${testId} with data:`, backendData);
      const response = await api.put(`/tests/${testId}`, backendData);
      return response.data;
    } catch (error) {
      console.error(`Failed to update test ${testId}:`, error);
      throw error;
    }
  },

  // Delete a test
  deleteTest: async (testId: number) => {
    try {
      const response = await api.delete(`/tests/${testId}`);
      return response.data;
    } catch (error) {
      console.error(`Failed to delete test ${testId}:`, error);
      throw error;
    }
  },

  // Get exam questions
  getQuestions: async (testId?: number): Promise<ExamData> => {
    try {
      // Always require a testId parameter
      if (!testId) {
        throw new Error('Test ID is required to fetch questions');
      }

      const url = `/questions?test_id=${testId}`;
      console.log(`Fetching questions from: ${url}`);
      const response = await api.get(url);
      console.log('Questions response:', response.data);

      // Format the response to match the ExamData interface
      const formattedResponse: ExamData = {
        test_id: response.data.test.id,
        title: response.data.test.name, // Map the backend 'name' to frontend 'title'
        description: response.data.test.description,
        duration_minutes: response.data.test.duration_minutes,
        sections: response.data.sections
      };

      return formattedResponse;
    } catch (error) {
      console.error('Failed to fetch questions:', error);
      throw error;
    }
  },

  // Submit exam
  submitExam: async (submission: SubmissionData): Promise<SubmissionResponse> => {
    try {
      // Validate required fields before sending
      if (!submission.answers || Object.keys(submission.answers).length === 0) {
        throw new Error('No answers provided for submission');
      }

      if (!submission.test_id) {
        throw new Error('Test ID is required for submission');
      }

      console.log('Submitting exam with data:', JSON.stringify(submission));
      const response = await api.post<SubmissionResponse>('/submit', submission);
      console.log('Submission response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Failed to submit exam:', error);
      throw error;
    }
  },

  // Upload files (for admin)
  uploadFiles: async (userFile: File | null, examFile: File | null, testId: number) => {
    try {
      const formData = new FormData();
      if (userFile) {
        formData.append('user_file', userFile);
      }
      if (examFile) {
        formData.append('exam_file', examFile);
      }
      formData.append('test_id', testId.toString());

      const response = await api.post('/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      return response.data;
    } catch (error) {
      console.error('Upload failed:', error);
      throw error;
    }
  },

  // Get all scores (for admin)
  getScores: async (testId?: number): Promise<ScoresResponse> => {
    try {
      const url = testId ? `/scores?test_id=${testId}` : '/scores';
      const response = await api.get<ScoresResponse>(url);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch scores:', error);
      throw error;
    }
  },

  // Download scores as CSV (for admin)
  downloadScores: async () => {
    try {
      // Get the token from localStorage
      const token = localStorage.getItem('token');

      // Create a link and download the file with authorization header
      const a = document.createElement('a');
      a.href = `http://localhost:5000/download-scores`;
      a.download = 'exam_scores.csv';

      // Create an AJAX request with the authorization header
      const xhr = new XMLHttpRequest();
      xhr.open('GET', a.href);
      xhr.responseType = 'blob';

      if (token) {
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      }

      xhr.onload = function () {
        if (xhr.status === 200) {
          const blob = new Blob([xhr.response], { type: 'text/csv' });
          const url = URL.createObjectURL(blob);
          a.href = url;
          a.click();
          URL.revokeObjectURL(url);
        }
      };

      xhr.send();
      return true;
    } catch (error) {
      console.error('Download failed:', error);
      throw error;
    }
  },

  // Check if user is authenticated
  isAuthenticated: (): boolean => {
    const token = localStorage.getItem('token');
    console.log('Token in localStorage:', token ? 'exists' : 'not found');
    if (!token) return false;

    // Check if token has expired
    try {
      // JWT tokens are in the format xxxxx.yyyyy.zzzzz
      // The middle part (payload) contains the expiration time
      const payload = token.split('.')[1];

      // Safeguard against malformed tokens
      if (!payload) {
        console.error('Invalid token format - missing payload');
        localStorage.removeItem('token');
        localStorage.removeItem('adminAuthenticated');
        return false;
      }

      const decodedPayload = JSON.parse(atob(payload));
      console.log('Token payload:', decodedPayload);

      // Check if token has expired
      if (decodedPayload.exp && decodedPayload.exp * 1000 < Date.now()) {
        console.log('Token expired, clearing authentication');
        // Token has expired, clear it
        localStorage.removeItem('token');
        localStorage.removeItem('adminAuthenticated');
        return false;
      }

      return true;
    } catch (e) {
      console.error('Error decoding token:', e);
      // If there's an error parsing the token, it's likely invalid
      localStorage.removeItem('token');
      localStorage.removeItem('adminAuthenticated');
      return false;
    }
  },

  // Check if user is admin
  isAdmin: (): boolean => {
    const isAdminFlag = localStorage.getItem('adminAuthenticated') === 'true';
    const hasToken = !!localStorage.getItem('token');

    // Also check the user object if available
    let isAdminFromUser = false;
    try {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const user = JSON.parse(userStr);
        isAdminFromUser = user.is_admin === true;
      }
    } catch (e) {
      console.error('Error parsing user data:', e);
    }

    console.log('Admin check:', { isAdminFlag, isAdminFromUser, hasToken });
    return (isAdminFlag || isAdminFromUser) && hasToken;
  },

  // Get current user
  getCurrentUser: (): User | null => {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  }
};

export default apiService;