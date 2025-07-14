import { BrowserRouter as Router } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import { AppRoutes } from "@/routes";
import { Toaster } from "@/components/ui/toaster";
import Layout from "@/app-components/Layout";

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
