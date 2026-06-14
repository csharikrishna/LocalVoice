import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowRight } from "lucide-react";
import { Reveal } from "@/components/civic/Reveal";

export const Route = createFileRoute("/research")({
  head: () => ({
    meta: [
      { title: "Field Research — CivicScan" },
      { name: "description", content: "Door-to-door interviews and priority rankings from neighborhoods in Tirupati that shaped CivicScan." },
      { property: "og:title", content: "CivicScan Field Research — Built from the neighborhood up" },
      { property: "og:description", content: "What we saw, heard, felt and thought — and the priority issues residents care about most." },
    ],
  }),
  component: ResearchPage,
});

const observations = [
  { label: "SAW", text: "Broken streetlights at five intersections, unrepaired for over a month." },
  { label: "HEARD", text: "Residents frustrated by busy helpline numbers and unanswered visits." },
  { label: "FELT", text: "A quiet resignation — that nothing changes unless you know someone." },
  { label: "THOUGHT", text: "What if reporting an issue was as easy as scanning a code on the post itself?" },
];

const issueScores = [
  { name: "Streetlights out", score: 20, top: true },
  { name: "Water leakage", score: 18 },
  { name: "Garbage piles", score: 16 },
  { name: "Potholes", score: 14 },
  { name: "Open drains", score: 12 },
];

function ResearchPage() {
  return (
    <section className="pt-28 lg:pt-32 pb-20" style={{ background: "var(--surface-2)" }}>
      <div className="container-x grid lg:grid-cols-2 gap-12 lg:gap-16">
        <div>
          <Reveal><span className="eyebrow">Field research</span></Reveal>
          <Reveal delay={80}>
            <h1 className="mt-3 text-4xl md:text-5xl font-extrabold" style={{ letterSpacing: "-0.03em" }}>
              From your neighborhood. For your neighborhood.
            </h1>
          </Reveal>
          <Reveal delay={160}>
            <p className="mt-5 text-lg text-[color:var(--text-secondary)] leading-[1.7] max-w-[520px]">
              We spent four weeks walking, listening and learning across Tirupati's Ward 4.
              These observations shaped every screen of CivicScan.
            </p>
          </Reveal>
          <div className="mt-8 space-y-5">
            {observations.map((o, i) => (
              <Reveal key={o.label} delay={i * 100}>
                <div className="bg-white rounded-[16px] p-5 pl-6 relative" style={{ border: "1px solid var(--border)" }}>
                  <span className="absolute left-0 top-4 bottom-4 w-[3px] rounded-full" style={{ background: "var(--primary)" }} />
                  <div className="text-2xl font-extrabold text-[color:var(--primary)]" style={{ letterSpacing: "-0.02em" }}>
                    {o.label}
                  </div>
                  <p className="mt-2 text-base text-[color:var(--text-secondary)] leading-[1.65]">
                    {o.text}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>

        <div>
          <Reveal>
            <div className="bg-white rounded-[24px] p-7" style={{ border: "1px solid var(--border)", boxShadow: "var(--shadow-md)" }}>
              <h2 className="text-xl font-bold">Priority ranking</h2>
              <p className="mt-1 text-sm text-[color:var(--text-secondary)]">
                Issues ranked by community survey score (out of 20).
              </p>
              <ul className="mt-6 space-y-4">
                {issueScores.map((s, i) => (
                  <ScoreBar key={s.name} {...s} delay={i * 120} />
                ))}
              </ul>
            </div>
          </Reveal>

          <div className="mt-10">
            <Link
              to="/tech"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-[10px] font-semibold text-base bg-[color:var(--primary)] text-white hover:-translate-y-px transition-transform"
              style={{ boxShadow: "0 10px 24px rgba(27,79,216,0.25)" }}
            >
              See how we built it <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function ScoreBar({ name, score, top, delay }: { name: string; score: number; top?: boolean; delay: number }) {
  const [w, setW] = useState(0);
  const ref = useRef<HTMLLIElement | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          setTimeout(() => setW((score / 20) * 100), delay);
          io.disconnect();
        }
      });
    }, { threshold: 0.3 });
    io.observe(el);
    return () => io.disconnect();
  }, [score, delay]);

  return (
    <li ref={ref}>
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">{name}</span>
          {top && (
            <span className="text-[10px] font-bold uppercase tracking-wider text-white px-2 py-0.5 rounded-full" style={{ background: "var(--success)", letterSpacing: "0.08em" }}>
              Top priority
            </span>
          )}
        </div>
        <span className="text-sm text-[color:var(--text-muted)] font-mono">{score} / 20</span>
      </div>
      <div className="h-2.5 rounded-full overflow-hidden" style={{ background: "var(--surface-2)" }}>
        <div
          className="h-full rounded-full"
          style={{
            width: `${w}%`,
            background: top ? "linear-gradient(90deg, var(--primary), var(--accent))" : "var(--primary)",
            transition: "width 1.2s cubic-bezier(0.16,1,0.3,1)",
          }}
        />
      </div>
    </li>
  );
}
