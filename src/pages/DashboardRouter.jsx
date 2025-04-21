// components/DashboardRouter.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import StudentDashboard from "./StudentDashboard";
import TeacherDashboard from "./TeacherDashboard";

function DashboardRouter() {
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        navigate("/"); // Redirect to landing/login if not logged in
        return;
      }

      try {
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          const data = userSnap.data();
          setRole(data.role);
        } else {
          console.error("No user document found.");
          navigate("/"); // fallback
        }
      } catch (err) {
        console.error("Error fetching user data:", err);
        navigate("/"); // fallback
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  if (loading)
    return <div className="text-center mt-20">Loading dashboard...</div>;

  if (role === "student") return <StudentDashboard />;
  if (role === "teacher") return <TeacherDashboard />;

  return <div>Unauthorized</div>;
}

export default DashboardRouter;
