// Utility functions for authentication

export const removeTokens = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");
};

export const handleTokenExpiration = () => {
    removeTokens();
    // Redirect to logout page
    window.location.href = "/logout";
};

export const isTokenExpired = (token: string): boolean => {
    if (!token) return true;

    try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        const currentTime = Date.now() / 1000;
        return payload.exp < currentTime;
    } catch (error) {
        return true;
    }
};
