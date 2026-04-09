import axios from 'axios';
import type {
  AdminUserListResponse,
  AdminHistoryListResponse,
  AdminOverviewStats,
} from '@/types';

const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

const request = axios.create({
  baseURL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

request.interceptors.request.use((config) => config, (error) => Promise.reject(error));

request.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const message = error.response?.data?.detail || error.message || '请求失败';
    console.error('[API Error]', message);
    return Promise.reject(error);
  }
);

export default request;

// ─── 管理端 API ──────────────────────────────────────────────────────────────

/** 系统概览统计数据 */
export const getOverviewStats = (): Promise<AdminOverviewStats> =>
  request.get('/api/admin/overview');

/** 全部用户列表（分页） */
export const getUserList = (params?: { page?: number; pageSize?: number; search?: string }): Promise<AdminUserListResponse> =>
  request.get('/api/admin/users', { params });

/** 更新指定用户信息（禁用/启用等） */
export const updateUser = (userId: string, data: Record<string, unknown>) =>
  request.put(`/api/admin/users/${userId}`, data);

/** 全站分析历史（分页） */
export const getAnalysisHistory = (params?: {
  page?: number;
  pageSize?: number;
  search?: string;
}): Promise<AdminHistoryListResponse> =>
  request.get('/api/admin/analysis-history', { params });

/** 删除指定分析记录 */
export const deleteAnalysisRecord = (recordId: string) =>
  request.delete(`/api/admin/analysis-history/${recordId}`);
