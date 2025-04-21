// App.jsx
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { useEffect, useState } from "react";
import { auth } from "./firebase";

// Your pages
import LandingPage from "./pages/LandingPage";
import StudentRegister from "./pages/StudentRegister";
import TeacherRegister from "./pages/TeacherRegister";
import DashboardRouter from "./pages/DashboardRouter";

function App() {
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setIsAuthenticated(!!user);
      setCheckingAuth(false);
    });
    return () => unsubscribe();
  }, []);

  if (checkingAuth) return <div>Loading...</div>;

  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route
          path="/"
          element={
            !isAuthenticated ? (
              <LandingPage />
            ) : (
              <Navigate to="/dashboard" replace />
            )
          }
        />
        <Route
          path="/student"
          element={
            !isAuthenticated ? (
              <StudentRegister />
            ) : (
              <Navigate to="/dashboard" replace />
            )
          }
        />
        <Route
          path="/teacher"
          element={
            !isAuthenticated ? (
              <TeacherRegister />
            ) : (
              <Navigate to="/dashboard" replace />
            )
          }
        />

        {/* Protected Dashboard */}
        <Route
          path="/dashboard/*"
          element={
            isAuthenticated ? <DashboardRouter /> : <Navigate to="/" replace />
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
