import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useMemo, useCallback, useRef, memo } from "react";
import { collection, query, orderBy, updateDoc, doc, getDocs, getDoc, deleteDoc } from "firebase/firestore";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut, User, isSignInWithEmailLink, signInWithEmailLink, sendSignInLinkToEmail } from "firebase/auth";
import { db, auth } from "@/lib/firebase";
import { MapContainer, TileLayer, Marker, Popup, useMap, CircleMarker } from "react-leaflet";
import { useGeolocation } from "@/hooks/useGeolocation";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { Loader2, MapPin, Lock, LogOut, Download, ArrowUpDown, Search, Filter, X, AlertCircle, Wrench, CheckCircle2, BarChart3, RefreshCw, ChevronDown, Check, Navigation, Trash2, Edit3, Save, Flame } from "lucide-react";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  SortingState,
  useReactTable,
} from "@tanstack/react-table";

// Fix missing marker icons in leaflet
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

export const Route = createFileRoute("/admin")({
  component: AdminRouteWrapper,
});

interface Complaint {
  id: string;
  token?: string;
  category: string;
  description: string;
  location: string;
  photoURL?: string;
  status: string;
  timestamp: any;
  coordinates?: { lat: number; lng: number };
  department?: string;
  upvotes?: number;
}

// ============================================================
// Auth Wrapper
// ============================================================

