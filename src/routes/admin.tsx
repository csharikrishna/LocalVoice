import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  onAuthStateChanged,
  User,
  isSignInWithEmailLink,
  signInWithEmailLink,
  signOut as firebaseSignOut,
} from "firebase/auth";
import { getAdminRole } from "@/lib/api/admin.functions";
import { getAdminComplaints } from "@/lib/api/queries.functions";

import { auth } from "@/lib/firebase";
import { AlertTriangle, Loader2, RefreshCw } from "lucide-react";
import { AdminRole, Complaint } from "../types";

import { AdminLogin } from "../components/admin/AdminLogin";
import { AdminDashboard } from "../components/admin/AdminDashboard";
import ElectricalDashboard from "../departments/electrical/ElectricalDashboard";
import SanitationDashboard from "../departments/sanitation/SanitationDashboard";
import WaterDashboard from "../departments/water/WaterDashboard";
import PublicWorksDashboard from "../departments/public_works/PublicWorksDashboard";
import ParksDashboard from "../departments/parks/ParksDashboard";

export const Route = createFileRoute("/admin")({
  component: AdminRouteWrapper,
});

function AdminRouteWrapper() {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<AdminRole | null>(null);
  const [department, setDepartment] = useState<string | null>(null);
  const [squadId, setSquadId] = useState<string | null>(null);
  const [initialComplaints, setInitialComplaints] = useState<Complaint[] | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    let unsubscribe: () => void;

    const initializeAuth = async () => {
      try {
        if (isSignInWithEmailLink(auth, window.location.href)) {
          const email =
            window.localStorage.getItem("emailForSignIn") || import.meta.env.VITE_ADMIN_EMAIL;
          if (email) {
            await signInWithEmailLink(auth, email, window.location.href);
            window.localStorage.removeItem("emailForSignIn");
            window.history.replaceState(null, "", window.location.pathname);
          }
        }
      } catch (err: any) {
        console.error("Magic link sign-in error:", err);
        setErrorMsg(err.message);
      } finally {
        unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
          setUser(currentUser);
          if (currentUser?.email) {
            const username = currentUser.email.split("@")[0];
            const superAdmin = import.meta.env.VITE_ADMIN_USERNAME;
            const standardAdmin = import.meta.env.VITE_STANDARD_ADMIN_USERNAME;

            if (username === superAdmin) {
              setRole("superadmin");
              setDepartment(null);
              setSquadId(null);
              try {
                const token = await currentUser.getIdToken();
                const complaints = await getAdminComplaints({ data: { adminToken: token } });
                setInitialComplaints(complaints as Complaint[]);
              } catch (e) {
                console.error("Error fetching initial complaints:", e);
              }
            } else if (username === standardAdmin) {
              setRole("admin");
              setDepartment(null);
              setSquadId(null);
              try {
                const token = await currentUser.getIdToken();
                const complaints = await getAdminComplaints({ data: { adminToken: token } });
                setInitialComplaints(complaints as Complaint[]);
              } catch (e) {
                console.error("Error fetching initial complaints:", e);
              }
            } else {
              try {
                const token = await currentUser.getIdToken();

                // Optimize client waterfall by fetching complaints concurrently with role
                const [roleResult, complaintsResult] = await Promise.allSettled([
                  getAdminRole({ data: { adminToken: token } }),
                  getAdminComplaints({ data: { adminToken: token } }),
                ]);

                if (roleResult.status === "fulfilled" && roleResult.value) {
                  const data = roleResult.value;
                  if (data.status === "suspended") {
                    await firebaseSignOut(auth);
                    setErrorMsg("Your account has been suspended by the administrator.");
                    setRole(null);
                    return;
                  }
                  setRole((data.role as AdminRole) || "department_admin");
                  setDepartment(data.department || null);
                  setSquadId(data.squad_id || null);
                } else {
                  setRole("department_admin");
                  setDepartment(null);
                }

                if (complaintsResult.status === "fulfilled") {
                  setInitialComplaints(complaintsResult.value as Complaint[]);
                }
              } catch (err) {
                console.error("Error fetching role:", err);
                setRole("department_admin");
              }
            }
          } else {
            setRole(null);
          }
          setLoading(false);
        });
      }
    };

    initializeAuth();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="animate-spin text-blue-600" size={40} />
          <p className="text-gray-500 font-medium">Verifying credentials...</p>
        </div>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center border border-gray-100">
          <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle size={32} />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600 mb-6">{errorMsg}</p>
          <button
            onClick={() => window.location.reload()}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <RefreshCw size={16} /> Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!user || !role) {
    return <AdminLogin />;
  }

  // Department-specific dashboards pass the actual user role through
  if (role === "department_admin" || role === "field_worker") {
    switch (department) {
      case "Electrical":
        return <ElectricalDashboard role={role} initialComplaints={initialComplaints} />;
      case "Sanitation":
        return <SanitationDashboard role={role} initialComplaints={initialComplaints} />;
      case "Water Board":
        return <WaterDashboard role={role} initialComplaints={initialComplaints} />;
      case "Public Works":
        return <PublicWorksDashboard role={role} initialComplaints={initialComplaints} />;
      case "Parks & Rec":
        return <ParksDashboard role={role} initialComplaints={initialComplaints} />;
      default:
        return (
          <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
            <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center border border-gray-100">
              <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle size={32} />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Department Not Found</h2>
              <p className="text-gray-600 mb-2">
                Your account is assigned to department <strong>"{department || "None"}"</strong>,
                which doesn't have a dashboard configured.
              </p>
              <p className="text-sm text-gray-500 mb-6">
                Please contact your system administrator to assign you to a valid department.
              </p>
              <button
                onClick={() => firebaseSignOut(auth)}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-medium py-2.5 rounded-lg transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        );
    }
  }

  return (
    <AdminDashboard
      role={role}
      department={department}
      squadId={squadId}
      initialComplaints={initialComplaints}
    />
  );
}
