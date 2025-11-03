// api/axiosConfig.ts
import axios, { AxiosError } from "axios";
import * as SecureStore from "expo-secure-store";
import { Alert } from "react-native";
import Constants from "expo-constants";

const API_BASE_URL = `http://faspro.ddns.net:3000/api`;
// const API_BASE_URL = `http://192.168.1.9:3000/api`;
// const API_BASE_URL = `http://192.168.1.9:3000`;
// const API_BASE_URL =
//   Constants.expoConfig?.extra?.API_BASE_URL ||
//   "http://faspro.ddns.net:3000/api";

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 12000,
  headers: {
    "Content-Type": "application/json",
  },
});
// console.log("API apiClient :", apiClient);
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
    Alert.alert("Error : ", error.message);
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
    Alert.alert("Error : ", error.message);
    return Promise.reject(error);
  }
);

export default apiClient;