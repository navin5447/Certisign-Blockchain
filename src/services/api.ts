import axios from 'axios';
import { toast } from 'sonner';

const API_BASE_URL = (import.meta.env.VITE_BACKEND_URL || 'http://localhost:4001') + '/api';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to include auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');
      window.location.href = '/admin';
    }
    return Promise.reject(error);
  }
);

const apiService = {
  // Authentication
  async login(loginData: any) {
    try {
      const response = await api.post('/admin/login', loginData);
      
      if (response.data.success && response.data.data.token) {
        localStorage.setItem('auth_token', response.data.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.data.user));
      }
      
      return response.data;
    } catch (error: any) {
      throw error;
    }
  },

  async walletLogin(walletAddress: string, role: 'admin' | 'student' = 'admin') {
    try {
      const response = await api.post('/auth/login', {
        walletAddress,
        role
      });
      
      if (response.data.token) {
        localStorage.setItem('authToken', response.data.token);
      }
      
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Login failed');
    }
  },

  async getWalletChallenge(walletAddress: string) {
    try {
      const response = await api.get(`/auth/challenge/${walletAddress}`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to get challenge');
    }
  },

  async logout() {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user');
    return { success: true };
  },

  async getProfile() {
    try {
      const response = await api.get('/admin/profile');
      return response.data;
    } catch (error: any) {
      throw error;
    }
  },

  // Certificate operations
  async issueCertificate(certificateData: any, pdfFile: File) {
    try {
      const formData = new FormData();
      
      // Add all certificate data fields
      Object.keys(certificateData).forEach(key => {
        if (key !== 'pdfFile' && certificateData[key] !== null && certificateData[key] !== undefined) {
          formData.append(key, certificateData[key]);
        }
      });
      
      // Add the PDF file
      formData.append('certificatePdf', pdfFile);
      
      const response = await api.post('/issue', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error: any) {
      throw error;
    }
  },

  async batchIssueCertificates(csvData: any) {
    try {
      const formData = new FormData();
      formData.append('file', csvData);
      
      const response = await api.post('/batch-issue', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 120000, // 2 minutes for batch operations
      });
      
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to batch issue certificates');
    }
  },

  async verifyCertificate(tokenId: number) {
    try {
      const response = await api.get(`/verify/${tokenId}`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Verification failed');
    }
  },

  async verifyCertificateByCode(verificationCode: string) {
    try {
      const response = await api.get(`/verify/code/${verificationCode}`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Verification failed');
    }
  },

  async revokeCertificate(tokenId: number, reason: string) {
    try {
      const response = await api.post(`/revoke/${tokenId}`, { reason });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to revoke certificate');
    }
  },

  async getAllCertificates(page = 1, limit = 10) {
    try {
      const response = await api.get(`/certificates?page=${page}&limit=${limit}`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to fetch certificates');
    }
  },

  async getCertificates(page = 1, limit = 10) {
    try {
      const response = await api.get(`/certificates?page=${page}&limit=${limit}`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to fetch certificates');
    }
  },

  async getStudentCertificates(walletAddress: string) {
    try {
      const response = await api.get(`/certificates/student/${walletAddress}`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to fetch student certificates');
    }
  },

  async getCertificate(tokenId: number) {
    try {
      const response = await api.get(`/certificates/${tokenId}`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to fetch certificate');
    }
  },

  // AI Scanning
  async scanCertificate(certificateData: any, imageData: any = null) {
    try {
      const formData = new FormData();
      formData.append('certificateData', JSON.stringify(certificateData));
      
      if (imageData) {
        formData.append('image', imageData);
      }
      
      const response = await api.post('/certificates/ai/scan', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'AI scan failed');
    }
  },

  // Dashboard stats
  async getDashboardStats() {
    try {
      const response = await api.get('/dashboard/stats');
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to fetch dashboard stats');
    }
  },

  // Batch operations status
  async getBatchOperationStatus(batchId: string) {
    try {
      const response = await api.get(`/certificates/batch/${batchId}/status`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to fetch batch status');
    }
  },

  // Institution management
  async getInstitutions() {
    try {
      const response = await api.get('/institutions');
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to fetch institutions');
    }
  },

  async createInstitution(institutionData: any) {
    try {
      const response = await api.post('/institutions', institutionData);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to create institution');
    }
  },

  // User management
  async getUsers(role?: string) {
    try {
      const params = role ? { role } : {};
      const response = await api.get('/users', { params });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to fetch users');
    }
  },

  async updateUser(userId: string, userData: any) {
    try {
      const response = await api.put(`/users/${userId}`, userData);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to update user');
    }
  },

  // Search functionality
  async searchCertificates(query: string, filters: any = {}) {
    try {
      const response = await api.get('/certificates/search', {
        params: { q: query, ...filters }
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Search failed');
    }
  },

  // Certificate templates
  async getCertificateTemplates() {
    try {
      const response = await api.get('/templates');
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to fetch templates');
    }
  },

  async createCertificateTemplate(templateData: any) {
    try {
      const response = await api.post('/templates', templateData);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to create template');
    }
  },

  // System health
  async getSystemHealth() {
    try {
      const response = await api.get('/health');
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to fetch system health');
    }
  },

  // Analytics
  async getAnalytics(period: string = '30d') {
    try {
      const response = await api.get(`/analytics?period=${period}`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to fetch analytics');
    }
  }
};

export default apiService;