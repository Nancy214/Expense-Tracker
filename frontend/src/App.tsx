import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import LoginPage from "@/app-components/pages/LoginPage";
import RegisterPage from "@/app-components/pages/RegisterPage";
import PrivateRoute from "@/app-components/PrivateRoute";

import { AppSidebar } from "@/app-components/AppSidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import AppRoutes from "@/app-components/AppRoutes";
import Navbar from "@/app-components/Navbar";
import { useEffect } from "react";
import HomePage from "./app-components/pages/HomePage";

function App() {
  return (
    <>
      <Router>
        <Navbar />
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route
            path="/"
            element={
              <PrivateRoute>
                <HomePage />
              </PrivateRoute>
            }
          />
        </Routes>
      </Router>
    </>
  );
}

export default App;
