import { AlertCircle, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const LogoutPage: React.FC = () => {
	const navigate = useNavigate();

	const handleLogin = (): void => {
		navigate("/login", { replace: true });
	};

	return (
		<div className="flex items-center justify-center min-h-screen bg-gray-50">
			<Card className="w-full max-w-md mx-4">
				<CardHeader className="text-center">
					<div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
						<LogOut className="h-6 w-6 text-red-600" />
					</div>
					<CardTitle className="text-2xl font-semibold text-gray-900">You are logged out</CardTitle>
					<CardDescription className="text-gray-600">
						Your session has expired. Please log in again to continue.
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="flex items-center p-3 bg-amber-50 border border-amber-200 rounded-lg">
						<AlertCircle className="h-5 w-5 text-amber-600 mr-2 flex-shrink-0" />
						<p className="text-sm text-amber-800">
							For security reasons, you have been automatically logged out due to an expired session.
						</p>
					</div>
					<Button onClick={handleLogin} className="w-full" size="lg">
						Log In Again
					</Button>
				</CardContent>
			</Card>
		</div>
	);
};

export default LogoutPage;