function AdminRouteWrapper() {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<"super_admin" | "admin" | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    let unsubscribe: () => void;

    const initializeAuth = async () => {
      try {
        if (isSignInWithEmailLink(auth, window.location.href)) {
          const email = window.localStorage.getItem("emailForSignIn") || import.meta.env.VITE_ADMIN_EMAIL;
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
            const username = currentUser.email.split('@')[0];
            const superAdmin = import.meta.env.VITE_ADMIN_USERNAME;
            const standardAdmin = import.meta.env.VITE_STANDARD_ADMIN_USERNAME;
            
            if (username === superAdmin) {
              setRole("super_admin");
            } else if (username === standardAdmin) {
              setRole("admin");
            } else {
              // Fallback to Firestore for dynamically added admins if they don't match .env
              try {
                const docRef = doc(db, "admins", currentUser.email);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists() && docSnap.data().role === "super_admin") {
                  setRole("super_admin");
                } else {
                  setRole("admin");
                }
              } catch (err) {
                console.error("Error fetching role:", err);
                setRole("admin");
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
        <Loader2 className="animate-spin text-blue-600" size={32} />
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 flex-col gap-4">
        <div className="text-red-600 p-4 bg-red-50 rounded-lg">Error: {errorMsg}</div>
        <button onClick={() => window.location.reload()} className="text-blue-600 underline">Reload</button>
      </div>
    );
  }

  if (!user || !role) {
    return <AdminLogin />;
  }

  return <AdminDashboard role={role} />;
}

// ============================================================
// Login Component
// ============================================================

function AdminLogin() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [linkSent, setLinkSent] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    
    const adminEmail = `${username}@civicscan.admin`;
    
    try {
      await signInWithEmailAndPassword(auth, adminEmail, password);
    } catch (err: any) {
      // If the account doesn't exist, but it matches our .env credentials precisely, auto-create it securely.
      if (err.code === "auth/invalid-credential" || err.code === "auth/user-not-found") {
        if (
          (username === import.meta.env.VITE_ADMIN_USERNAME && password === import.meta.env.VITE_ADMIN_PASSWORD) ||
          (username === import.meta.env.VITE_STANDARD_ADMIN_USERNAME && password === import.meta.env.VITE_STANDARD_ADMIN_PASSWORD)
        ) {
          try {
            await createUserWithEmailAndPassword(auth, adminEmail, password);
            return; // Successful auto-creation and login
          } catch (createErr: any) {
            setError("Failed to initialize admin account: " + createErr.message);
          }
        } else {
          setError("Invalid credentials. Please check your username and password.");
        }
      } else {
        setError("Invalid credentials. Please check your username and password.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleMagicLink = async () => {
    setError("");
    setLoading(true);
    const email = import.meta.env.VITE_ADMIN_EMAIL;
    
    if (!email) {
      setError("Admin email not configured in .env.local");
      setLoading(false);
      return;
    }

    try {
      const actionCodeSettings = {
        url: window.location.origin + "/admin",
        handleCodeInApp: true,
      };
      await sendSignInLinkToEmail(auth, email, actionCodeSettings);
      window.localStorage.setItem("emailForSignIn", email);
      setLinkSent(true);
    } catch (err: any) {
      setError("Failed to send magic link: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[color:var(--bg)] px-4">
      <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-xl border border-gray-100">
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4 text-blue-600">
            <Lock size={24} />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Login</h1>
          <p className="text-sm text-gray-500 mt-1 text-center">
            Sign in with your default admin credentials.
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              placeholder="admin_user"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : "Sign In"}
          </button>
        </form>

        <div className="mt-6 flex items-center justify-between">
          <span className="border-b border-gray-200 w-1/5 lg:w-1/4"></span>
          <span className="text-xs text-center text-gray-500 uppercase font-semibold tracking-wider">Or</span>
          <span className="border-b border-gray-200 w-1/5 lg:w-1/4"></span>
        </div>

        <div className="mt-6">
          {linkSent ? (
            <div className="text-sm text-green-700 bg-green-50 p-4 rounded-lg text-center border border-green-200">
              <span className="block font-semibold mb-1">Check your inbox!</span>
              We've sent a magic link to your admin email.
            </div>
          ) : (
            <button
              type="button"
              onClick={handleMagicLink}
              disabled={loading}
              className="w-full bg-white border-2 border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50 font-medium py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              Send Magic Link
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Isolated Map Component (memo prevents re-render on table updates)
// ============================================================

const DEFAULT_CENTER: [number, number] = [20.5937, 78.9629];

function MapFlyTo({ center }: { center: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.flyTo(center, 16, { duration: 1.5 });
    }
  }, [center, map]);
  return null;
}

function HeatmapLayer({ points }: { points: [number, number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (!map || !points || points.length === 0) return;
    
    let heatLayer: any;
    
    const initHeatmap = async () => {
      (window as any).L = L;
      await import("leaflet.heat");
      heatLayer = (L as any).heatLayer(points, {
        radius: 25,
        blur: 15,
        maxZoom: 17,
      }).addTo(map);
    };
    
    initHeatmap();

    return () => {
      if (heatLayer) map.removeLayer(heatLayer);
    };
  }, [map, points]);
  return null;
}

interface AdminMapProps {
  complaints: Complaint[];
  focusedLocation: [number, number] | null;
  onImageClick: (url: string) => void;
  showHeatmap: boolean;
  adminLocation?: [number, number] | null;
  onLocateMe?: () => void;
  isLocating?: boolean;
}

const AdminMap = memo(function AdminMap({ complaints, focusedLocation, onImageClick, showHeatmap, adminLocation, onLocateMe, isLocating }: AdminMapProps) {
  const complaintsWithCoords = complaints.filter(c => c.coordinates);
  const center = focusedLocation || (complaintsWithCoords.length > 0
    ? [complaintsWithCoords[0].coordinates!.lat, complaintsWithCoords[0].coordinates!.lng] as [number, number]
    : DEFAULT_CENTER);
    
  const heatPoints = useMemo(() => complaintsWithCoords.map(c => [c.coordinates!.lat, c.coordinates!.lng, 1] as [number, number, number]), [complaintsWithCoords]);

  return (
    <MapContainer center={center} zoom={12} scrollWheelZoom={true} className="w-full h-full absolute inset-0 z-0">
      <MapFlyTo center={focusedLocation} />
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {showHeatmap ? (
        <HeatmapLayer points={heatPoints} />
      ) : (
        complaintsWithCoords.map((c) => (
          <Marker
            key={c.id}
            position={[c.coordinates!.lat, c.coordinates!.lng]}
          >
          <Popup className="rounded-lg">
            <div className="p-1 min-w-[200px]">
              <div className="flex justify-between items-center mb-2">
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                  {c.category}
                </span>
                <span className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded">{c.token || "N/A"}</span>
              </div>
              <h3 className="font-semibold text-sm mb-1">{c.location}</h3>
              <p className="text-xs text-gray-600 mb-2 line-clamp-2">{c.description}</p>
              {c.photoURL && (
                <button onClick={() => onImageClick(c.photoURL!)} className="w-full h-24 mt-2 block p-0 border-0 bg-transparent cursor-zoom-in">
                   <img src={c.photoURL} alt="Issue" className="w-full h-full object-cover rounded border border-gray-100" />
                </button>
              )}
            </div>
          </Popup>
        </Marker>
        ))
      )}

      {adminLocation && (
        <CircleMarker center={adminLocation} radius={8} pathOptions={{ color: 'white', fillColor: '#3b82f6', fillOpacity: 1, weight: 2 }}>
          <Popup>Your Location</Popup>
        </CircleMarker>
      )}

      {onLocateMe && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onLocateMe();
          }}
          disabled={isLocating}
          className="absolute bottom-4 right-4 z-[400] bg-white p-2.5 rounded-xl shadow-md border border-gray-100 text-gray-700 hover:text-blue-600 transition-colors disabled:opacity-50"
          title="Find my location"
        >
          {isLocating ? <Loader2 size={20} className="animate-spin" /> : <MapPin size={20} />}
        </button>
      )}
    </MapContainer>
  );
});

// ============================================================
// Inline Status/Department Select (uncontrolled to avoid re-render issues)
// ============================================================

function StatusSelect({ id, currentValue, onChange }: { id: string; currentValue: string; onChange: (id: string, val: string) => void }) {
  const selectRef = useRef<HTMLSelectElement>(null);
  
  const handleChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    e.stopPropagation();
    onChange(id, e.target.value);
  }, [id, onChange]);

  const val = currentValue || "open";
  const color = val === "open" ? "#dc2626" : val === "working" ? "#d97706" : "#16a34a";
  const bg = val === "open" ? "#fef2f2" : val === "working" ? "#fffbeb" : "#f0fdf4";

  return (
    <select
      ref={selectRef}
      defaultValue={val}
      key={`${id}-${val}`}
      onChange={handleChange}
      onClick={(e) => e.stopPropagation()}
      className="text-xs font-bold border border-gray-200 rounded-md px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500/50 cursor-pointer transition-all shadow-sm appearance-none pr-8"
      style={{
        color,
        backgroundColor: bg,
        backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
        backgroundPosition: "right 0.25rem center",
        backgroundRepeat: "no-repeat",
        backgroundSize: "1.25em 1.25em",
      }}
    >
      <option value="open">Open</option>
      <option value="working">In Progress</option>
      <option value="closed">Closed</option>
    </select>
  );
}

function DepartmentSelect({ id, currentValue, onChange }: { id: string; currentValue: string; onChange: (id: string, val: string) => void }) {
  const handleChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    e.stopPropagation();
    onChange(id, e.target.value);
  }, [id, onChange]);

  const val = currentValue || "";

  return (
    <select
      defaultValue={val}
      key={`${id}-${val}`}
      onChange={handleChange}
      onClick={(e) => e.stopPropagation()}
      className="text-xs font-semibold text-gray-700 border border-gray-200 rounded-md px-2.5 py-1.5 bg-gray-50 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50 cursor-pointer transition-all shadow-sm appearance-none pr-8"
      style={{
        backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
        backgroundPosition: "right 0.25rem center",
        backgroundRepeat: "no-repeat",
        backgroundSize: "1.25em 1.25em",
      }}
    >
      <option value="">Unassigned</option>
      <option value="Sanitation">Sanitation</option>
      <option value="Electrical">Electrical</option>
      <option value="Water Board">Water Board</option>
      <option value="Public Works">Public Works</option>
      <option value="Parks">Parks &amp; Rec</option>
    </select>
  );
}

