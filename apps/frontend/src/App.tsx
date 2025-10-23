import { BrowserRouter as Router } from "react-router-dom";
import Layout from "@/app-components/utility-components/Layout";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/context/AuthContext";
import { AppRoutes } from "@/routes";

function App() {
	return (
		<AuthProvider>
			<Router>
				<Layout>
					<AppRoutes />
				</Layout>
				<Toaster />
			</Router>
		</AuthProvider>
	);
}

export default App;
