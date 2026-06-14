import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { collection, query, getDocs, orderBy, updateDoc, doc } from "firebase/firestore";
import { signInWithEmailAndPassword, onAuthStateChanged, signOut, User } from "firebase/auth";
import { db, auth } from "@/lib/firebase";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { Loader2, MapPin, Lock, LogOut, Download, ArrowUpDown, Image as ImageIcon } from "lucide-react";
import * as XLSX from "xlsx";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
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
}

function AdminRouteWrapper() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    let unsubscribe: () => void;

    const initializeAuth = async () => {
      try {
        const { isSignInWithEmailLink, signInWithEmailLink } = await import("firebase/auth");
        // Intercept Magic Link returning from Email
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
        unsubscribe = onAuthStateChanged(auth, (currentUser) => {
          setUser(currentUser);
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

  if (!user) {
    return <AdminLogin />;
  }

  return <AdminDashboard />;
}

function AdminLogin() {
  const defaultUsername = import.meta.env.VITE_ADMIN_USERNAME || "";
  const defaultPassword = import.meta.env.VITE_ADMIN_PASSWORD || "";

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
      if (username === defaultUsername && password === defaultPassword && defaultUsername) {
        try {
          const { createUserWithEmailAndPassword } = await import("firebase/auth");
          await createUserWithEmailAndPassword(auth, adminEmail, password);
        } catch (createErr: any) {
          setError("Failed to auto-create admin account: " + createErr.message);
        }
      } else {
        setError("Invalid credentials or account does not exist.");
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
      const { sendSignInLinkToEmail } = await import("firebase/auth");
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

const columnHelper = createColumnHelper<Complaint>();

function MapFlyTo({ center, popupId }: { center: [number, number] | null, popupId?: string | null }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.flyTo(center, 16, { duration: 1.5 });
    }
  }, [center, map]);
  return null;
}

function AdminDashboard() {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [focusedLocation, setFocusedLocation] = useState<[number, number] | null>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  useEffect(() => {
    async function fetchComplaints() {
      try {
        const q = query(collection(db, "complaints"), orderBy("timestamp", "desc"));
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Complaint));
        setComplaints(data);
      } catch (error) {
        console.error("Error fetching complaints:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchComplaints();
  }, []);

  const handleLogout = () => {
    signOut(auth);
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      await updateDoc(doc(db, "complaints", id), { status: newStatus });
      setComplaints(prev => prev.map(c => c.id === id ? { ...c, status: newStatus } : c));
    } catch (err) {
      console.error("Failed to update status", err);
      alert("Failed to update status. Please try again.");
    }
  };

  const exportToExcel = () => {
    const exportData = complaints.map(c => ({
      Token: c.token || "N/A",
      Category: c.category,
      Status: c.status,
      Location: c.location,
      Latitude: c.coordinates?.lat || "",
      Longitude: c.coordinates?.lng || "",
      Description: c.description,
      Date: c.timestamp?.toDate ? new Date(c.timestamp.toDate()).toLocaleString() : "",
      Photo: c.photoURL || "No Photo",
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Complaints");
    XLSX.writeFile(workbook, `civicscan_complaints_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const columns = [
    columnHelper.accessor("token", {
      header: "Token",
      cell: info => <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">{info.getValue() || "N/A"}</span>,
    }),
    columnHelper.accessor("photoURL", {
      header: "Photo",
      cell: info => {
        const url = info.getValue();
        if (!url) return <span className="text-gray-400 text-xs italic">None</span>;
        return (
          <button 
            type="button"
            onClick={(e) => { e.stopPropagation(); setLightboxImage(url); }} 
            className="block w-10 h-10 rounded overflow-hidden border border-gray-200 cursor-pointer"
          >
            <img src={url} alt="Complaint" className="w-full h-full object-cover hover:scale-110 transition-transform" />
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
        <select 
          value={info.getValue()}
          onChange={(e) => handleStatusChange(info.row.original.id, e.target.value)}
          onClick={(e) => e.stopPropagation()}
          className="text-sm border border-gray-200 rounded px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 capitalize"
          style={{
            color: info.getValue() === "open" ? "#dc2626" : info.getValue() === "working" ? "#d97706" : "#16a34a",
            fontWeight: 500
          }}
        >
          <option value="open">Open</option>
          <option value="working">Working</option>
          <option value="closed">Closed</option>
        </select>
      ),
    }),
    columnHelper.accessor("location", {
      header: "Location",
      cell: info => (
        <div className="flex items-center gap-1 min-w-[150px]">
          <MapPin size={14} className="text-gray-400 shrink-0" />
          <span className="text-sm truncate max-w-[200px]">{info.getValue()}</span>
        </div>
      ),
    }),
    columnHelper.accessor("description", {
      header: "Description",
      cell: info => <div className="text-sm truncate max-w-[250px]">{info.getValue()}</div>,
    }),
    columnHelper.accessor("timestamp", {
      header: "Date",
      cell: info => {
        const ts = info.getValue();
        return <span className="text-sm text-gray-500 whitespace-nowrap">{ts?.toDate ? new Date(ts.toDate()).toLocaleString() : ''}</span>;
      },
    }),
  ];

  const table = useReactTable({
    data: complaints,
    columns,
    state: {
      sorting,
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const defaultCenter: [number, number] = [20.5937, 78.9629];
  const mapCenter = focusedLocation || (complaints.find(c => c.coordinates)?.coordinates 
    ? [complaints.find(c => c.coordinates)!.coordinates!.lat, complaints.find(c => c.coordinates)!.coordinates!.lng] as [number, number]
    : defaultCenter);

  return (
    <div className="min-h-screen pt-20 px-4 max-w-7xl mx-auto flex flex-col pb-12">
      <div className="mb-6 flex justify-between items-end flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2 text-[color:var(--text-primary)]">Admin Dashboard</h1>
          <p className="text-[color:var(--text-secondary)]">Manage civic issues and export analytical data.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={exportToExcel}
            className="flex items-center gap-2 text-sm text-white bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg transition-colors shadow-sm font-medium"
          >
            <Download size={16} /> Export to Excel
          </button>
          <button 
            onClick={handleLogout}
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 bg-white border border-gray-200 px-4 py-2 rounded-lg transition-colors shadow-sm"
          >
            <LogOut size={16} /> Sign Out
          </button>
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
            <MapContainer center={mapCenter} zoom={12} scrollWheelZoom={true} className="w-full h-full absolute inset-0 z-0">
              <MapFlyTo center={focusedLocation} />
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {complaints.filter(c => c.coordinates).map((c) => (
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
                        <button onClick={() => setLightboxImage(c.photoURL!)} className="w-full h-24 mt-2 block p-0 border-0 bg-transparent cursor-zoom-in">
                           <img src={c.photoURL} alt="Issue" className="w-full h-full object-cover rounded border border-gray-100" />
                        </button>
                      )}
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          )}
        </div>

        {/* Data Table */}
        <div className="w-full bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
            <h2 className="font-semibold text-gray-800">All Complaints Database</h2>
            <span className="text-sm text-gray-500">{complaints.length} Total Records</span>
          </div>
          
          <div className="overflow-x-auto">
            {loading ? (
               <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-gray-400" size={24} /></div>
            ) : complaints.length === 0 ? (
              <div className="text-center py-12 text-gray-500">No records found.</div>
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
                      onClick={() => {
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
        </div>
      </div>

      {/* Lightbox Modal */}
      {lightboxImage && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={() => setLightboxImage(null)}
        >
          <div className="relative max-w-5xl w-full max-h-[90vh] flex items-center justify-center">
            <button 
              className="absolute -top-12 right-0 text-white hover:text-gray-300 p-2 text-xl font-bold bg-black/50 rounded-full w-10 h-10 flex items-center justify-center transition-colors"
              onClick={() => setLightboxImage(null)}
            >
              ✕
            </button>
            <img 
              src={lightboxImage} 
              alt="Enlarged complaint" 
              className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
              onClick={(e) => e.stopPropagation()} 
            />
          </div>
        </div>
      )}
    </div>
  );
}
