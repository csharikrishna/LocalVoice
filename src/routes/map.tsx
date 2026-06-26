import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";
import { getPublicComplaints } from "@/lib/api/queries.functions";
import { upvoteComplaint } from "@/lib/api/complaints.functions";
import { Suspense, lazy } from "react";
import { ClientOnly } from "@/components/ClientOnly";
import { CATEGORIES } from "@/lib/civic-logic";
const PublicMapLeaflet = lazy(() => import("@/components/civic/PublicMapLeaflet"));
import {
  MapPin,
  Search,
  Loader2,
  Clock,
  CheckCircle2,
  AlertCircle,
  Wrench,
  ThumbsUp,
  Filter,
  List,
  Map as MapIcon,
  ChevronDown,
  LocateFixed,
} from "lucide-react";
import { Reveal } from "@/components/civic/Reveal";
import { SEO } from "@/components/civic/SEO";
import { toast } from "sonner";

export const Route = createFileRoute("/map")({
  validateSearch: (search: Record<string, unknown>) => {
    return {
      issueId: search.issueId as string | undefined,
    };
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

function PublicMapRoute() {
  const [complaints, setComplaints] = useState<PublicComplaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"map" | "list">("map");
  const [filter, setFilter] = useState<"all" | "open" | "resolved">("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [focusedLocation, setFocusedLocation] = useState<[number, number] | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const { issueId } = Route.useSearch();
  const markerRefs = useRef<Record<string, any>>({});

  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setFocusedLocation([position.coords.latitude, position.coords.longitude]);
        setIsLocating(false);
        toast.success("Location found");
      },
      (error) => {
        console.error("Geolocation error:", error);
        setIsLocating(false);
        if (error.code === error.PERMISSION_DENIED) {
          toast.error("Location access denied. Please enable permissions.");
        } else {
          toast.error("Unable to retrieve your location.");
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  useEffect(() => {
    async function fetchPublicComplaints() {
      try {
        const data = (await getPublicComplaints()) as PublicComplaint[];
        setComplaints(data);

        // Auto-focus logic for duplicates upvoting
        if (issueId) {
          const target = data.find((c) => c.id === issueId);
          if (target && target.coordinates) {
            setFocusedLocation([target.coordinates.lat, target.coordinates.lng]);
            setViewMode("map");
            setTimeout(() => {
              window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
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
      const appKey = (import.meta.env.VITE_APP_NAME || "LocalVoice")
        .toLowerCase()
        .replace(/\s+/g, "_");
      const voted = JSON.parse(localStorage.getItem(`${appKey}_upvotes`) || "[]");
      if (voted.includes(id)) {
        toast.info("You've already upvoted this issue.");
        return;
      }

      // Simple prompt for MVP to collect optional email
      const email = window.prompt(
        "Thanks for upvoting! Optional: Enter your email to get notified when this issue is resolved.",
        ""
      );
      if (email !== null && email.trim() !== "" && !email.includes("@")) {
        toast.error("Please enter a valid email address, or leave it blank.");
        return;
      }

      // Optimistic UI update
      setComplaints((prev) =>
        prev.map((c) => (c.id === id ? { ...c, upvotes: (c.upvotes || 0) + 1 } : c)),
      );

      // Update local storage
      localStorage.setItem(`${appKey}_upvotes`, JSON.stringify([...voted, id]));

      // Update via server function
      const res = await upvoteComplaint({ data: { id, email: email || undefined } });
      if (!res.ok) throw new Error((res as any).message || "Failed to upvote");
    } catch (err) {
      console.error("Failed to upvote:", err);
      // Revert on failure
      setComplaints((prev) =>
        prev.map((c) => (c.id === id ? { ...c, upvotes: Math.max(0, (c.upvotes || 1) - 1) } : c)),
      );
      alert("Failed to upvote. Please try again.");
    }
  };

  const filteredComplaints = complaints.filter((c) => {
    let statusMatch = true;
    if (filter === "open") statusMatch = c.status === "open" || c.status === "working";
    if (filter === "resolved") statusMatch = c.status === "closed";
    
    let categoryMatch = true;
    if (categoryFilter !== "all") categoryMatch = c.category === categoryFilter;
    
    return statusMatch && categoryMatch;
  });

  const defaultCenter: [number, number] = [20.5937, 78.9629];
  const complaintsWithCoords = filteredComplaints.filter((c) => c.coordinates);
  const mapCenter =
    focusedLocation ||
    (complaintsWithCoords.length > 0
      ? ([complaintsWithCoords[0].coordinates!.lat, complaintsWithCoords[0].coordinates!.lng] as [
          number,
          number,
        ])
      : defaultCenter);

  return (
    <>
      <SEO
        title={`Live Issue Map — ${import.meta.env.VITE_APP_NAME || "LocalVoice"}`}
        description="View real-time civic issues reported across the city. Filter by category, status, and location."
        canonical={`${import.meta.env.VITE_APP_URL || "https://localvoice.web.app"}/map`}
      />
      <div className="pt-24 lg:pt-28 min-h-screen bg-slate-50 flex flex-col">
        <div className="container-x py-6 flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6 z-10 relative">
          <div className="w-full lg:w-auto">
            <Reveal>
              <span className="eyebrow">Live Pulse</span>
            </Reveal>
            <Reveal delay={80}>
              <h1 className="mt-2 text-3xl font-extrabold text-[color:var(--text-primary)] tracking-tight">
                Public Issue Map
              </h1>
            </Reveal>
            <Reveal delay={160}>
              <p className="mt-2 text-[color:var(--text-secondary)] text-sm sm:text-base">
                Explore recent civic reports from your community.
              </p>
            </Reveal>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-4 w-full lg:w-auto">
            <Reveal delay={200} className="w-full sm:w-auto">
              <div className="flex justify-between sm:justify-start gap-4 sm:gap-6 bg-white px-5 py-4 rounded-xl border border-slate-200 shadow-sm w-full sm:w-auto">
                <div className="flex flex-col items-center sm:items-start flex-1 sm:flex-none">
                  <span className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">Total</span>
                  <span className="text-2xl font-black text-slate-900">{complaints.length}</span>
                </div>
                <div className="w-px bg-slate-200"></div>
                <div className="flex flex-col items-center sm:items-start flex-1 sm:flex-none">
                  <span className="text-[10px] sm:text-xs font-bold text-emerald-600 uppercase tracking-wider">Resolved</span>
                  <span className="text-2xl font-black text-emerald-600">
                    {complaints.filter(c => c.status === "closed").length}
                  </span>
                </div>
                <div className="w-px bg-slate-200"></div>
                <div className="flex flex-col items-center sm:items-start flex-1 sm:flex-none">
                  <span className="text-[10px] sm:text-xs font-bold text-amber-600 uppercase tracking-wider">In Progress</span>
                  <span className="text-2xl font-black text-amber-600">
                    {complaints.filter(c => c.status === "working").length}
                  </span>
                </div>
              </div>
            </Reveal>

            <Reveal delay={240} className="w-full sm:w-auto">
              <div className="flex items-center justify-between sm:justify-start gap-2 sm:gap-3 bg-white p-1.5 rounded-xl border border-slate-200 shadow-sm w-full sm:w-auto">
                <div className="flex bg-slate-100 rounded-lg p-1 flex-1 sm:flex-none">
                  <button
                    onClick={() => setViewMode("map")}
                    className={`flex-1 sm:flex-none flex justify-center items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === "map" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                  >
                    <MapIcon size={16} /> Map
                  </button>
                  <button
                    onClick={() => setViewMode("list")}
                    className={`flex-1 sm:flex-none flex justify-center items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === "list" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                  >
                    <List size={16} /> List
                  </button>
                </div>
                <div className="h-6 w-px bg-slate-200 shrink-0"></div>
                <div className="relative shrink-0 flex-1 sm:flex-none">
                  <button
                    onClick={() => setIsFilterOpen(!isFilterOpen)}
                    className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 text-sm font-semibold bg-white border border-slate-200 rounded-md text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
                  >
                    <Filter size={14} className="text-slate-400" />
                  <span className="hidden sm:inline">
                    {filter === "all" ? "All Issues" : filter === "open" ? "Unresolved" : "Resolved"}
                  </span>
                  <span className="sm:hidden">Filter</span>
                  <ChevronDown
                    size={14}
                    className={`text-slate-400 transition-transform ${isFilterOpen ? "rotate-180" : ""}`}
                  />
                </button>

                {isFilterOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsFilterOpen(false)} />
                    <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 rounded-xl shadow-[var(--shadow-lg)] z-50 py-1 overflow-hidden origin-top-right animate-in fade-in zoom-in duration-200">
                      <button
                        onClick={() => {
                          setFilter("all");
                          setIsFilterOpen(false);
                        }}
                        className={`w-full text-left px-4 py-2.5 text-sm font-medium transition-colors hover:bg-slate-50 flex items-center justify-between ${filter === "all" ? "text-[color:var(--primary)] bg-[color:var(--primary)]/5" : "text-slate-700"}`}
                      >
                        All Issues
                        {filter === "all" && (
                          <CheckCircle2 size={14} className="text-[color:var(--primary)]" />
                        )}
                      </button>
                      <button
                        onClick={() => {
                          setFilter("open");
                          setIsFilterOpen(false);
                        }}
                        className={`w-full text-left px-4 py-2.5 text-sm font-medium transition-colors hover:bg-slate-50 flex items-center justify-between ${filter === "open" ? "text-[color:var(--primary)] bg-[color:var(--primary)]/5" : "text-slate-700"}`}
                      >
                        Unresolved
                        {filter === "open" && (
                          <CheckCircle2 size={14} className="text-[color:var(--primary)]" />
                        )}
                      </button>
                      <button
                        onClick={() => {
                          setFilter("resolved");
                          setIsFilterOpen(false);
                        }}
                        className={`w-full text-left px-4 py-2.5 text-sm font-medium transition-colors hover:bg-slate-50 flex items-center justify-between ${filter === "resolved" ? "text-[color:var(--primary)] bg-[color:var(--primary)]/5" : "text-slate-700"}`}
                      >
                        Resolved
                        {filter === "resolved" && (
                          <CheckCircle2 size={14} className="text-[color:var(--primary)]" />
                        )}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </Reveal>
          </div>
        </div>

        {/* Category Pills */}
        <Reveal delay={280}>
          <div className="container-x pb-4 pt-2 sm:pt-0">
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide" style={{ WebkitOverflowScrolling: 'touch', msOverflowStyle: 'none', scrollbarWidth: 'none' }}>
              <button
                onClick={() => setCategoryFilter("all")}
                className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition-all border ${
                  categoryFilter === "all"
                    ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                }`}
              >
                All Categories
              </button>
              {CATEGORIES.filter(c => c.id !== "other").map((category) => {
                const Icon = category.icon;
                const isSelected = categoryFilter === category.id;
                return (
                  <button
                    key={category.id}
                    onClick={() => setCategoryFilter(category.id)}
                    className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all border ${
                      isSelected
                        ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                        : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <Icon size={14} className={isSelected ? "text-white" : "text-slate-400"} />
                    {category.label}
                  </button>
                );
              })}
            </div>
          </div>
        </Reveal>

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
            <div className="absolute inset-0 z-0 bg-slate-50/50">
              <div className="absolute bottom-8 right-4 md:right-8 z-[400]">
                <button
                  onClick={handleLocateMe}
                  disabled={isLocating}
                  className="bg-white p-3 rounded-full shadow-lg border border-slate-200 text-slate-700 hover:text-[color:var(--primary)] hover:bg-slate-50 transition-all focus:outline-none focus:ring-2 focus:ring-[color:var(--primary)] focus:ring-offset-2 disabled:opacity-70 flex items-center justify-center group"
                  aria-label="Show my location"
                  title="Show my location"
                >
                  {isLocating ? (
                    <Loader2 className="animate-spin text-[color:var(--primary)]" size={24} />
                  ) : (
                    <LocateFixed className="group-hover:scale-110 transition-transform" size={24} />
                  )}
                </button>
              </div>
              <ClientOnly fallback={<div className="w-full h-full flex items-center justify-center"><Loader2 className="animate-spin text-[color:var(--primary)]" size={32} /></div>}>
                <Suspense fallback={<div className="w-full h-full flex items-center justify-center"><Loader2 className="animate-spin text-[color:var(--primary)]" size={32} /></div>}>
                  <PublicMapLeaflet
                    mapCenter={mapCenter}
                    complaintsWithCoords={complaintsWithCoords}
                    statusConfig={statusConfig as any}
                    handleUpvote={handleUpvote}
                    setMarkerRef={(id, marker) => {
                      if (marker) markerRefs.current[id] = marker;
                    }}
                  />
                </Suspense>
              </ClientOnly>
            </div>
          ) : (
            <div className="container-x pb-12 z-10 relative">
              {filteredComplaints.length === 0 && !loading ? (
                <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
                  <Search size={40} className="mx-auto text-slate-300 mb-4" />
                  <h3 className="text-lg font-bold text-slate-800">No issues found</h3>
                  <p className="text-slate-500">
                    There are no reports matching your current filter.
                  </p>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredComplaints.map((c) => {
                    const conf = statusConfig[c.status] || statusConfig.open;
                    const StatusIcon = conf.icon;
                    return (
                      <div
                        key={c.id}
                        className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col hover:shadow-md transition-shadow"
                      >
                        {c.photoURL ? (
                          <div className="h-48 w-full bg-slate-100 relative">
                            <img
                              src={c.photoURL}
                              alt="Issue"
                              className="w-full h-full object-cover"
                            />
                            <div
                              className="absolute top-3 right-3 px-2.5 py-1 bg-white/90 backdrop-blur-sm text-xs font-bold rounded-md shadow-sm flex items-center gap-1.5"
                              style={{ color: conf.color }}
                            >
                              <StatusIcon size={14} /> {conf.label}
                            </div>
                          </div>
                        ) : (
                          <div className="px-5 pt-5 pb-0 flex justify-end">
                            <div
                              className="px-2.5 py-1 bg-slate-50 text-xs font-bold rounded-md flex items-center gap-1.5 border border-slate-100"
                              style={{ color: conf.color }}
                            >
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
                              {c.timestamp
                                ? new Date(typeof c.timestamp === 'string' ? c.timestamp : c.timestamp.toDate?.() || c.timestamp).toLocaleDateString()
                                : "Recent"}
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
