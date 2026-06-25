import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  onAuthStateChanged,
  User,
  isSignInWithEmailLink,
  signInWithEmailLink,
} from "firebase/auth";
import { getAdminRole } from "@/lib/api/admin.functions";

import { db, auth } from "@/lib/firebase";
import { Loader2 } from "lucide-react";
import { AdminRole } from "../types";

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
  const [agentId, setAgentId] = useState<string | null>(null);
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
              setAgentId(null);
            } else if (username === standardAdmin) {
              setRole("admin");
              setDepartment(null);
              setSquadId(null);
              setAgentId(null);
            } else {
              try {
                const token = await currentUser.getIdToken();
                const data = await getAdminRole({ data: { adminToken: token } });
                
                if (data) {
                  if (data.status === "suspended") {
                    await auth.signOut();
                    setErrorMsg("Your account has been suspended by the administrator.");
                    setRole(null);
                    return;
                  }
                  setRole((data.role as AdminRole) || "department_admin");
                  setDepartment(data.department || null);
                  setSquadId(data.squad_id || null);
                  setAgentId(data.agent_id || null);
                } else {
                  setRole("department_admin");
                  setDepartment(null);
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
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600 mb-6">{errorMsg}</p>
          <button
            onClick={() => window.location.reload()}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!user || !role) {
    return <AdminLogin />;
  }

  if (role === "department_admin" || role === "field_worker") {
    switch (department) {
      case "Electrical":
        return <ElectricalDashboard />;
      case "Sanitation":
        return <SanitationDashboard />;
      case "Water Board":
        return <WaterDashboard />;
      case "Public Works":
        return <PublicWorksDashboard />;
      case "Parks & Rec":
        return <ParksDashboard />;
      default:
        return <div className="p-8 text-red-600">Error: Unknown Department "{department}"</div>;
    }
  }

  return <AdminDashboard role={role} department={department} squadId={squadId} />;
}
