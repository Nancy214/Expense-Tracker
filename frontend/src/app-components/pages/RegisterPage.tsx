import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNavigate } from "react-router-dom";
import { register } from "@/services/auth.service";
import { RegisterCredentials } from "@/types/auth";

const RegisterPage = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    profilePicture: undefined as File | undefined,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const validFileTypes: string[] = ["image/jpeg", "image/png", "image/jpg"];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validate passwords match
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setIsLoading(true);

    try {
      await register(formData as RegisterCredentials);
      console.log("Registered successfully!");
      navigate("/login");
    } catch (error: any) {
      setError(
        error.response?.data?.message || "Failed to register. Please try again."
      );
      console.error("Registration error:", error);
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

  const handleProfilePictureChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (e.target.files?.[0]) {
      const file = e.target.files[0];
      if (validFileTypes.includes(file.type)) {
        setFormData({
          ...formData,
          profilePicture: file,
        });
      } else {
        setError("Please upload a valid image file (JPEG, PNG, or JPG)");
      }
    }
  };

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Register</CardTitle>
              <CardDescription>
                Create a new account to get started
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit}>
                <div className="flex flex-col gap-6">
                  <div className="grid gap-2">
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      type="text"
                      placeholder="Enter your name"
                      required
                      value={formData.name}
                      onChange={handleChange}
                    />
                  </div>
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
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      required
                      value={formData.password}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      required
                      value={formData.confirmPassword}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="profilePicture">Profile Picture</Label>
                    <Input
                      id="profilePicture"
                      type="file"
                      onChange={handleProfilePictureChange}
                    />
                  </div>
                  {error && <div className="text-sm text-red-500">{error}</div>}
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? "Creating account..." : "Create account"}
                  </Button>
                </div>
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
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
