import { BrowserRouter as Router } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import Navbar from "@/app-components/Navbar";
import { AppRoutes } from "@/routes";
import { Toaster } from "@/components/ui/toaster";

function App() {
  return (
    <AuthProvider>
      <Router>
        <Navbar />
        <Toaster />
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
}

export default App;
