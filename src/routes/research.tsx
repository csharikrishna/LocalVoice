import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowRight } from "lucide-react";
import { Reveal } from "@/components/civic/Reveal";

export const Route = createFileRoute("/research")({
  head: () => ({
    meta: [
      { title: "Field Research — LocalVoice" },
      {
        name: "description",
        content:
          "Door-to-door interviews and priority rankings from neighborhoods in Tirupati that shaped LocalVoice.",
      },
      {
        property: "og:title",
        content: "LocalVoice Field Research — Built from the neighborhood up",
      },
      {
        property: "og:description",
        content:
          "What we saw, heard, felt and thought — and the priority issues residents care about most.",
      },
    ],
  }),
  component: ResearchPage,
});

const observations = [
  {
    label: "SAW",
    text: "Broken streetlights at five intersections, unrepaired for over a month, leaving streets dark and unsafe at night.",
  },
  {
    label: "HEARD",
    text: "Residents completely frustrated by busy helpline numbers, complicated municipal apps, and unanswered ward visits.",
  },
  {
    label: "FELT",
    text: "A quiet, lingering resignation across the neighborhood — a shared feeling that nothing changes unless you know someone.",
  },
  {
    label: "THOUGHT",
    text: "What if reporting an issue was as universally easy as scanning a restaurant menu? What if the city came to them?",
  },
];

const methodology = [
  {
    step: "01",
    title: "Door-to-Door Surveys",
    desc: "We spoke with over 300 households to understand the daily civic frictions they face and why they don't report them.",
  },
  {
    step: "02",
    title: "Municipal Shadowing",
    desc: "We followed 5 sanitation workers and 2 civic engineers for a week to map their workflow and understand the bureaucratic bottlenecks.",
  },
  {
    step: "03",
    title: "Prototype Testing",
    desc: "We deployed low-fidelity paper prototypes with QR codes at local bus stops to test scanning viability across demographics.",
  },
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
          <Reveal>
            <span className="eyebrow">Field research</span>
          </Reveal>
          <Reveal delay={80}>
            <h1
              className="mt-3 text-4xl md:text-5xl font-extrabold"
              style={{ letterSpacing: "-0.03em" }}
            >
              From your neighborhood. For your neighborhood.
            </h1>
          </Reveal>
          <Reveal delay={160}>
            <p className="mt-5 text-lg text-[color:var(--text-secondary)] leading-[1.7] max-w-[520px]">
              We spent four weeks walking, listening and learning across Tirupati's Ward 4. These
              observations shaped every screen of LocalVoice.
            </p>
          </Reveal>
          <div className="mt-8 space-y-5">
            {observations.map((o, i) => (
              <Reveal key={o.label} delay={i * 100}>
                <div
                  className="bg-white rounded-[16px] p-5 pl-6 relative"
                  style={{ border: "1px solid var(--border)" }}
                >
                  <span
                    className="absolute left-0 top-4 bottom-4 w-[3px] rounded-full"
                    style={{ background: "var(--primary)" }}
                  />
                  <div
                    className="text-2xl font-extrabold text-[color:var(--primary)]"
                    style={{ letterSpacing: "-0.02em" }}
                  >
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
            <div
              className="bg-white rounded-[24px] p-7"
              style={{ border: "1px solid var(--border)", boxShadow: "var(--shadow-md)" }}
            >
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
        </div>
      </div>

      <div className="container-x mt-24">
        <Reveal>
          <span className="eyebrow">Our Methodology</span>
        </Reveal>
        <Reveal delay={80}>
          <h2
            className="mt-3 text-3xl font-extrabold text-slate-900"
            style={{ letterSpacing: "-0.02em" }}
          >
            How we built the foundation.
          </h2>
        </Reveal>

        <div className="mt-12 grid md:grid-cols-3 gap-8">
          {methodology.map((m, i) => (
            <Reveal key={m.step} delay={i * 100}>
              <div className="bg-white p-8 rounded-[20px] border border-slate-200 shadow-sm h-full hover:-translate-y-1 transition-transform">
                <span className="text-4xl font-black text-slate-200 mb-6 block">{m.step}</span>
                <h3 className="text-xl font-bold text-slate-900 mb-3">{m.title}</h3>
                <p className="text-slate-600 leading-relaxed">{m.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>

        <div className="mt-16 text-center">
          <Link
            to="/tech"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-full font-bold text-lg bg-slate-950 text-white hover:bg-slate-800 transition-colors shadow-lg hover:shadow-xl"
          >
            See the technology stack <ArrowRight size={18} />
          </Link>
        </div>
      </div>
    </section>
  );
}

function ScoreBar({
  name,
  score,
  top,
  delay,
}: {
  name: string;
  score: number;
  top?: boolean;
  delay: number;
}) {
  const [w, setW] = useState(0);
  const ref = useRef<HTMLLIElement | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            setTimeout(() => setW((score / 20) * 100), delay);
            io.disconnect();
          }
        });
      },
      { threshold: 0.3 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [score, delay]);

  return (
    <li ref={ref}>
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">{name}</span>
          {top && (
            <span
              className="text-[10px] font-bold uppercase tracking-wider text-white px-2 py-0.5 rounded-full"
              style={{ background: "var(--success)", letterSpacing: "0.08em" }}
            >
              Top priority
            </span>
          )}
        </div>
        <span className="text-sm text-[color:var(--text-muted)] font-mono">{score} / 20</span>
      </div>
      <div
        className="h-2.5 rounded-full overflow-hidden"
        style={{ background: "var(--surface-2)" }}
      >
        <div
          className="h-full rounded-full"
          style={{
            width: `${w}%`,
            background: top
              ? "linear-gradient(90deg, var(--primary), var(--accent))"
              : "var(--primary)",
            transition: "width 1.2s cubic-bezier(0.16,1,0.3,1)",
          }}
        />
      </div>
    </li>
  );
}
