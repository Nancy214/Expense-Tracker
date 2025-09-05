// Utility functions for authentication

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