// ============================================================
// Custom Filter Dropdown
// ============================================================

function FilterDropdown({ 
  value, 
  onChange, 
  options, 
  label 
}: { 
  value: string; 
  onChange: (v: string) => void; 
  options: { value: string; label: string }[];
  label: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedOption = options.find(o => o.value === value) || options[0];

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center justify-between min-w-[160px] px-3 py-2 text-sm bg-white border rounded-lg transition-all ${
          isOpen ? "border-blue-500 ring-2 ring-blue-500/20" : "border-gray-200 hover:border-gray-300"
        }`}
        aria-label={label}
        aria-expanded={isOpen}
      >
        <span className="font-medium text-gray-700">{selectedOption.label}</span>
        <ChevronDown size={14} className={`text-gray-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full min-w-[160px] mt-1 bg-white border border-gray-100 rounded-lg shadow-xl shadow-blue-900/5 py-1 animate-in fade-in slide-in-from-top-2 duration-200">
          {options.map((option) => {
            const isSelected = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                className={`w-full flex items-center justify-between px-3 py-2 text-sm transition-colors ${
                  isSelected ? "bg-blue-50 text-blue-700 font-medium" : "text-gray-700 hover:bg-gray-50"
                }`}
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
              >
                <span>{option.label}</span>
                {isSelected && <Check size={14} className="text-blue-600" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ============================================================
// Admin Dashboard
// ============================================================

const columnHelper = createColumnHelper<Complaint>();

function AdminDashboard({ role }: { role: "super_admin" | "admin" }) {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [focusedLocation, setFocusedLocation] = useState<[number, number] | null>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout>>();

  const [adminLocation, setAdminLocation] = useState<[number, number] | null>(null);
  const { detectLocation, isDetecting } = useGeolocation({
    onSuccess: (coords) => {
      setAdminLocation([coords.lat, coords.lng]);
      setFocusedLocation([coords.lat, coords.lng]);
    },
    onError: (msg) => setToast({ message: msg, type: "error" })
  });

  // Super Admin states
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingDescription, setEditingDescription] = useState<string>("");

  // ── Fetch data (no real-time listener to avoid re-render storms) ──
  const fetchComplaints = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    try {
      const q = query(collection(db, "complaints"), orderBy("timestamp", "desc"));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Complaint));
      setComplaints(data);
    } catch (error) {
      console.error("Error fetching complaints:", error);
      setToast({ message: "Failed to load complaints", type: "error" });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchComplaints();
  }, [fetchComplaints]);

  // ── Debounced search ──
  const handleSearchChange = useCallback((value: string) => {
    setSearchInput(value);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      setGlobalFilter(value);
    }, 300);
  }, []);

  useEffect(() => {
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, []);

  // ── Toast auto-dismiss ──
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(timer);
  }, [toast]);

  // ── Memoised derived data ──
  const filteredComplaints = useMemo(() => {
    return complaints.filter(c => {
      if (statusFilter !== "all" && c.status !== statusFilter) return false;
      if (categoryFilter !== "all" && c.category !== categoryFilter) return false;
      if (globalFilter) {
        const search = globalFilter.toLowerCase();
        return (
          (c.token || "").toLowerCase().includes(search) ||
          c.description.toLowerCase().includes(search) ||
          c.location.toLowerCase().includes(search) ||
          c.category.toLowerCase().includes(search)
        );
      }
      return true;
    });
  }, [complaints, statusFilter, categoryFilter, globalFilter]);

  const stats = useMemo(() => ({
    total: complaints.length,
    open: complaints.filter(c => c.status === "open").length,
    working: complaints.filter(c => c.status === "working").length,
    closed: complaints.filter(c => c.status === "closed").length,
  }), [complaints]);

  const uniqueCategories = useMemo(
    () => [...new Set(complaints.map(c => c.category))].sort(),
    [complaints]
  );

  // ── Handlers (update local state immediately, then Firestore) ──
  const handleStatusChange = useCallback(async (id: string, newStatus: string) => {
    // Optimistic local update
    setComplaints(prev => prev.map(c => c.id === id ? { ...c, status: newStatus } : c));
    try {
      await updateDoc(doc(db, "complaints", id), { status: newStatus });
      setToast({ message: `Status updated to "${newStatus === "open" ? "Open" : newStatus === "working" ? "In Progress" : "Closed"}"`, type: "success" });
    } catch (err) {
      console.error("Failed to update status", err);
      setToast({ message: "Failed to update status. Please try again.", type: "error" });
      // Revert on failure
      fetchComplaints();
    }
  }, [fetchComplaints]);

  const handleDepartmentChange = useCallback(async (id: string, newDepartment: string) => {
    setComplaints(prev => prev.map(c => c.id === id ? { ...c, department: newDepartment } : c));
    try {
      await updateDoc(doc(db, "complaints", id), { department: newDepartment });
      setToast({ message: `Department updated to "${newDepartment || "Unassigned"}"`, type: "success" });
    } catch (err) {
      console.error("Failed to update department", err);
      setToast({ message: "Failed to update department. Please try again.", type: "error" });
      fetchComplaints();
    }
  }, [fetchComplaints]);

  // ── Super Admin Actions ──
  const handleEditDescription = useCallback(async (id: string, newDesc: string) => {
    try {
      await updateDoc(doc(db, "complaints", id), { description: newDesc });
      setComplaints(prev => prev.map(c => c.id === id ? { ...c, description: newDesc } : c));
      setToast({ message: "Description updated", type: "success" });
      setEditingId(null);
    } catch (err) {
      console.error("Failed to update description", err);
      setToast({ message: "Failed to update description", type: "error" });
    }
  }, []);

  const handleDelete = useCallback(async (id: string) => {
    if (!window.confirm("Are you sure you want to permanently delete this issue?")) return;
    try {
      await deleteDoc(doc(db, "complaints", id));
      setComplaints(prev => prev.filter(c => c.id !== id));
      setToast({ message: "Issue deleted", type: "success" });
    } catch (err) {
      console.error("Failed to delete issue", err);
      setToast({ message: "Failed to delete issue", type: "error" });
    }
  }, []);

  const handleExport = useCallback(async () => {
    try {
      const ExcelJS = (await import("exceljs")).default;
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Complaints");

      worksheet.columns = [
        { header: 'Token', key: 'token', width: 15 },
        { header: 'Category', key: 'category', width: 20 },
        { header: 'Department', key: 'department', width: 20 },
        { header: 'Status', key: 'status', width: 15 },
        { header: 'Location', key: 'location', width: 40 },
        { header: 'Map Link', key: 'map_link', width: 20 },
        { header: 'Description', key: 'description', width: 50 },
        { header: 'Date', key: 'date', width: 25 },
        { header: 'Upvotes', key: 'upvotes', width: 15 },
        { header: 'Photo', key: 'photo', width: 30 }
      ];

      // Bold headers and light gray background
      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF3F4F6' }
      };

      filteredComplaints.forEach(c => {
        const row = worksheet.addRow({
          token: c.token || "N/A",
          category: c.category,
          department: c.department || "Unassigned",
          status: c.status.toUpperCase(),
          location: c.location,
          map_link: c.coordinates ? { text: 'Get Directions', hyperlink: `https://www.google.com/maps/dir/?api=1&destination=${c.coordinates.lat},${c.coordinates.lng}` } : 'N/A',
          description: c.description,
          date: c.timestamp?.toDate ? new Date(c.timestamp.toDate()).toLocaleString() : "",
          upvotes: c.upvotes || 0,
          photo: c.photoURL ? { formula: `IMAGE("${c.photoURL}")`, result: 'Photo Link' } : 'No Photo'
        });

        // Color code status column
        const statusCell = row.getCell('status');
        if (c.status === 'open') {
          statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } }; // red-100
          statusCell.font = { color: { argb: 'FF991B1B' }, bold: true }; // red-800
        } else if (c.status === 'working') {
          statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } }; // amber-100
          statusCell.font = { color: { argb: 'FF92400E' }, bold: true }; // amber-800
        } else if (c.status === 'closed') {
          statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCFCE7' } }; // green-100
          statusCell.font = { color: { argb: 'FF166534' }, bold: true }; // green-800
        }
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `localvoice_complaints_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export failed:", err);
      setToast({ message: "Failed to export Excel file.", type: "error" });
    }
  }, [filteredComplaints]);

  const handleImageClick = useCallback((url: string) => {
    setLightboxImage(url);
  }, []);

  // ── Table columns ──
  const columns = useMemo(() => [
    columnHelper.accessor("token", {
      header: "Token",
      cell: info => <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">{info.getValue() || "N/A"}</span>,
    }),
    columnHelper.accessor("photoURL", {
      header: "Photo",
      enableSorting: false,
      cell: info => {
        const url = info.getValue();
        if (!url) return <span className="text-gray-400 text-xs italic">None</span>;
        return (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); handleImageClick(url); }}
            className="block w-10 h-10 rounded overflow-hidden border border-gray-200 cursor-pointer"
          >
            <img src={url} alt="Complaint" className="w-full h-full object-cover hover:scale-110 transition-transform" loading="lazy" />
          </button>
        );
      },
    }),
    columnHelper.accessor("category", {
      header: "Category",
      cell: info => (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
          {info.getValue()}
        </span>
      ),
    }),
    columnHelper.accessor("status", {
      header: "Status",
      cell: info => (
        <StatusSelect
          id={info.row.original.id}
          currentValue={info.getValue()}
          onChange={handleStatusChange}
        />
      ),
    }),
    columnHelper.accessor("department", {
      header: "Department",
      cell: info => (
        <DepartmentSelect
          id={info.row.original.id}
          currentValue={info.getValue() || ""}
          onChange={handleDepartmentChange}
        />
      ),
    }),
    columnHelper.accessor("location", {
      header: "Location",
      cell: info => {
        const coords = info.row.original.coordinates;
        const locationText = info.getValue();
        return (
          <div className="flex items-center gap-2 min-w-[200px] group">
            <MapPin size={14} className="text-gray-400 shrink-0" />
            <span className="text-sm truncate max-w-[220px]" title={locationText}>{locationText}</span>
            {coords && (
              <a 
                href={`https://www.google.com/maps/dir/?api=1&destination=${coords.lat},${coords.lng}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="ml-auto opacity-100 md:opacity-0 group-hover:opacity-100 p-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 hover:text-blue-700 rounded transition-all flex items-center justify-center shrink-0"
                title="Get Directions in Google Maps"
                aria-label="Get Directions"
              >
                <Navigation size={14} />
              </a>
            )}
          </div>
        );
      },
    }),
    columnHelper.accessor("description", {
      header: "Description",
      cell: info => {
        if (editingId === info.row.original.id) {
          return (
            <div className="flex items-center gap-2 min-w-[250px]" onClick={e => e.stopPropagation()}>
              <input
                autoFocus
                value={editingDescription}
                onChange={e => setEditingDescription(e.target.value)}
                className="flex-1 text-sm border border-blue-400 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button 
                onClick={() => handleEditDescription(info.row.original.id, editingDescription)}
                className="p-1 text-green-600 hover:bg-green-50 rounded"
                title="Save"
              >
                <Save size={16} />
              </button>
              <button 
                onClick={() => setEditingId(null)}
                className="p-1 text-gray-500 hover:bg-gray-100 rounded"
                title="Cancel"
              >
                <X size={16} />
              </button>
            </div>
          );
        }

        return (
          <div className="text-sm truncate max-w-[250px] group relative flex items-center justify-between">
            <span title={info.getValue()}>{info.getValue()}</span>
            {role === "super_admin" && (
              <button 
                onClick={(e) => { 
                  e.stopPropagation(); 
                  setEditingId(info.row.original.id); 
                  setEditingDescription(info.getValue()); 
                }} 
                className="opacity-0 group-hover:opacity-100 p-1 text-blue-600 hover:bg-blue-50 rounded transition-all shrink-0 ml-2"
                title="Edit Description"
              >
                <Edit3 size={14} />
              </button>
            )}
          </div>
        );
      },
    }),
    columnHelper.accessor("timestamp", {
      header: "Date",
      cell: info => {
        const ts = info.getValue();
        return <span className="text-sm text-gray-500 whitespace-nowrap">{ts?.toDate ? new Date(ts.toDate()).toLocaleString() : ''}</span>;
      },
    }),
    ...(role === "super_admin" ? [
      columnHelper.display({
        id: "actions",
        header: "Actions",
        cell: info => (
          <button 
            onClick={(e) => { e.stopPropagation(); handleDelete(info.row.original.id); }} 
            className="text-red-500 hover:bg-red-50 p-1.5 rounded transition-colors"
            title="Delete Issue"
          >
            <Trash2 size={16} />
          </button>
        )
      })
    ] : [])
  ], [handleStatusChange, handleDepartmentChange, handleImageClick, editingId, editingDescription, role, handleEditDescription, handleDelete]);

  // ── React Table instance ──
  const table = useReactTable({
    data: filteredComplaints,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getRowId: (row) => row.id,  // CRITICAL: stable row identity
    initialState: {
      pagination: { pageSize: 15 },
    },
  });

  // ── Map complaints (memoized separately) ──
  const mapComplaints = useMemo(
    () => filteredComplaints.filter(c => c.coordinates),
    [filteredComplaints]
  );

  return (
    <div className="min-h-screen pt-20 px-4 max-w-7xl mx-auto flex flex-col pb-12">
      {/* Toast notification */}
      {toast && (
        <div className={`fixed top-4 right-4 z-[9999] px-4 py-3 rounded-lg shadow-lg border text-sm font-medium flex items-center gap-2 transition-all animate-in fade-in slide-in-from-top-2 duration-300 ${
          toast.type === "success"
            ? "bg-green-50 text-green-800 border-green-200"
            : "bg-red-50 text-red-800 border-red-200"
        }`}>
          {toast.type === "success" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          {toast.message}
          <button onClick={() => setToast(null)} className="ml-2 opacity-60 hover:opacity-100">
            <X size={14} />
          </button>
        </div>
      )}

      <div className="mb-6 flex justify-between items-end flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2 text-[color:var(--text-primary)]">Admin Dashboard</h1>
          <p className="text-[color:var(--text-secondary)]">Civic issue management and analytics.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchComplaints(true)}
            disabled={refreshing}
            className="flex items-center gap-2 text-sm text-gray-600 bg-white border border-gray-200 px-4 py-2 rounded-lg transition-colors shadow-sm hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
            {refreshing ? "Refreshing…" : "Refresh"}
          </button>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 text-sm text-white bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg transition-colors shadow-sm font-medium"
          >
            <Download size={16} /> Export to Excel
          </button>
          <button
            onClick={() => signOut(auth)}
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 bg-white border border-gray-200 px-4 py-2 rounded-lg transition-colors shadow-sm"
          >
            <LogOut size={16} /> Sign Out
          </button>
        </div>
      </div>

      {/* Analytics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2 text-gray-500 text-sm font-medium mb-1">
            <BarChart3 size={16} /> Total Reports
          </div>
          <div className="text-3xl font-bold text-gray-900">{stats.total}</div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-red-100 shadow-sm">
          <div className="flex items-center gap-2 text-red-500 text-sm font-medium mb-1">
            <AlertCircle size={16} /> Open
          </div>
          <div className="text-3xl font-bold text-red-600">{stats.open}</div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-amber-100 shadow-sm">
          <div className="flex items-center gap-2 text-amber-500 text-sm font-medium mb-1">
            <Wrench size={16} /> In Progress
          </div>
          <div className="text-3xl font-bold text-amber-600">{stats.working}</div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-green-100 shadow-sm">
          <div className="flex items-center gap-2 text-green-500 text-sm font-medium mb-1">
            <CheckCircle2 size={16} /> Resolved
          </div>
          <div className="text-3xl font-bold text-green-600">{stats.closed}</div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm mb-6 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-sm font-medium text-gray-500">
          <Filter size={16} /> Filters:
        </div>
        <FilterDropdown
          value={statusFilter}
          onChange={setStatusFilter}
          label="Filter by status"
          options={[
            { value: "all", label: "All Statuses" },
            { value: "open", label: "Open" },
            { value: "working", label: "In Progress" },
            { value: "closed", label: "Resolved" },
          ]}
        />
        <FilterDropdown
          value={categoryFilter}
          onChange={setCategoryFilter}
          label="Filter by category"
          options={[
            { value: "all", label: "All Categories" },
            ...uniqueCategories.map(cat => ({ value: cat, label: cat }))
          ]}
        />
        <div className="flex-1 min-w-[200px] relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search by token, description, or location…"
            className="w-full pl-9 pr-8 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Search complaints"
          />
          {searchInput && (
            <button
              onClick={() => { setSearchInput(""); setGlobalFilter(""); }}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              aria-label="Clear search"
            >
              <X size={16} />
            </button>
          )}
        </div>
        <button
          onClick={() => setShowHeatmap(!showHeatmap)}
          className={`px-3 py-2 text-sm font-medium rounded-lg border transition-all flex items-center gap-2 ml-auto ${
            showHeatmap 
              ? "bg-red-50 text-red-600 border-red-200" 
              : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
          }`}
        >
          <Flame size={16} className={showHeatmap ? "text-red-500" : "text-gray-400"} />
          {showHeatmap ? "Hide Heatmap" : "Show Heatmap"}
        </button>
        <div className="text-sm text-gray-500">
          {filteredComplaints.length} of {complaints.length} results
        </div>
      </div>

      <div className="flex flex-col gap-6 flex-1">
        {/* Map View */}
        <div className="w-full bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden relative h-[400px]">
          {loading ? (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-50 z-10">
              <Loader2 className="animate-spin text-blue-600" size={32} />
            </div>
          ) : (
            <AdminMap
              complaints={mapComplaints}
              focusedLocation={focusedLocation}
              onImageClick={handleImageClick}
              showHeatmap={showHeatmap}
              adminLocation={adminLocation}
              onLocateMe={detectLocation}
              isLocating={isDetecting}
            />
          )}
        </div>

        {/* Data Table */}
        <div className="w-full bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
            <h2 className="font-semibold text-gray-800">All Complaints Database</h2>
            <span className="text-sm text-gray-500">{filteredComplaints.length} of {complaints.length} Records</span>
          </div>

          <div className="overflow-x-auto">
            {loading ? (
               <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-gray-400" size={24} /></div>
            ) : filteredComplaints.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto rounded-full bg-gray-100 flex items-center justify-center mb-3">
                  <Search size={24} className="text-gray-400" />
                </div>
                <p className="text-gray-500 font-medium">No complaints match your filters.</p>
                <p className="text-gray-400 text-sm mt-1">Try adjusting your search or filter criteria.</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  {table.getHeaderGroups().map(headerGroup => (
                    <tr key={headerGroup.id} className="border-b border-gray-200 bg-white">
                      {headerGroup.headers.map(header => (
                        <th
                          key={header.id}
                          className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-50 transition-colors"
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          <div className="flex items-center gap-2">
                            {flexRender(header.column.columnDef.header, header.getContext())}
                            <ArrowUpDown size={12} className={header.column.getIsSorted() ? "text-blue-600" : "text-gray-300"} />
                          </div>
                        </th>
                      ))}
                    </tr>
                  ))}
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {table.getRowModel().rows.map(row => (
                    <tr
                      key={row.id}
                      className="hover:bg-blue-50/50 transition-colors cursor-pointer group"
                      onClick={(e) => {
                        const tag = (e.target as HTMLElement).tagName.toLowerCase();
                        if (tag === 'select' || tag === 'option' || tag === 'button' || tag === 'img') return;
                        const coords = row.original.coordinates;
                        if (coords) setFocusedLocation([coords.lat, coords.lng]);
                      }}
                    >
                      {row.getVisibleCells().map(cell => (
                        <td key={cell.id} className="px-6 py-3">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Pagination Controls */}
          {filteredComplaints.length > 0 && (
            <div className="px-6 py-4 border-t border-gray-100 bg-white flex items-center justify-between">
              <div className="text-sm text-gray-500">
                Showing {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1} to {Math.min((table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize, filteredComplaints.length)} of {filteredComplaints.length} entries
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => table.previousPage()}
                  disabled={!table.getCanPreviousPage()}
                  className="px-3 py-1.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <div className="text-sm text-gray-600 font-medium px-2">
                  Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
                </div>
                <button
                  onClick={() => table.nextPage()}
                  disabled={!table.getCanNextPage()}
                  className="px-3 py-1.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Lightbox Modal */}
      {lightboxImage && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Enlarged complaint photo"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={() => setLightboxImage(null)}
          onKeyDown={(e) => { if (e.key === 'Escape') setLightboxImage(null); }}
        >
          <div className="relative max-w-5xl w-full max-h-[90vh] flex items-center justify-center">
            <button
              className="absolute -top-12 right-0 text-white hover:text-gray-300 p-2 text-xl font-bold bg-black/50 rounded-full w-10 h-10 flex items-center justify-center transition-colors"
              onClick={() => setLightboxImage(null)}
              autoFocus
              aria-label="Close image viewer"
            >
              ✕
            </button>
            <img
              src={lightboxImage}
              alt="Enlarged complaint photo"
              className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  );
}
