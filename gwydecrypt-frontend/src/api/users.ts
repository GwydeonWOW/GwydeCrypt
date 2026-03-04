import api from './axios';
import type { User } from '../types';

interface UsersResponse {
  users: {
    data: User[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
}

interface UserStats {
  total_users: number;
  approved_users: number;
  pending_users: number;
  admin_users: number;
  regular_users: number;
}

interface UsersListParams {
  page?: number;
  status?: 'pending' | 'approved';
  role?: 'admin' | 'user';
  search?: string;
}

export const usersApi = {
  // List users with filters
  getUsers: async (params?: UsersListParams): Promise<UsersResponse> => {
    const response = await api.get('/admin/users', { params });
    return response.data;
  },

  // Get user stats
  getStats: async (): Promise<{ stats: UserStats }> => {
    const response = await api.get('/admin/users/stats');
    return response.data;
  },

  // Get single user
  getUser: async (id: string): Promise<{ user: User }> => {
    const response = await api.get(`/admin/users/${id}`);
    return response.data;
  },

  // Approve user
  approveUser: async (id: string): Promise<{ user: User; message: string }> => {
    const response = await api.post(`/admin/users/${id}/approve`);
    return response.data;
  },

  // Reject user
  rejectUser: async (id: string): Promise<{ user: User; message: string }> => {
    const response = await api.post(`/admin/users/${id}/reject`);
    return response.data;
  },

  // Update user role
  updateRole: async (id: string, role: 'admin' | 'user'): Promise<{ user: User; message: string }> => {
    const response = await api.put(`/admin/users/${id}/role`, { role });
    return response.data;
  },

  // Delete user
  deleteUser: async (id: string): Promise<{ message: string }> => {
    const response = await api.delete(`/admin/users/${id}`);
    return response.data;
  },
};
