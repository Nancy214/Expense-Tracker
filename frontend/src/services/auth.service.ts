import axios from "axios";
import { LoginCredentials, AuthResponse } from "@/types/auth";

const API_URL = "http://localhost:8000/api";

// Store tokens and user data in localStorage
const storeAuthData = (data: AuthResponse) => {
  localStorage.setItem("accessToken", data.accessToken);
  localStorage.setItem("refreshToken", data.refreshToken);
  localStorage.setItem("user", JSON.stringify(data.user));
};

// Remove auth data from localStorage
const removeAuthData = () => {
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("user");
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
        removeAuthData();
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
    const authData = response.data;
    storeAuthData(authData);
    return authData;
  } catch (error) {
    throw error;
  }
};

export const logout = async (): Promise<void> => {
  try {
    const refreshToken = localStorage.getItem("refreshToken");
    await authApi.post("/auth/logout", { refreshToken });
    removeAuthData();
  } catch (error) {
    // Even if the server request fails, we still want to remove auth data
    removeAuthData();
    throw error;
  }
};

export const register = async (
  credentials: LoginCredentials
): Promise<AuthResponse> => {
  try {
    const response = await authApi.post("/auth/register", credentials);
    const authData = response.data;
    storeAuthData(authData);
    return authData;
  } catch (error) {
    throw error;
  }
};
