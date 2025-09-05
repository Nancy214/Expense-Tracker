// Utility functions for authentication
import axios, { AxiosResponse } from "axios";

/**
 * Removes authentication tokens and user data from localStorage
 */
export const removeTokens = (): void => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");
};

/**
 * Handles token expiration by removing tokens and redirecting to logout page
 */
export const handleTokenExpiration = (): void => {
    removeTokens();
    // Redirect to logout page
    window.location.href = "/logout";
};

/**
 * Checks if a JWT token is expired
 * @param token - The JWT token to check
 * @returns true if token is expired or invalid, false otherwise
 */
export const isTokenExpired = (token: string): boolean => {
    if (!token) return true;

    try {
        const payload: { exp: number } = JSON.parse(atob(token.split(".")[1]));
        const currentTime: number = Date.now() / 1000;
        return payload.exp < currentTime;
    } catch (error) {
        return true;
    }
};

/**
 * Refreshes authentication tokens
 * @returns Promise with new tokens or null if refresh fails
 */
export const refreshAuthTokens = async (): Promise<{ accessToken: string; refreshToken: string } | null> => {
    const refreshToken = localStorage.getItem("refreshToken");

    if (!refreshToken) {
        handleTokenExpiration();
        return null;
    }

    try {
        const response: AxiosResponse<{ accessToken: string; refreshToken: string }> = await axios.post(
            "http://localhost:8000/api/auth/refresh-token",
            { refreshToken }
        );

        const { accessToken: newAccessToken, refreshToken: newRefreshToken } = response.data;

        // Store both new tokens
        localStorage.setItem("accessToken", newAccessToken);
        localStorage.setItem("refreshToken", newRefreshToken);

        return { accessToken: newAccessToken, refreshToken: newRefreshToken };
    } catch (error) {
        handleTokenExpiration();
        return null;
    }
};
