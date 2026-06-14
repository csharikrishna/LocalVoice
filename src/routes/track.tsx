import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { collection, query, where, getDocs, doc, updateDoc, increment } from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  Search,
  Loader2,
  MapPin,
  Clock,
  CheckCircle2,
  AlertCircle,
  Wrench,
  ArrowLeft,
  ThumbsUp,
} from "lucide-react";
import { Reveal } from "@/components/civic/Reveal";

type TrackSearch = {
  token?: string;
};

export const Route = createFileRoute("/track")({
  validateSearch: (search: Record<string, unknown>): TrackSearch => ({
    token: (search.token as string) || undefined,
  }),
  head: () => ({
    meta: [
      { title: "Track Your Report — LocalVoice" },
      {
        name: "description",
        content:
          "Check the status of your civic issue report using your tracking token.",
      },
    ],
  }),
  component: TrackPage,
});

interface ComplaintResult {
  id: string;
  token: string;
  category: string;
  description: string;
  location: string;
  status: string;
  timestamp: any;
  photoURL?: string;
  coordinates?: { lat: number; lng: number };
  upvotes?: number;
}

const statusConfig: Record<
  string,
  { label: string; color: string; bgColor: string; icon: typeof Clock }
> = {
  open: {
    label: "Open — Awaiting Review",
    color: "#dc2626",
    bgColor: "#fef2f2",
    icon: AlertCircle,
  },
  working: {
    label: "In Progress — Being Resolved",
    color: "#d97706",
    bgColor: "#fffbeb",
    icon: Wrench,
  },
  closed: {
    label: "Resolved — Issue Fixed",
    color: "#16a34a",
    bgColor: "#f0fdf4",
    icon: CheckCircle2,
  },
};

