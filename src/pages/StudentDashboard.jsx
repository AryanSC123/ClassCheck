import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth, db } from "../firebase";
import { collection, query, getDocs, addDoc } from "firebase/firestore";
import { FaCheckCircle, FaTimesCircle } from "react-icons/fa"; // Importing icons

function StudentDashboard() {
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [availableClasses, setAvailableClasses] = useState([]);
  const [attendanceData, setAttendanceData] = useState({
    present: 0,
    absent: 0,
    total: 0,
  });
  const [recentAttendance, setRecentAttendance] = useState([]);
  const [joinedClasses, setJoinedClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Fetch available classes when modal is opened
  useEffect(() => {
    const fetchAvailableClasses = async () => {
      if (!showJoinModal) return;

      try {
        const snapshot = await getDocs(collection(db, "classes"));
        const classList = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setAvailableClasses(classList);
      } catch (error) {
        console.error("Error fetching classes:", error.message);
      }
    };

    fetchAvailableClasses();
  }, [showJoinModal]);

  // Fetch student's overall attendance summary
  useEffect(() => {
    const fetchOverallAttendance = async () => {
      try {
        const studentId = auth.currentUser.uid;
        const attendanceRef = collection(
          db,
          "students",
          studentId,
          "attendance"
        );
        const snapshot = await getDocs(attendanceRef);

        let presentCount = 0;
        let absentCount = 0;
        const attendanceRecords = [];

        snapshot.forEach((doc) => {
          const data = doc.data();
          attendanceRecords.push({ date: data.date, status: data.status });
          if (data.status === "Present") presentCount++;
          else if (data.status === "Absent") absentCount++;
        });

        const totalDays = presentCount + absentCount;

        setAttendanceData({
          present: presentCount,
          absent: absentCount,
          total: totalDays,
        });

        setRecentAttendance(attendanceRecords.slice(0, 5));
      } catch (error) {
        console.error("Error fetching overall attendance:", error.message);
      }
    };

    fetchOverallAttendance();
  }, []);

  // Fetch student's joined classes and their individual attendance
  useEffect(() => {
    const fetchJoinedClassesWithAttendance = async () => {
      try {
        const studentId = auth.currentUser.uid;
        const joinedClassesRef = collection(
          db,
          "students",
          studentId,
          "joinedClasses"
        );
        const snapshot = await getDocs(joinedClassesRef);

        const classList = [];

        for (const doc of snapshot.docs) {
          const classData = doc.data();
          const classId = classData.classId;
          const className = classData.className;

          // Fetch attendance for this class
          const attendanceRef = collection(
            db,
            "classes",
            classId,
            "attendance"
          );
          const attendanceSnapshot = await getDocs(attendanceRef);

          let classPresentCount = 0;
          let classAbsentCount = 0;

          attendanceSnapshot.forEach((attDoc) => {
            const attendance = attDoc.data().students || {};
            if (attendance[studentId] === true) {
              classPresentCount++;
            } else if (attendance[studentId] === false) {
              classAbsentCount++;
            }
          });

          console.log(classPresentCount, classAbsentCount);

          const totalClassDays = classPresentCount + classAbsentCount;
          const attendancePercentage =
            totalClassDays > 0
              ? ((classPresentCount / totalClassDays) * 100).toFixed(1)
              : "0";

          classList.push({
            classId,
            className,
            presentDays: classPresentCount,
            absentDays: classAbsentCount,
            attendancePercentage,
          });
        }

        setJoinedClasses(classList);
      } catch (error) {
        console.error(
          "Error fetching joined classes with attendance:",
          error.message
        );
      } finally {
        setLoading(false);
      }
    };

    fetchJoinedClassesWithAttendance();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/");
    } catch (error) {
      console.error("Error logging out:", error.message);
    }
  };

  const handleJoinClass = async (classId, className) => {
    try {
      const studentId = auth.currentUser.uid;

      const alreadyJoined = joinedClasses.some(
        (cls) => cls.className === className
      );
      if (alreadyJoined) return;

      // Add student to class's students subcollection
      await addDoc(collection(db, "classes", classId, "students"), {
        studentId,
        name: auth.currentUser.displayName,
      });

      // Add to student's joinedClasses collection
      await addDoc(collection(db, "students", studentId, "joinedClasses"), {
        classId,
        className,
      });

      // Update local state
      setJoinedClasses((prev) => [...prev, { classId, className }]);
      alert("Successfully joined the class!");
      setShowJoinModal(false);
    } catch (error) {
      console.error("Error joining class:", error.message);
    }
  };

  if (loading)
    return <div className="text-center mt-10 text-gray-500">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Navbar */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <h1 className="text-xl font-bold text-gray-900">
              Student Dashboard
            </h1>
            <button
              onClick={handleLogout}
              className="text-sm font-medium text-red-600 hover:text-red-800"
            >
              Logout
            </button>
          </div>
        </div>
      </nav>

      {/* Content */}
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Welcome */}
        <div className="mb-6 text-center">
          <h2 className="text-2xl font-semibold text-gray-800 mb-2">
            Welcome, {auth.currentUser.displayName}
          </h2>
          <button
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            onClick={() => setShowJoinModal(true)}
          >
            Join a Class
          </button>
          {showJoinModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
              <div className="bg-white w-full max-w-md p-6 rounded-lg shadow-lg">
                <h2 className="text-xl font-semibold mb-4">
                  Available Classes
                </h2>

                {availableClasses.length === 0 ? (
                  <p className="text-gray-500">
                    No classes available at the moment.
                  </p>
                ) : (
                  <ul className="space-y-4 max-h-80 overflow-y-auto">
                    {availableClasses.map((cls) => {
                      const alreadyJoined = joinedClasses.some(
                        (j) => j.className === cls.name
                      );

                      return (
                        <li key={cls.id} className="p-4 border rounded-lg">
                          <h3 className="text-md font-semibold">{cls.name}</h3>
                          <p className="text-sm text-gray-600">
                            {cls.description}
                          </p>
                          <button
                            disabled={alreadyJoined}
                            onClick={() => handleJoinClass(cls.id, cls.name)}
                            className={`mt-2 px-4 py-1 rounded text-sm ${
                              alreadyJoined
                                ? "bg-gray-300 text-gray-600 cursor-not-allowed"
                                : "bg-green-600 text-white hover:bg-green-700"
                            }`}
                          >
                            {alreadyJoined ? "Already Joined" : "Join"}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}

                <div className="mt-4 flex justify-end">
                  <button
                    onClick={() => setShowJoinModal(false)}
                    className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Joined Classes */}
        <div className="bg-white shadow rounded-lg p-6">
          <h4 className="text-lg font-medium text-gray-900 mb-4">
            Joined Classes
          </h4>
          {joinedClasses.length === 0 ? (
            <p className="text-gray-500">No classes joined yet.</p>
          ) : (
            <ul className="divide-y divide-gray-200">
              {joinedClasses.map((cls, index) => (
                <li key={index} className="py-4">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                    {/* Class Name */}
                    <div className="text-center sm:text-left w-full sm:w-1/3">
                      <p className="text-md font-semibold text-gray-800 break-words">
                        {cls.className}
                      </p>
                    </div>

                    {/* Attendance Stats */}
                    <div className="flex flex-wrap justify-center gap-2 sm:justify-end sm:flex-nowrap w-full sm:w-2/3">
                      <div className="flex-1 min-w-[90px] bg-green-100 px-3 py-2 rounded text-center">
                        <p className="text-xs text-green-700 font-semibold">
                          Present
                        </p>
                        <p className="text-lg font-bold text-green-800">
                          {cls.presentDays}
                        </p>
                      </div>
                      <div className="flex-1 min-w-[90px] bg-red-100 px-3 py-2 rounded text-center">
                        <p className="text-xs text-red-700 font-semibold">
                          Absent
                        </p>
                        <p className="text-lg font-bold text-red-800">
                          {cls.absentDays}
                        </p>
                      </div>
                      <div className="flex-1 min-w-[90px] bg-blue-100 px-3 py-2 rounded text-center">
                        <p className="text-xs text-blue-700 font-semibold">
                          Attendance
                        </p>
                        <p className="text-lg font-bold text-blue-800">
                          {cls.attendancePercentage}%
                        </p>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

export default StudentDashboard;
