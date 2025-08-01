import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { LoginCredentials } from "@/types/auth";
import { initiateGoogleLogin } from "@/services/auth.service";

const LoginPage: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { login } = useAuth();
    const [formData, setFormData] = useState<LoginCredentials>({
        email: "",
        password: "",
    });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError("");

        try {
            await login(formData as LoginCredentials);
            // Redirect to the page they tried to visit or home
            const from = (location.state as any)?.from?.pathname || "/";
            navigate(from, { replace: true });
        } catch (error: any) {
            setError(error.response?.data?.message || "Failed to login. Please check your credentials.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({
            ...formData,
            [e.target.id]: e.target.value,
        });
    };

    const handleGoogleLogin = () => {
        initiateGoogleLogin();
    };

    return (
        <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
            <div className="w-full max-w-sm">
                <div className="flex flex-col gap-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-2xl">Login</CardTitle>
                            <CardDescription>Enter your email below to login to your account</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {error && <div className="mb-4 p-2 text-sm text-red-500 bg-red-50 rounded">{error}</div>}
                            <form onSubmit={handleSubmit}>
                                <div className="flex flex-col gap-6">
                                    <div className="grid gap-2">
                                        <Label htmlFor="email">Email</Label>
                                        <Input
                                            id="email"
                                            type="email"
                                            placeholder="m@example.com"
                                            required
                                            value={formData.email}
                                            onChange={handleChange}
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <div className="flex items-center">
                                            <Label htmlFor="password">Password</Label>
                                        </div>
                                        <Input
                                            id="password"
                                            type="password"
                                            required
                                            value={formData.password}
                                            onChange={handleChange}
                                        />
                                        <Button
                                            variant="link"
                                            className="p-0 text-sm justify-end"
                                            type="button"
                                            onClick={() => navigate("/forgot-password")}
                                        >
                                            Forgot password?
                                        </Button>
                                    </div>
                                    <Button type="submit" className="w-full" disabled={isLoading}>
                                        {isLoading ? "Logging in..." : "Login"}
                                    </Button>
                                </div>
                                <div className="mt-4 text-center text-sm">
                                    <Button variant="outline" className="w-full" onClick={handleGoogleLogin}>
                                        Login with Google
                                    </Button>
                                </div>
                                <div className="mt-4 text-center text-sm">
                                    Don&apos;t have an account?{" "}
                                    <Button
                                        variant="link"
                                        className="p-0 text-sm"
                                        onClick={() => navigate("/register")}
                                    >
                                        Sign up
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
