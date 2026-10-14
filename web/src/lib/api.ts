import axios, { AxiosInstance, AxiosResponse, InternalAxiosRequestConfig } from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1';

// Create axios instance
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor — attach JWT token
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('tamizhi_jwt');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor — handle errors
apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      if (typeof window !== 'undefined') {
        localStorage.removeItem('tamizhi_jwt');
        window.dispatchEvent(new CustomEvent('tamizhi:unauthorized'));
      }
    }

    const message =
      error.response?.data?.error ||
      error.response?.data?.message ||
      error.message ||
      'Request failed';

    return Promise.reject(new Error(message));
  }
);

// ─── Auth ────────────────────────────────────────────────────────────────────

export interface AuthPayload {
  address: string;
  signature: string;
  nonce: string;
  publicKey: string;
}

export async function authenticate(payload: AuthPayload): Promise<{ token: string }> {
  const res = await apiClient.post<{ token: string }>('/auth/verify', payload);
  if (res.data.token) {
    localStorage.setItem('tamizhi_jwt', res.data.token);
  }
  return res.data;
}

export async function getNonce(address: string): Promise<{ nonce: string }> {
  const res = await apiClient.get<{ nonce: string }>(`/auth/nonce/${address}`);
  return res.data;
}

// ─── Wallet / Chain ──────────────────────────────────────────────────────────

export interface BalanceResponse {
  address: string;
  balance: {
    tmz: string;
    utmz: string;
  };
}

export async function getBalance(address: string): Promise<AxiosResponse<BalanceResponse>> {
  return apiClient.get<BalanceResponse>(`/wallet/balance/${address}`);
}

export interface SendTxPayload {
  from: string;
  to: string;
  amount: string;
  memo?: string;
  signedTxBytes: string; // base64
}

export interface SendTxResponse {
  txHash: string;
  height: number;
  code: number;
}

export async function sendTx(payload: SendTxPayload): Promise<AxiosResponse<SendTxResponse>> {
  return apiClient.post<SendTxResponse>('/tx/broadcast', payload);
}

// ─── Literature ──────────────────────────────────────────────────────────────

export interface LiteratureWork {
  id: string;
  titleTamil: string;
  titleTransliterated: string;
  titleEnglish: string;
  author: string;
  period: string;
  genre: string;
  ipfsCid: string;
  isVerified: boolean;
  txHash: string;
  blockHeight: number;
  timestamp: string;
  tags: string[];
  language: string;
  license: string;
  description: string;
  uploaderAddress: string;
  fileSize: string;
  fileType: string;
  excerpt?: string;
  content?: string;
}

export interface LiteratureFilters {
  period?: string;
  genre?: string;
  author?: string;
  page?: number;
  limit?: number;
}

export interface SearchLiteratureParams extends LiteratureFilters {
  q: string;
}

export async function getLiterature(
  filters?: LiteratureFilters
): Promise<AxiosResponse<LiteratureWork[]>> {
  return apiClient.get<LiteratureWork[]>('/literature', { params: filters });
}

export async function getLiteratureById(
  id: string
): Promise<AxiosResponse<LiteratureWork>> {
  return apiClient.get<LiteratureWork>(`/literature/${id}`);
}

export async function searchLiterature(
  params: SearchLiteratureParams
): Promise<AxiosResponse<LiteratureWork[]>> {
  return apiClient.get<LiteratureWork[]>('/literature/search', { params });
}

export interface UploadLiteraturePayload {
  titleTamil: string;
  titleTransliterated: string;
  titleEnglish: string;
  author: string;
  period: string;
  genre: string;
  description: string;
  license: string;
  tags: string[];
  file: File;
}

export async function uploadLiterature(
  payload: UploadLiteraturePayload,
  onProgress?: (percent: number) => void
): Promise<AxiosResponse<LiteratureWork>> {
  const formData = new FormData();
  Object.entries(payload).forEach(([key, value]) => {
    if (key === 'tags') {
      formData.append(key, JSON.stringify(value));
    } else if (key === 'file') {
      formData.append(key, value as File);
    } else {
      formData.append(key, String(value));
    }
  });

  return apiClient.post<LiteratureWork>('/literature/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (progressEvent) => {
      if (onProgress && progressEvent.total) {
        const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        onProgress(percent);
      }
    },
  });
}

// ─── Messaging ───────────────────────────────────────────────────────────────

export interface SendMessagePayload {
  to: string;
  encryptedContent: string;
  nonce: string;
  senderPublicKey: string;
}

export interface MessageResponse {
  id: string;
  from: string;
  to: string;
  encryptedContent: string;
  nonce: string;
  senderPublicKey: string;
  timestamp: string;
  status: string;
}

export async function sendMessage(
  payload: SendMessagePayload
): Promise<AxiosResponse<MessageResponse>> {
  return apiClient.post<MessageResponse>('/messages/send', payload);
}

export async function getMessages(
  conversationId: string,
  since?: string
): Promise<AxiosResponse<MessageResponse[]>> {
  return apiClient.get<MessageResponse[]>(`/messages/${conversationId}`, {
    params: { since },
  });
}

export async function getConversations(): Promise<
  AxiosResponse<Array<{
    id: string;
    participantAddress: string;
    lastMessage: MessageResponse;
    unreadCount: number;
  }>>
> {
  return apiClient.get('/messages/conversations');
}

export async function getRecipientPublicKey(address: string): Promise<{ publicKey: string }> {
  const res = await apiClient.get<{ publicKey: string }>(`/keys/${address}`);
  return res.data;
}

export async function registerPublicKey(publicKey: string): Promise<void> {
  await apiClient.post('/keys/register', { publicKey });
}

// ─── Explorer ────────────────────────────────────────────────────────────────

export async function getChainStats() {
  return apiClient.get('/chain/stats');
}

export async function getLatestBlocks(limit = 10) {
  return apiClient.get('/chain/blocks', { params: { limit } });
}

export async function getLatestTransactions(limit = 20) {
  return apiClient.get('/chain/txs', { params: { limit } });
}

export async function searchChain(query: string) {
  return apiClient.get('/chain/search', { params: { q: query } });
}

export default apiClient;
