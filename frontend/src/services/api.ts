import axios from 'axios';
import { ApiResponse, Kanji, Vocabulary, ProgressSummary, UserProgress, UserProfile } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Set bearer token from Firebase Auth
export const setAuthToken = (token: string | null) => {
  if (token) {
    apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete apiClient.defaults.headers.common['Authorization'];
  }
};

export const api = {
  // Health
  checkHealth: async () => {
    const res = await apiClient.get<ApiResponse<{ status: string; service: string }>>('/health');
    return res.data;
  },

  // Kanji
  getKanjiList: async (jlptLevel?: string, limit = 50) => {
    const params = new URLSearchParams();
    if (jlptLevel) params.append('jlptLevel', jlptLevel);
    params.append('limit', limit.toString());
    const res = await apiClient.get<ApiResponse<Kanji[]>>(`/kanji?${params.toString()}`);
    return res.data.data;
  },

  getKanjiById: async (id: string) => {
    const res = await apiClient.get<ApiResponse<Kanji>>(`/kanji/${id}`);
    return res.data.data;
  },

  // Vocabulary
  getVocabularies: async (jlptLevel?: string, limit = 50) => {
    const params = new URLSearchParams();
    if (jlptLevel) params.append('jlptLevel', jlptLevel);
    params.append('limit', limit.toString());
    const res = await apiClient.get<ApiResponse<Vocabulary[]>>(`/vocabularies?${params.toString()}`);
    return res.data.data;
  },

  // Study & Spaced Repetition (SRS)
  submitProgress: async (itemId: string, itemType: 'KANJI' | 'VOCABULARY', quality: number) => {
    const res = await apiClient.post<ApiResponse<UserProgress>>('/progress', {
      itemId,
      itemType,
      quality,
    });
    return res.data.data;
  },

  getProgressSummary: async () => {
    const res = await apiClient.get<ApiResponse<ProgressSummary>>('/progress/summary');
    return res.data.data;
  },

  getDueReviews: async () => {
    const res = await apiClient.get<ApiResponse<UserProgress[]>>('/progress/due');
    return res.data.data;
  },

  // User Profile
  getCurrentUser: async () => {
    const res = await apiClient.get<ApiResponse<UserProfile>>('/auth/me');
    return res.data.data;
  },
};
