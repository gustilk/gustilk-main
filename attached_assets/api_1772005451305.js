import axios from 'axios';
import { auth } from './firebase';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({ baseURL: API_BASE });

// Attach Firebase token to every request
api.interceptors.request.use(async (config) => {
  const user = auth.currentUser;
  if (user) {
    const token = await user.getIdToken();
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth
export const registerUser = (data) => api.post('/auth/register', data);
export const getCurrentUser = () => api.get('/auth/me');
export const deleteAccount = () => api.delete('/auth/account');

// Profiles
export const getMyProfile = () => api.get('/profiles/me');
export const updateProfile = (data) => api.put('/profiles/me', data);
export const uploadPhoto = (file) => {
  const form = new FormData();
  form.append('photo', file);
  return api.post('/profiles/me/photo', form, { headers: { 'Content-Type': 'multipart/form-data' } });
};
export const deletePhoto = (photoUrl) => api.delete('/profiles/me/photo', { data: { photoUrl } });
export const searchProfiles = (filters) => api.get('/profiles/search', { params: filters });
export const getProfile = (uid) => api.get(`/profiles/${uid}`);

// Matches
export const likeProfile = (uid) => api.post(`/matches/like/${uid}`);
export const dislikeProfile = (uid) => api.post(`/matches/dislike/${uid}`);
export const getMatches = () => api.get('/matches');
export const unmatch = (matchId) => api.delete(`/matches/${matchId}`);
export const getNotifications = () => api.get('/matches/notifications');

// Messages
export const sendMessage = (matchId, text) => api.post(`/messages/${matchId}`, { text });
export const getMessages = (matchId, params) => api.get(`/messages/${matchId}`, { params });
export const markMessagesRead = (matchId) => api.put(`/messages/${matchId}/read`);

// Payments
export const createStripeIntent = (currency) => api.post('/payments/stripe/create-intent', { currency });
export const initiateZainCash = (data) => api.post('/payments/zaincash/initiate', data);
export const initiateFastPay = (data) => api.post('/payments/fastpay/initiate', data);
export const getPaymentStatus = () => api.get('/payments/status');
export const getPaymentHistory = () => api.get('/payments/history');

export default api;
