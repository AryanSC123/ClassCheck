import { useState, useEffect } from "react";
import { signOut } from "firebase/auth";
import { auth, db } from "../firebase";
import { useNavigate } from "react-router-dom";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  doc,
  setDoc,
} from "firebase/firestore";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend);

function TeacherDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("markAttendance");
  const [classes, setClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState(null);
  const [students, setStudents] = useState([]);
  const [newClassName, setNewClassName] = useState("");
  const [newClassDescription, setNewClassDescription] = useState("");
  const [showCreateClassForm, setShowCreateClassForm] = useState(false);
  const [attendanceHistory, setAttendanceHistory] = useState([]);

  useEffect(() => {
    const fetchClasses = async () => {
      const q = query(
        collection(db, "classes"),
        where("teacherId", "==", auth.currentUser.uid)
      );
      const snapshot = await getDocs(q);
      const classList = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setClasses(classList);
    };
    fetchClasses();
  }, []);

  useEffect(() => {
    const fetchStudents = async () => {
      if (!selectedClassId) return;
      const studentRef = collection(db, "classes", selectedClassId, "students");
      const snapshot = await getDocs(studentRef);
      const studentList = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        present: false,
      }));
      setStudents(studentList);
    };

    const fetchAttendanceHistory = async () => {
      if (!selectedClassId) return;
      const attendanceRef = collection(
        db,
        "classes",
        selectedClassId,
        "attendance"
      );
      const snapshot = await getDocs(attendanceRef);
      const history = snapshot.docs.map((doc) => ({
        date: doc.id,
        ...doc.data(),
      }));
      setAttendanceHistory(history);
    };

    fetchStudents();
    fetchAttendanceHistory();
  }, [selectedClassId]);

  const handleToggleAttendance = (id) => {
    setStudents((prev) =>
      prev.map((student) =>
        student.id === id ? { ...student, present: !student.present } : student
      )
    );
  };

  const handleSaveAttendance = async () => {
    if (!selectedClassId) return;

    const dateKey = new Date().toISOString().split("T")[0];
    const classAttendanceRef = doc(
      db,
      "classes",
      selectedClassId,
      "attendance",
      dateKey
    );

    const classAttendanceData = {
      students: students.reduce((acc, student) => {
        console.log(student);
        acc[student.studentId] = student.present;
        return acc;
      }, {}),
    };

    await setDoc(classAttendanceRef, classAttendanceData);

    // Update individual student attendance records
    for (const student of students) {
      const studentAttendanceRef = doc(
        db,
        "students",
        student.id,
        "attendance",
        dateKey
      );
      await setDoc(studentAttendanceRef, {
        date: dateKey,
        status: student.present ? "Present" : "Absent",
        classId: selectedClassId, // Optionally store the class ID
      });
    }

    // Refresh history after saving (for teacher's view)
    const attendanceRefCollection = collection(
      db,
      "classes",
      selectedClassId,
      "attendance"
    );
    const snapshot = await getDocs(attendanceRefCollection);
    const history = snapshot.docs.map((doc) => ({
      date: doc.id,
      ...doc.data(),
    }));
    setAttendanceHistory(history);

    alert("Attendance saved successfully!");
  };

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/");
  };

  const handleCreateClass = async () => {
    if (!newClassName || !newClassDescription) {
      alert("Please fill in both the class name and description.");
      return;
    }

    try {
      const classData = {
        name: newClassName,
        description: newClassDescription,
        teacherId: auth.currentUser.uid,
      };

      await addDoc(collection(db, "classes"), classData);

      setNewClassName("");
      setNewClassDescription("");
      setShowCreateClassForm(false);

      // Refresh class list
      const q = query(
        collection(db, "classes"),
        where("teacherId", "==", auth.currentUser.uid)
      );
      const snapshot = await getDocs(q);
      const classList = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setClasses(classList);
      alert("Class created successfully!");
    } catch (error) {
      console.error("Error creating class: ", error);
      alert("Error creating class, please try again.");
    }
  };

  const attendanceChartData = {
    labels: attendanceHistory.map((record) => record.date),
    datasets: [
      {
        label: "Students Present",
        backgroundColor: "#3B82F6",
        data: attendanceHistory.map(
          (record) =>
            Object.values(record.students || {}).filter((val) => val).length
        ),
      },
    ],
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <h1 className="text-xl font-bold text-gray-900">
              Teacher Dashboard
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

      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {!selectedClassId ? (
          <>
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              My Classes
            </h3>
            <div className="space-y-4">
              {classes.map((cls) => (
                <div
                  key={cls.id}
                  className="bg-white p-4 rounded-lg shadow-md cursor-pointer hover:bg-gray-100"
                  onClick={() => setSelectedClassId(cls.id)}
                >
                  <h4 className="font-medium text-gray-900">{cls.name}</h4>
                  <p className="text-sm text-gray-500">{cls.description}</p>
                </div>
              ))}
            </div>
          </>
        ) : (
          <>
            <div className="mb-6">
              <button
                onClick={() => setSelectedClassId(null)}
                className="text-sm text-blue-600 hover:underline mb-4"
              >
                ← Back to Class List
              </button>
              <div className="flex flex-col sm:flex-row sm:space-x-4 space-y-2 sm:space-y-0 mb-4">
                <button
                  className={`${
                    activeTab === "markAttendance"
                      ? "text-blue-600 font-semibold"
                      : "text-gray-600"
                  }`}
                  onClick={() => setActiveTab("markAttendance")}
                >
                  Mark Attendance
                </button>
                <button
                  className={`${
                    activeTab === "viewRecords"
                      ? "text-blue-600 font-semibold"
                      : "text-gray-600"
                  }`}
                  onClick={() => setActiveTab("viewRecords")}
                >
                  View Attendance Records
                </button>
              </div>

              {activeTab === "markAttendance" && (
                <>
                  <ul className="divide-y divide-gray-200 bg-white shadow rounded-md">
                    {students.length > 0 ? (
                      students.map((student) => (
                        <li
                          key={student.id}
                          className="px-4 py-4 flex justify-between items-center"
                        >
                          <div className="text-sm font-medium text-gray-900 break-words">
                            {student.name}
                          </div>
                          <button
                            onClick={() => handleToggleAttendance(student.id)}
                            className={`${
                              student.present
                                ? "bg-green-100 text-green-800"
                                : "bg-red-100 text-red-800"
                            } px-3 py-1 rounded-full text-sm font-medium`}
                          >
                            {student.present ? "Present" : "Absent"}
                          </button>
                        </li>
                      ))
                    ) : (
                      <li className="px-4 py-4 text-gray-500">
                        No students in this class yet.
                      </li>
                    )}
                  </ul>
                  <button
                    onClick={handleSaveAttendance}
                    className="mt-4 w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Save Attendance
                  </button>
                </>
              )}

              {activeTab === "viewRecords" && (
                <div className="bg-white p-4 sm:p-6 rounded-lg shadow-md w-full overflow-x-auto">
                  <h4 className="text-lg font-semibold mb-4">
                    Attendance Over Time
                  </h4>
                  {attendanceHistory.length > 0 ? (
                    <Bar data={attendanceChartData} />
                  ) : (
                    <p className="text-sm text-gray-500">
                      No attendance records yet.
                    </p>
                  )}
                </div>
              )}
            </div>
          </>
        )}

        {/* Floating Create Button */}
        <div className="fixed bottom-4 right-4">
          <button
            onClick={() => setShowCreateClassForm(true)}
            className="w-16 h-16 rounded-full bg-blue-600 text-white flex items-center justify-center text-2xl shadow-lg hover:bg-blue-700"
          >
            +
          </button>
        </div>

        {/* Create Class Modal */}
        {showCreateClassForm && (
          <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md mx-4">
              <h3 className="text-xl font-medium mb-4">Create New Class</h3>
              <input
                type="text"
                placeholder="Class Name"
                value={newClassName}
                onChange={(e) => setNewClassName(e.target.value)}
                className="w-full px-4 py-2 border rounded-md mb-4"
              />
              <textarea
                placeholder="Class Description"
                value={newClassDescription}
                onChange={(e) => setNewClassDescription(e.target.value)}
                className="w-full px-4 py-2 border rounded-md mb-4"
                rows="4"
              />
              <div className="flex justify-between">
                <button
                  onClick={handleCreateClass}
                  className="w-full sm:w-32 py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Create
                </button>
                <button
                  onClick={() => setShowCreateClassForm(false)}
                  className="w-full sm:w-32 py-2 px-4 bg-gray-600 text-white rounded-md hover:bg-gray-700"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default TeacherDashboard;
