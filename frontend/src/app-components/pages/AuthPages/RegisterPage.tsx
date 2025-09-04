import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { FormProvider } from "react-hook-form";
import { InputField } from "@/app-components/form-fields/InputField";
import { useRegisterForm } from "@/hooks/useAuthForm";

const RegisterPage: React.FC = () => {
    const navigate = useNavigate();
    const { form, error, onSubmit } = useRegisterForm();
    const { isSubmitting } = form.formState;

    return (
        <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
            <div className="w-full max-w-sm">
                <div className="flex flex-col gap-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-2xl">Register</CardTitle>
                            <CardDescription>Create a new account to get started</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <FormProvider {...form}>
                                <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-6">
                                    <InputField
                                        name="name"
                                        label="Name"
                                        type="text"
                                        placeholder="Enter your name"
                                        required
                                        autoComplete="name"
                                    />
                                    <InputField
                                        name="email"
                                        label="Email"
                                        type="email"
                                        placeholder="m@example.com"
                                        required
                                        autoComplete="email"
                                    />
                                    <InputField
                                        name="password"
                                        label="Password"
                                        type="password"
                                        required
                                        autoComplete="new-password"
                                    />
                                    <InputField
                                        name="confirmPassword"
                                        label="Confirm Password"
                                        type="password"
                                        required
                                        autoComplete="new-password"
                                    />
                                    {error && <div className="text-sm text-red-500">{error}</div>}
                                    <Button type="submit" className="w-full" disabled={isSubmitting}>
                                        {isSubmitting ? "Creating account..." : "Create account"}
                                    </Button>
                                    <div className="mt-4 text-center text-sm">
                                        Already have an account?{" "}
                                        <Button
                                            variant="link"
                                            className="p-0 text-sm"
                                            onClick={() => navigate("/login")}
                                        >
                                            Login
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

export default RegisterPage;
