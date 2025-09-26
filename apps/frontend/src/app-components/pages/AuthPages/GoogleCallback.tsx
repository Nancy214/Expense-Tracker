import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { GoogleCallbackTokens, ApiErrorResponse } from "@expense-tracker/shared-types/src/auth";

const GoogleCallback: React.FC = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { loginWithGoogle } = useAuth();
    const [error, setError] = useState<string>("");

    useEffect(() => {
        const processCallback = async (): Promise<void> => {
            try {
                const tokensParam: string | null = searchParams.get("tokens");

                if (!tokensParam) {
                    throw new Error("No tokens received");
                }

                const tokens: GoogleCallbackTokens = JSON.parse(decodeURIComponent(tokensParam));

                // Store tokens in localStorage
                localStorage.setItem("accessToken", tokens.accessToken);
                localStorage.setItem("refreshToken", tokens.refreshToken);
                localStorage.setItem("user", JSON.stringify(tokens.user));

                // Update auth context
                loginWithGoogle(tokens.user);

                // Redirect to home page
                navigate("/", { replace: true });
            } catch (error: unknown) {
                //console.error("Google callback error:", error);
                const apiError = error as ApiErrorResponse;
                setError(apiError.message || "Failed to authenticate with Google");
                // Redirect to login page after a delay
                setTimeout(() => {
                    navigate("/login", { replace: true });
                }, 3000);
            }
        };

        processCallback();
    }, [navigate, loginWithGoogle, searchParams]);

    if (error) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <h2 className="text-xl font-semibold text-red-600 mb-2">Authentication Error</h2>
                    <p className="text-gray-600">{error}</p>
                    <p className="text-sm text-gray-500 mt-2">Redirecting to login...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto mb-4"></div>
                <h2 className="text-xl font-semibold mb-2">Authenticating with Google</h2>
                <p className="text-gray-600">Please wait while we complete your login...</p>
            </div>
        </div>
    );
};

export default GoogleCallback;
