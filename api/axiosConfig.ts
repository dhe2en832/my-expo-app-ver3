// api/axiosConfig.ts
import axios, { AxiosError } from "axios";
import * as SecureStore from "expo-secure-store";

// const API_BASE_URL = "http://faspro.ddns.net:3000/api";
const API_BASE_URL = "http://192.168.1.9:3000/api";
// const API_BASE_URL = "http://192.168.1.9:3000";


const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});
// Interceptor untuk inject token
apiClient.interceptors.request.use(
  async (config) => {
    const token = await SecureStore.getItemAsync("auth_token");
    if (token) {
      if (config.headers) {
        config.headers["Authorization"] = `Bearer ${token}`;
      } else {
        // Ensure headers object exists and is mutable
        (config.headers as any)["Authorization"] = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// Interceptor response (optional untuk error handling global)
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Token expired atau invalid → bisa trigger logout otomatis
      console.warn("Unauthorized, token mungkin expired.");
      await SecureStore.deleteItemAsync("auth_token");
      await SecureStore.deleteItemAsync("user_data");
    }
    return Promise.reject(error);
  }
);

export default apiClient;