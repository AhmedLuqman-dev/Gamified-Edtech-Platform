import { Navigate, Route, Routes } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import StudentAuthPage from "./pages/StudentAuthPage";
import ParentAuthPage from "./pages/ParentAuthPage";
import StudentDashboard from "./pages/StudentDashboard";
import StudentSubjectPage from "./pages/StudentSubjectPage";
import ParentDashboard from "./pages/ParentDashboard";
import TeacherDashboard from "./pages/TeacherDashboard";
import TeacherAuthPage from "./pages/TeacherAuthPage";
import { clearSession, getUser } from "./lib/auth";

const Guard = ({ user, role, children }) => {
  if (!user) return <Navigate to="/" replace />;
  if (role && user.role !== role) return <Navigate to="/" replace />;
  return children;
};

const TeacherGuard = ({ user, children }) => {
  if (!user) return <Navigate to="/" replace />;
  if (user.role !== "teacher") return <Navigate to="/" replace />;
  return children;
};

const App = () => {
  const user = getUser();

  const onLogout = () => {
    clearSession();
    window.location.href = "/";
  };

  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/auth/student" element={<StudentAuthPage />} />
      <Route path="/auth/parent" element={<ParentAuthPage />} />
      <Route path="/teacher" element={<TeacherAuthPage />} />
      <Route
        path="/student"
        element={
          <Guard user={user} role="student">
            <StudentDashboard user={user} onLogout={onLogout} />
          </Guard>
        }
      />
      <Route
        path="/student/subject/:slug"
        element={
          <Guard user={user} role="student">
            <StudentSubjectPage user={user} onLogout={onLogout} />
          </Guard>
        }
      />
      <Route
        path="/parent"
        element={
          <Guard user={user} role="parent">
            <ParentDashboard user={user} onLogout={onLogout} />
          </Guard>
        }
      />
      <Route
        path="/teacher/dashboard"
        element={
          <TeacherGuard user={user}>
            <TeacherDashboard onLogout={onLogout} />
          </TeacherGuard>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default App;
