import { Navigate, Route, Routes } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import StudentAuthPage from "./pages/StudentAuthPage";
import ParentAuthPage from "./pages/ParentAuthPage";
import StudentDashboard from "./pages/StudentDashboard";
import ParentDashboard from "./pages/ParentDashboard";
import AdminQuestMapPage from "./pages/AdminQuestMapPage";
import AdminLoginPage from "./pages/AdminLoginPage";
import { clearSession, getUser } from "./lib/auth";

const Guard = ({ user, role, children }) => {
  if (!user) return <Navigate to="/" replace />;
  if (role && user.role !== role) return <Navigate to="/" replace />;
  return children;
};

const AdminGuard = ({ user, children }) => {
  if (!user) return <Navigate to="/" replace />;
  if (user.role !== "admin") return <Navigate to="/" replace />;
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
      <Route path="/admin" element={<AdminLoginPage />} />
      <Route
        path="/student"
        element={
          <Guard user={user} role="student">
            <StudentDashboard user={user} onLogout={onLogout} />
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
        path="/admin/quest-map"
        element={
          <AdminGuard user={user}>
            <AdminQuestMapPage onLogout={onLogout} />
          </AdminGuard>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default App;