function TrackPage() {
  const { token: urlToken } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });

  const [inputToken, setInputToken] = useState(urlToken || "");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ComplaintResult | null>(null);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const trimmed = inputToken.trim().toUpperCase();
    if (!trimmed) {
      setError("Please enter a tracking token.");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    setSearched(true);

    try {
      const q = query(
        collection(db, "complaints"),
        where("token", "==", trimmed)
      );
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        setResult(null);
      } else {
        const doc = snapshot.docs[0];
        setResult({ id: doc.id, ...doc.data() } as ComplaintResult);
      }

      // Update URL with token for shareability
      navigate({ search: { token: trimmed }, replace: true });
    } catch (err) {
      console.error("Track search error:", err);
      setError("Failed to look up your report. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleUpvote = async () => {
    if (!result) return;
    try {
      const voted = JSON.parse(localStorage.getItem("civicscan_upvotes") || "[]");
      if (voted.includes(result.id)) {
        alert("You have already upvoted this issue.");
        return;
      }

      setResult(prev => prev ? { ...prev, upvotes: (prev.upvotes || 0) + 1 } : null);
      localStorage.setItem("civicscan_upvotes", JSON.stringify([...voted, result.id]));

      await updateDoc(doc(db, "complaints", result.id), {
        upvotes: increment(1)
      });
    } catch (err) {
      console.error("Failed to upvote:", err);
      setResult(prev => prev ? { ...prev, upvotes: Math.max(0, (prev.upvotes || 1) - 1) } : null);
      alert("Failed to upvote. Please try again.");
    }
  };

  // Auto-search if token is in URL on first load
  useState(() => {
    if (urlToken) {
      setInputToken(urlToken);
      handleSearch();
    }
  });

  return (
    <section className="pt-28 lg:pt-32 pb-20 min-h-screen">
      <div className="container-x max-w-2xl mx-auto">
        <Reveal>
          <span className="eyebrow">Track your report</span>
        </Reveal>
        <Reveal delay={80}>
          <h1
            className="mt-3 text-3xl md:text-4xl font-extrabold"
            style={{ letterSpacing: "-0.03em" }}
          >
            Check your complaint status
          </h1>
        </Reveal>
        <Reveal delay={160}>
          <p className="mt-4 text-lg text-[color:var(--text-secondary)] leading-[1.7]">
            Enter the tracking token you received when you submitted your
            report.
          </p>
        </Reveal>

        {/* Search Form */}
        <Reveal delay={240}>
          <form
            onSubmit={handleSearch}
            className="mt-8 flex gap-3"
            aria-label="Track complaint"
          >
            <div className="flex-1 relative">
              <input
                id="track-token"
                type="text"
                value={inputToken}
                onChange={(e) => setInputToken(e.target.value.toUpperCase())}
                placeholder="e.g., CVC-A3F82B10"
                className="w-full px-4 py-3.5 pl-11 rounded-[12px] text-base font-mono bg-white outline-none transition-all"
                style={{ border: "1px solid var(--border)" }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = "var(--primary)";
                  e.currentTarget.style.boxShadow =
                    "0 0 0 3px rgba(27,79,216,0.12)";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = "var(--border)";
                  e.currentTarget.style.boxShadow = "none";
                }}
                aria-label="Tracking token"
              />
              <Search
                size={18}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[color:var(--text-muted)]"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-[12px] font-semibold text-white bg-[color:var(--primary)] hover:bg-[color:var(--primary-dark)] transition-all disabled:opacity-75 min-h-[48px]"
              style={{ boxShadow: "0 6px 20px rgba(27,79,216,0.25)" }}
            >
              {loading ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                "Track"
              )}
            </button>
          </form>
        </Reveal>

        {/* Error */}
        {error && (
          <div className="mt-6 p-4 rounded-[12px] bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-2">
            <AlertCircle size={18} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Result */}
        {searched && !loading && !error && (
          <div className="mt-8">
            {result ? (
              <Reveal>
                <div
                  className="bg-white rounded-[20px] p-6 sm:p-8"
                  style={{
                    border: "1px solid var(--border)",
                    boxShadow: "var(--shadow-md)",
                  }}
                >
                  {/* Status Banner */}
                  {(() => {
                    const config = statusConfig[result.status] ||
                      statusConfig.open;
                    const StatusIcon = config.icon;
                    return (
                      <div
                        className="flex items-center gap-3 p-4 rounded-[12px] mb-6"
                        style={{
                          background: config.bgColor,
                          border: `1px solid ${config.color}20`,
                        }}
                      >
                        <StatusIcon
                          size={24}
                          style={{ color: config.color }}
                          className="shrink-0"
                        />
                        <div>
                          <div
                            className="font-bold text-base"
                            style={{ color: config.color }}
                          >
                            {config.label}
                          </div>
                          <div className="text-xs text-[color:var(--text-secondary)] mt-0.5">
                            Token:{" "}
                            <span className="font-mono font-bold">
                              {result.token}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Details Grid */}
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <div className="text-xs font-semibold text-[color:var(--text-muted)] uppercase tracking-wider mb-1">
                        Category
                      </div>
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-blue-100 text-blue-800">
                        {result.category}
                      </span>
                    </div>

                    <div>
                      <div className="text-xs font-semibold text-[color:var(--text-muted)] uppercase tracking-wider mb-1">
                        Submitted
                      </div>
                      <div className="flex items-center gap-1.5 text-sm text-[color:var(--text-secondary)]">
                        <Clock size={14} />
                        {result.timestamp?.toDate
                          ? new Date(
                              result.timestamp.toDate()
                            ).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "long",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "Date unavailable"}
                      </div>
                    </div>

                    <div className="sm:col-span-2">
                      <div className="text-xs font-semibold text-[color:var(--text-muted)] uppercase tracking-wider mb-1">
                        Location
                      </div>
                      <div className="flex items-center gap-1.5 text-sm text-[color:var(--text-secondary)]">
                        <MapPin
                          size={14}
                          className="shrink-0 text-[color:var(--primary)]"
                        />
                        {result.location}
                      </div>
                    </div>

                    <div className="sm:col-span-2">
                      <div className="text-xs font-semibold text-[color:var(--text-muted)] uppercase tracking-wider mb-1">
                        Description
                      </div>
                      <p className="text-sm text-[color:var(--text-primary)] leading-relaxed">
                        {result.description}
                      </p>
                    </div>

                    <div className="sm:col-span-2 pt-2 border-t border-[color:var(--border)]">
                      <button
                        onClick={handleUpvote}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-[10px] text-sm font-semibold bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100 transition-colors"
                      >
                        <ThumbsUp size={16} /> I have this issue too ({result.upvotes || 0})
                      </button>
                    </div>

                    {result.photoURL && (
                      <div className="sm:col-span-2">
                        <div className="text-xs font-semibold text-[color:var(--text-muted)] uppercase tracking-wider mb-1">
                          Photo Evidence
                        </div>
                        <img
                          src={result.photoURL}
                          alt="Complaint photo"
                          className="w-full max-h-64 object-cover rounded-[12px] border border-[color:var(--border)]"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </Reveal>
            ) : (
              <Reveal>
                <div
                  className="bg-white rounded-[20px] p-8 text-center"
                  style={{
                    border: "1px solid var(--border)",
                    boxShadow: "var(--shadow-md)",
                  }}
                >
                  <div className="w-16 h-16 mx-auto rounded-full bg-slate-100 flex items-center justify-center mb-4">
                    <Search size={28} className="text-slate-400" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900">
                    No report found
                  </h3>
                  <p className="mt-2 text-sm text-[color:var(--text-secondary)] max-w-sm mx-auto">
                    We couldn't find a report matching that token. Please
                    double-check the token and try again.
                  </p>
                </div>
              </Reveal>
            )}
          </div>
        )}

        {/* Help text */}
        <Reveal delay={320}>
          <div
            className="mt-10 p-5 rounded-[16px] text-sm text-[color:var(--text-secondary)] leading-relaxed"
            style={{
              background: "var(--surface-2)",
              border: "1px solid var(--border)",
            }}
          >
            <strong className="text-[color:var(--text-primary)]">
              Where do I find my token?
            </strong>
            <br />
            You receive a tracking token (e.g.,{" "}
            <code className="font-mono text-xs bg-white px-1.5 py-0.5 rounded border border-[color:var(--border)]">
              CVC-A3F82B10
            </code>
            ) immediately after submitting a report. Save it to check your
            complaint status anytime.
          </div>
        </Reveal>
      </div>
    </section>
  );
}
