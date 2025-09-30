// api/axiosConfig.ts
import axios from 'axios';

const API_BASE_URL = 'http://faspro.ddns.net:3000/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export default apiClient;