import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";
import { collection, query, where, getDocs, orderBy, limit, doc, updateDoc, increment } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapPin, Search, Loader2, Clock, CheckCircle2, AlertCircle, Wrench, ThumbsUp, Filter, List, Map as MapIcon, ChevronDown } from "lucide-react";
import { Reveal } from "@/components/civic/Reveal";
import { SEO } from "@/components/civic/SEO";
import { toast } from "sonner";

// Fix leaflet icon
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

export const Route = createFileRoute("/map")({
  validateSearch: (search: Record<string, unknown>) => {
    return {
      issueId: search.issueId as string | undefined,
    }
  },
  component: PublicMapRoute,
});

interface PublicComplaint {
  id: string;
  category: string;
  description: string;
  location: string;
  status: string;
  timestamp: any;
  photoURL?: string;
  coordinates?: { lat: number; lng: number };
  upvotes?: number;
}

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  open: { label: "Open", color: "#dc2626", icon: AlertCircle },
  working: { label: "In Progress", color: "#d97706", icon: Wrench },
  closed: { label: "Resolved", color: "#16a34a", icon: CheckCircle2 },
};

function MapUpdater({ center }: { center?: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.flyTo(center, 18, { duration: 1.5 });
    }
  }, [center, map]);
  return null;
}

function PublicMapRoute() {
  const [complaints, setComplaints] = useState<PublicComplaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"map" | "list">("map");
  const [filter, setFilter] = useState<"all" | "open" | "resolved">("all");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [focusedLocation, setFocusedLocation] = useState<[number, number] | null>(null);
  const { issueId } = Route.useSearch();
  const markerRefs = useRef<{ [key: string]: L.Marker | null }>({});

  useEffect(() => {
    async function fetchPublicComplaints() {
      try {
        // Only fetch recent 100 to avoid clutter and huge reads
        const q = query(
          collection(db, "complaints"),
          orderBy("timestamp", "desc"),
          limit(100)
        );
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(doc => ({
          id: doc.id,
          category: doc.data().category,
          description: doc.data().description,
          location: doc.data().location,
          status: doc.data().status,
          timestamp: doc.data().timestamp,
          photoURL: doc.data().photoURL,
          coordinates: doc.data().coordinates,
          upvotes: doc.data().upvotes || 0,
        } as PublicComplaint));
        setComplaints(data);
        
        // Auto-focus logic for duplicates upvoting
        if (issueId) {
          const target = data.find(c => c.id === issueId);
          if (target && target.coordinates) {
            setFocusedLocation([target.coordinates.lat, target.coordinates.lng]);
            setViewMode("map");
            setTimeout(() => {
              window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
            }, 300);
          }
        }
        
      } catch (err) {
        console.error("Error fetching public map data:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchPublicComplaints();
  }, [issueId]);

  useEffect(() => {
    if (issueId && markerRefs.current[issueId]) {
      setTimeout(() => {
        markerRefs.current[issueId]?.openPopup();
      }, 500);
    }
  }, [issueId, complaints, viewMode]);

  const handleUpvote = async (id: string) => {
    try {
      const appKey = (import.meta.env.VITE_APP_NAME || "LocalVoice").toLowerCase().replace(/\s+/g, "_");
      const voted = JSON.parse(localStorage.getItem(`${appKey}_upvotes`) || "[]");
      if (voted.includes(id)) {
        toast.info("You've already upvoted this issue.");
        return;
      }

      // Optimistic UI update
      setComplaints(prev => prev.map(c => c.id === id ? { ...c, upvotes: (c.upvotes || 0) + 1 } : c));
      
      // Update local storage
      localStorage.setItem(`${appKey}_upvotes`, JSON.stringify([...voted, id]));

      // Update Firestore
      await updateDoc(doc(db, "complaints", id), {
        upvotes: increment(1)
      });
    } catch (err) {
      console.error("Failed to upvote:", err);
      // Revert on failure
      setComplaints(prev => prev.map(c => c.id === id ? { ...c, upvotes: Math.max(0, (c.upvotes || 1) - 1) } : c));
      alert("Failed to upvote. Please try again.");
    }
  };

  const filteredComplaints = complaints.filter(c => {
    if (filter === "open") return c.status === "open" || c.status === "working";
    if (filter === "resolved") return c.status === "closed";
    return true;
  });

  const defaultCenter: [number, number] = [20.5937, 78.9629];
  const complaintsWithCoords = filteredComplaints.filter(c => c.coordinates);
  const mapCenter = focusedLocation || (complaintsWithCoords.length > 0
    ? [complaintsWithCoords[0].coordinates!.lat, complaintsWithCoords[0].coordinates!.lng] as [number, number]
    : defaultCenter);

  return (
    <>
      <SEO 
        title={`Live Issue Map — ${import.meta.env.VITE_APP_NAME || "LocalVoice"}`}
        description="View real-time civic issues reported across the city. Filter by category, status, and location."
        canonical={`${import.meta.env.VITE_APP_URL || "https://localvoice.web.app"}/map`}
      />
      <div className="pt-24 lg:pt-28 min-h-screen bg-slate-50 flex flex-col">
        <div className="container-x py-6 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 z-10 relative">
          <div>
            <Reveal><span className="eyebrow">Live Pulse</span></Reveal>
            <Reveal delay={80}>
              <h1 className="mt-2 text-3xl font-extrabold text-[color:var(--text-primary)] tracking-tight">Public Issue Map</h1>
            </Reveal>
            <Reveal delay={160}>
              <p className="mt-2 text-[color:var(--text-secondary)]">Explore recent civic reports from your community.</p>
            </Reveal>
          </div>

          <Reveal delay={240}>
            <div className="flex items-center gap-3 bg-white p-1.5 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex bg-slate-100 rounded-lg p-1">
                <button 
                  onClick={() => setViewMode("map")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === "map" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                >
                  <MapIcon size={16} /> Map
                </button>
                <button 
                  onClick={() => setViewMode("list")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === "list" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                >
                  <List size={16} /> List
                </button>
              </div>
              <div className="h-6 w-px bg-slate-200 mx-1"></div>
              <div className="relative">
                <button
                  onClick={() => setIsFilterOpen(!isFilterOpen)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold bg-white border border-slate-200 rounded-md text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
                >
                  <Filter size={14} className="text-slate-400" />
                  {filter === "all" ? "All Issues" : filter === "open" ? "Unresolved" : "Resolved"}
                  <ChevronDown size={14} className={`text-slate-400 transition-transform ${isFilterOpen ? "rotate-180" : ""}`} />
                </button>
                
                {isFilterOpen && (
                  <>
                    <div 
                      className="fixed inset-0 z-40"
                      onClick={() => setIsFilterOpen(false)}
                    />
                    <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 rounded-xl shadow-[var(--shadow-lg)] z-50 py-1 overflow-hidden origin-top-right animate-in fade-in zoom-in duration-200">
                      <button
                        onClick={() => { setFilter("all"); setIsFilterOpen(false); }}
                        className={`w-full text-left px-4 py-2.5 text-sm font-medium transition-colors hover:bg-slate-50 flex items-center justify-between ${filter === "all" ? "text-[color:var(--primary)] bg-[color:var(--primary)]/5" : "text-slate-700"}`}
                      >
                        All Issues
                        {filter === "all" && <CheckCircle2 size={14} className="text-[color:var(--primary)]" />}
                      </button>
                      <button
                        onClick={() => { setFilter("open"); setIsFilterOpen(false); }}
                        className={`w-full text-left px-4 py-2.5 text-sm font-medium transition-colors hover:bg-slate-50 flex items-center justify-between ${filter === "open" ? "text-[color:var(--primary)] bg-[color:var(--primary)]/5" : "text-slate-700"}`}
                      >
                        Unresolved
                        {filter === "open" && <CheckCircle2 size={14} className="text-[color:var(--primary)]" />}
                      </button>
                      <button
                        onClick={() => { setFilter("resolved"); setIsFilterOpen(false); }}
                        className={`w-full text-left px-4 py-2.5 text-sm font-medium transition-colors hover:bg-slate-50 flex items-center justify-between ${filter === "resolved" ? "text-[color:var(--primary)] bg-[color:var(--primary)]/5" : "text-slate-700"}`}
                      >
                        Resolved
                        {filter === "resolved" && <CheckCircle2 size={14} className="text-[color:var(--primary)]" />}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </Reveal>
        </div>

        <div className="flex-1 relative">
          {loading ? (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-50/80 z-20 backdrop-blur-sm">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="animate-spin text-[color:var(--primary)]" size={32} />
                <p className="text-slate-500 font-medium">Loading live reports...</p>
              </div>
            </div>
          ) : null}

          {viewMode === "map" ? (
            <div className="absolute inset-0 z-0">
              <MapContainer
                center={mapCenter}
                zoom={13}
                style={{ width: "100%", height: "100%" }}
                className="z-0"
                zoomControl={false}
              >
                <MapUpdater center={mapCenter} />
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {complaintsWithCoords.map((c) => (
                  <Marker 
                    key={c.id} 
                    position={[c.coordinates!.lat, c.coordinates!.lng]}
                    ref={(m) => {
                      if (m) markerRefs.current[c.id] = m;
                    }}
                  >
                    <Popup className="custom-popup">
                      <div className="min-w-[240px]">
                        {c.photoURL && (
                          <div className="h-32 -mx-5 -mt-4 mb-3 overflow-hidden rounded-t-lg">
                            <img src={c.photoURL} className="w-full h-full object-cover" alt="Issue" />
                          </div>
                        )}
                        <div className="flex justify-between items-start gap-2 mb-2">
                          <span className="inline-block px-2 py-1 bg-slate-100 text-slate-700 text-[10px] font-bold uppercase tracking-wider rounded-md">
                            {c.category}
                          </span>
                          {(() => {
                            const conf = statusConfig[c.status] || statusConfig.open;
                            const Icon = conf.icon;
                            return (
                              <span className="flex items-center gap-1 text-[11px] font-bold" style={{ color: conf.color }}>
                                <Icon size={12} /> {conf.label}
                              </span>
                            );
                          })()}
                        </div>
                        <p className="text-sm text-slate-800 font-medium leading-snug mb-2 line-clamp-3">
                          {c.description}
                        </p>
                        <p className="flex items-start gap-1 text-xs text-slate-500 mb-4 line-clamp-2">
                          <MapPin size={12} className="shrink-0 mt-0.5" />
                          {c.location}
                        </p>
                        <button
                          onClick={() => handleUpvote(c.id)}
                          className="w-full flex items-center justify-center gap-2 py-2 rounded-md bg-slate-50 hover:bg-slate-100 border border-slate-200 text-sm font-semibold text-slate-700 transition-colors"
                        >
                          <ThumbsUp size={14} /> I have this issue too ({c.upvotes || 0})
                        </button>
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            </div>
          ) : (
            <div className="container-x pb-12 z-10 relative">
              {filteredComplaints.length === 0 && !loading ? (
                <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
                  <Search size={40} className="mx-auto text-slate-300 mb-4" />
                  <h3 className="text-lg font-bold text-slate-800">No issues found</h3>
                  <p className="text-slate-500">There are no reports matching your current filter.</p>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredComplaints.map(c => {
                    const conf = statusConfig[c.status] || statusConfig.open;
                    const StatusIcon = conf.icon;
                    return (
                      <div key={c.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col hover:shadow-md transition-shadow">
                        {c.photoURL ? (
                          <div className="h-48 w-full bg-slate-100 relative">
                            <img src={c.photoURL} alt="Issue" className="w-full h-full object-cover" />
                            <div className="absolute top-3 right-3 px-2.5 py-1 bg-white/90 backdrop-blur-sm text-xs font-bold rounded-md shadow-sm flex items-center gap-1.5" style={{ color: conf.color }}>
                              <StatusIcon size={14} /> {conf.label}
                            </div>
                          </div>
                        ) : (
                          <div className="px-5 pt-5 pb-0 flex justify-end">
                            <div className="px-2.5 py-1 bg-slate-50 text-xs font-bold rounded-md flex items-center gap-1.5 border border-slate-100" style={{ color: conf.color }}>
                              <StatusIcon size={14} /> {conf.label}
                            </div>
                          </div>
                        )}
                        
                        <div className="p-5 flex-1 flex flex-col">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                              {c.category}
                            </span>
                            <span className="text-xs text-slate-400 flex items-center gap-1">
                              <Clock size={12} />
                              {c.timestamp?.toDate ? new Date(c.timestamp.toDate()).toLocaleDateString() : 'Recent'}
                            </span>
                          </div>
                          
                          <p className="text-sm font-medium text-slate-800 mb-3 line-clamp-3 flex-1">
                            {c.description}
                          </p>
                          
                          <div className="flex items-start gap-1.5 text-xs text-slate-500 mb-4 line-clamp-2 pt-3 border-t border-slate-100">
                            <MapPin size={14} className="shrink-0 text-slate-400" />
                            {c.location}
                          </div>
                          
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleUpvote(c.id)}
                              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 text-sm font-semibold transition-colors"
                            >
                              <ThumbsUp size={14} /> Upvote ({c.upvotes || 0})
                            </button>
                            {c.coordinates && (
                              <button
                                onClick={() => {
                                  setFocusedLocation([c.coordinates!.lat, c.coordinates!.lng]);
                                  setViewMode("map");
                                }}
                                className="px-3 py-2 rounded-lg bg-slate-50 hover:bg-slate-100 text-[color:var(--primary)] border border-slate-200 transition-colors"
                                aria-label="View on map"
                              >
                                <MapIcon size={16} />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
