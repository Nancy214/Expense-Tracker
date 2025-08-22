import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { initiateGoogleLogin } from "@/services/auth.service";
import { FormProvider } from "react-hook-form";
import { InputField } from "@/components/form-fields/InputField";
import { useLoginForm } from "@/hooks/useAuthForm";

const LoginPage: React.FC = () => {
    const navigate = useNavigate();
    const { form, error, onSubmit } = useLoginForm();
    const {
        handleSubmit,
        formState: { isSubmitting },
    } = form;

    const handleGoogleLogin = () => {
        initiateGoogleLogin();
    };

    return (
        <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
            <div className="w-full max-w-sm">
                <div className="flex flex-col gap-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-2xl">Login</CardTitle>
                            <CardDescription>Enter your email below to login to your account</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {error && <div className="mb-4 p-2 text-sm text-red-500 bg-red-50 rounded">{error}</div>}
                            <FormProvider {...form}>
                                <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
                                    <InputField
                                        name="email"
                                        label="Email"
                                        type="email"
                                        placeholder="m@example.com"
                                        required
                                        autoComplete="email"
                                    />
                                    <div className="space-y-2">
                                        <InputField
                                            name="password"
                                            label="Password"
                                            type="password"
                                            required
                                            autoComplete="current-password"
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
                                    <Button type="submit" className="w-full" disabled={isSubmitting}>
                                        {isSubmitting ? "Logging in..." : "Login"}
                                    </Button>
                                    <div className="text-center text-sm">
                                        <Button variant="outline" className="w-full" onClick={handleGoogleLogin}>
                                            Login with Google
                                        </Button>
                                    </div>
                                    <div className="mt-2 text-center text-sm">
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
                            </FormProvider>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
