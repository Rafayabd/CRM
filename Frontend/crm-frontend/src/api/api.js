import axios from 'axios';

// This is the base URL of your running backend server
const API_URL = 'http://localhost:5000/api';

// Create an Axios instance
const api = axios.create({
    baseURL: API_URL,
});

// --- Auth Endpoints ---
export const login = (email, password) => {
    return api.post('/login', { email, password });
};

export const register = (userData) => {
    return api.post('/register', userData);
};

// --- Helper to get Token ---
const getToken = () => {
    return localStorage.getItem('token');
};

// --- Protected API Instance ---
export const protectedApi = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    }
});

// Interceptor to add Token to requests
protectedApi.interceptors.request.use((config) => {
    const token = getToken();
    if (token) {
        config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
});

// ==========================================
//  LEAD MANAGEMENT
// ==========================================

export const getLeads = () => {
    return protectedApi.get('/leads');
};

export const createLead = (leadData) => {
    return protectedApi.post('/leads', leadData);
};

export const deleteLead = (leadId) => {
    return protectedApi.delete(`/leads/${leadId}`);
};

// --- Lead Details & Editing ---
export const getLeadDetails = (leadId) => {
    return protectedApi.get(`/leads/${leadId}`);
};

export const updateLeadDetails = (leadId, leadData) => {
    return protectedApi.patch(`/leads/${leadId}/details`, leadData); 
};

// ==========================================
//  COMMENTS
// ==========================================

export const getComments = (leadId) => {
    return protectedApi.get(`/leads/${leadId}/comments`);
};

export const addComment = (leadId, commentText) => {
    return protectedApi.post(`/leads/${leadId}/comments`, { CommentText: commentText });
};

// ==========================================
//  USER MANAGEMENT (Admin)
// ==========================================

export const getAllUsers = () => {
    return protectedApi.get('/users');
};

export const deleteUser = (userId) => {
    return protectedApi.delete(`/users/${userId}`);
};

// ==========================================
//  IMPORT / EXPORT (New)
// ==========================================

export const exportLeads = () => {
    // Blob response zaroori hai file download ke liye
    return protectedApi.get('/leads/export', { responseType: 'blob' });
};

export const importLeads = (formData) => {
    // Multipart header zaroori hai file upload ke liye
    return protectedApi.post('/leads/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    });
};

// Add this at the end
export const getLeadLogs = (leadId) => {
    return protectedApi.get(`/leads/${leadId}/logs`);
};

// --- Tasks ---
export const getTasks = (leadId) => {
    return protectedApi.get(`/leads/${leadId}/tasks`);
};

export const addTask = (leadId, taskData) => {
    return protectedApi.post(`/leads/${leadId}/tasks`, taskData);
};

export const toggleTask = (taskId) => {
    return protectedApi.patch(`/tasks/${taskId}/toggle`);
};

export const deleteTask = (taskId) => {
    return protectedApi.delete(`/tasks/${taskId}`);
};

// --- Notifications ---
export const getNotifications = () => {
    return protectedApi.get('/notifications');
};

export const markNotificationsRead = () => {
    return protectedApi.patch('/notifications/mark-read');
};