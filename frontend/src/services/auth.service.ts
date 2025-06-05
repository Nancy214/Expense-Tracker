import axios from "axios";
import { LoginCredentials, AuthResponse } from "@/types/auth";

const API_URL = "http://localhost:8000/api";

// Store tokens in localStorage
const storeTokens = (tokens: AuthResponse) => {
  localStorage.setItem("accessToken", tokens.accessToken);
  localStorage.setItem("refreshToken", tokens.refreshToken);
};

// Remove tokens from localStorage
const removeTokens = () => {
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
};

// Create axios instance
const authApi = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Add interceptor to handle token refresh
authApi.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response.status === 403 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem("refreshToken");

      try {
        const response = await authApi.post("/auth/refresh-token", {
          refreshToken,
        });
        const { accessToken } = response.data;
        localStorage.setItem("accessToken", accessToken);

        originalRequest.headers["Authorization"] = `Bearer ${accessToken}`;
        return authApi(originalRequest);
      } catch (error) {
        removeTokens();
        return Promise.reject(error);
      }
    }
    return Promise.reject(error);
  }
);

export const login = async (
  credentials: LoginCredentials
): Promise<AuthResponse> => {
  try {
    const response = await authApi.post("/auth/login", credentials);
    const tokens = response.data;
    storeTokens(tokens);
    return tokens;
  } catch (error) {
    throw error;
  }
};

export const logout = async (): Promise<void> => {
  try {
    const refreshToken = localStorage.getItem("refreshToken");
    await authApi.post("/auth/logout", { refreshToken });
    removeTokens();
  } catch (error) {
    // Even if the server request fails, we still want to remove tokens
    removeTokens();
    throw error;
  }
};

export const register = async (
  credentials: LoginCredentials
): Promise<AuthResponse> => {
  try {
    const response = await authApi.post("/auth/register", credentials);
    const tokens = response.data;
    storeTokens(tokens);
    return tokens;
  } catch (error) {
    throw error;
  }
};
