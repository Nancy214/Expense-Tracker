import { BrowserRouter as Router } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import { StatsProvider } from "@/context/StatsContext";
import { AppRoutes } from "@/routes";
import { Toaster } from "@/components/ui/toaster";
import Layout from "@/app-components/Layout";

function App() {
    return (
        <AuthProvider>
            <StatsProvider>
                <Router>
                    <Layout>
                        <AppRoutes />
                    </Layout>
                    <Toaster />
                </Router>
            </StatsProvider>
        </AuthProvider>
    );
}

export default App;
