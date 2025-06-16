import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import LoginPage from "@/app-components/pages/LoginPage";
import RegisterPage from "@/app-components/pages/RegisterPage";
import { AuthRoute, PrivateRoute } from "@/app-components/AuthRoute";

import Navbar from "@/app-components/Navbar";

import HomePage from "./app-components/pages/HomePage";
import { AuthProvider } from "@/context/AuthContext";

function App() {
  return (
    <AuthProvider>
      <Router>
        <Navbar />
        <Routes>
          <Route
            path="/login"
            element={
              <AuthRoute>
                <LoginPage />
              </AuthRoute>
            }
          />
          <Route
            path="/register"
            element={
              <AuthRoute>
                <RegisterPage />
              </AuthRoute>
            }
          />
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
    </AuthProvider>
  );
}

export default App;
