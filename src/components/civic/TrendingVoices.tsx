import { motion, useInView } from "framer-motion";
import { useRef, useEffect, useState } from "react";
import {
  ArrowUp,
  MessageCircle,
  Share2,
  Shield,
  MapPin,
  AlertCircle,
  CheckCircle2,
  Wrench,
  Flame,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { getTrendingComplaints } from "@/lib/api/queries.functions";
import { Link } from "@tanstack/react-router";

type TrendingPost = {
  id: string;
  status?: string;
  category?: string;
  description?: string;
  location?: string;
  isAnonymous?: boolean;
  upvotes?: number;
};

const statusConfig: Record<string, { label: string; color: string; icon: LucideIcon }> = {
  open: { label: "Unresolved", color: "#dc2626", icon: AlertCircle },
  working: { label: "In Progress", color: "#d97706", icon: Wrench },
  closed: { label: "Resolved", color: "#16a34a", icon: CheckCircle2 },
};

export function TrendingVoices() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });
  const [trendingPosts, setTrendingPosts] = useState<TrendingPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTrending() {
      try {
        const data = await getTrendingComplaints();
        setTrendingPosts(data as any);
      } catch (err) {
        console.error("Error fetching trending voices:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchTrending();
  }, []);

  if (loading || trendingPosts.length === 0) return null;

  return (
    <section ref={ref} className="py-24 relative bg-slate-50 border-y border-slate-200">
      <div className="max-w-6xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6"
        >
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-px bg-[color:var(--primary)]" />
              <span className="font-semibold text-xs uppercase tracking-[0.2em] text-[color:var(--primary)] flex items-center gap-1.5">
                <Flame size={14} /> Trending Reports
              </span>
            </div>
            <h2 className="font-extrabold text-4xl md:text-5xl text-slate-900 leading-tight tracking-tight">
              Issues that need
              <br />
              <span className="text-[color:var(--primary)]">your attention</span>
            </h2>
          </div>
          <Link
            to="/map"
            search={{ issueId: undefined }}
            className="font-semibold text-sm uppercase tracking-wider text-[color:var(--primary)] hover:text-blue-800 transition-colors flex items-center gap-2"
          >
            View All Reports
            <span>→</span>
          </Link>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {trendingPosts.map((post, i) => {
            const conf = statusConfig[post.status ?? "open"] || statusConfig.open;
            return (
              <motion.article
                key={post.id}
                initial={{ opacity: 0, y: 30 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="group bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md hover:border-[color:var(--primary)] transition-all duration-300 relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-[color:var(--primary)]/5 rounded-bl-[100px] -z-10 group-hover:scale-110 transition-transform duration-500" />

                <div className="flex items-start justify-between gap-4 mb-4">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 bg-slate-100 px-2.5 py-1 rounded-md">
                    {post.category}
                  </span>
                  <div className="flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-md bg-red-50 text-red-700 border border-red-100">
                    <ArrowUp size={14} /> {post.upvotes || 0}
                  </div>
                </div>

                <h3 className="font-bold text-xl text-slate-800 mb-3 group-hover:text-[color:var(--primary)] transition-colors leading-snug line-clamp-2">
                  {post.description}
                </h3>

                <div className="flex items-center gap-4 text-slate-500 text-xs font-medium mb-5">
                  <span className="flex items-center gap-1.5 truncate max-w-[200px]">
                    <MapPin size={14} />
                    <span className="truncate">{post.location}</span>
                  </span>
                  <span className="shrink-0 flex items-center gap-1">
                    <Shield
                      size={12}
                      className={
                        post.isAnonymous ? "text-slate-400" : "text-[color:var(--primary)]"
                      }
                    />
                    {post.isAnonymous ? "Anonymous" : "Verified Citizen"}
                  </span>
                </div>

                <div className="pt-5 border-t border-slate-100 flex items-center justify-between">
                  <Link
                    to="/map"
                    search={{ issueId: post.id }}
                    className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-slate-50 hover:bg-blue-50 text-[color:var(--primary)] font-semibold text-sm transition-colors border border-slate-200 hover:border-blue-200"
                  >
                    View on Map
                  </Link>
                  <button className="p-2.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors">
                    <Share2 size={18} />
                  </button>
                </div>
              </motion.article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
