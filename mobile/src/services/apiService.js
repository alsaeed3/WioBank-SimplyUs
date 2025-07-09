import axios from 'axios';

// Configure the base URL for your backend
const BASE_URL = 'http://localhost:3000'; // Change this to your backend URL
const API_BASE_URL = `${BASE_URL}/api`;

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor for logging
api.interceptors.request.use(
  (config) => {
    console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('API Request Error:', error);
    return Promise.reject(error);
  }
);

// Add response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    console.log(`API Response: ${response.status} ${response.config.url}`);
    return response;
  },
  (error) => {
    console.error('API Response Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

export const apiService = {
  // Health check
  healthCheck: async () => {
    try {
      const response = await api.get('/health');
      return response.data;
    } catch (error) {
      throw new Error('Backend connection failed');
    }
  },

  // SMS related endpoints
  parseSMS: async (smsText) => {
    try {
      const response = await api.post('/sms/parse', { smsText });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Failed to parse SMS');
    }
  },

  getSMSMessages: async () => {
    try {
      const response = await api.get('/sms/messages');
      return response.data;
    } catch (error) {
      throw new Error('Failed to fetch SMS messages');
    }
  },

  // Analytics endpoints
  getAnalytics: async () => {
    try {
      const response = await api.get('/analytics');
      return response.data;
    } catch (error) {
      throw new Error('Failed to fetch analytics');
    }
  },

  getSpendingTrends: async (timeframe = 'monthly') => {
    try {
      const response = await api.get(`/analytics/trends?timeframe=${timeframe}`);
      return response.data;
    } catch (error) {
      throw new Error('Failed to fetch spending trends');
    }
  },

  getCategoryBreakdown: async () => {
    try {
      const response = await api.get('/analytics/categories');
      return response.data;
    } catch (error) {
      throw new Error('Failed to fetch category breakdown');
    }
  },

  // Notifications endpoints
  getNotifications: async () => {
    try {
      const response = await api.get('/notifications');
      return response.data;
    } catch (error) {
      throw new Error('Failed to fetch notifications');
    }
  },

  markNotificationRead: async (notificationId) => {
    try {
      const response = await api.put(`/notifications/${notificationId}/read`);
      return response.data;
    } catch (error) {
      throw new Error('Failed to mark notification as read');
    }
  },

  // File upload for statements
  uploadStatement: async (file) => {
    try {
      const formData = new FormData();
      formData.append('statement', file);
      
      const response = await api.post('/statements/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error) {
      throw new Error('Failed to upload statement');
    }
  },

  // Email processing
  processEmail: async (emailData) => {
    try {
      const response = await api.post('/email/process', emailData);
      return response.data;
    } catch (error) {
      throw new Error('Failed to process email');
    }
  },

  // Payment reminders
  getUpcomingPayments: async () => {
    try {
      const response = await api.get('/payments/upcoming');
      return response.data;
    } catch (error) {
      throw new Error('Failed to fetch upcoming payments');
    }
  },

  // Test endpoints for demo
  generateDemoData: async () => {
    try {
      const response = await api.post('/demo/generate-data');
      return response.data;
    } catch (error) {
      throw new Error('Failed to generate demo data');
    }
  },
};

// Export the base URL for use in other components
export { BASE_URL, API_BASE_URL };
