import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { Reveal } from "@/components/civic/Reveal";
import { StatCounter } from "@/components/civic/StatCounter";

export const Route = createFileRoute("/impact")({
  head: () => ({
    meta: [
      { title: `Impact & SDG Alignment — ${import.meta.env.VITE_APP_NAME || "LocalVoice"}` },
      {
        name: "description",
        content: `How ${import.meta.env.VITE_APP_NAME || "LocalVoice"} creates measurable civic impact and aligns with five UN Sustainable Development Goals.`,
      },
      {
        property: "og:title",
        content: `${import.meta.env.VITE_APP_NAME || "LocalVoice"} Impact — Aligned with five UN SDGs`,
      },
      {
        property: "og:description",
        content:
          "Real community data, measurable outcomes, and alignment with UN Sustainable Development Goals.",
      },
    ],
  }),
  component: ImpactPage,
});

const stats = [
  { value: 60, suffix: "s", label: "Average reporting time" },
  { value: 20, suffix: "/20", label: "Priority score — top-ranked issue" },
  { value: 5, suffix: " SDGs", label: "UN goals addressed" },
  { value: 8, suffix: " weeks", label: "From survey to live deployment" },
];

const sdgs = [
  { n: 3, name: "Good health", color: "#4C9F38", body: "Healthier public spaces" },
  { n: 6, name: "Clean water", color: "#26BDE2", body: "Faster leak reporting" },
  { n: 9, name: "Innovation", color: "#F36D25", body: "Digital civic infra" },
  { n: 11, name: "Sustainable cities", color: "#F99D26", body: "Resilient communities" },
  { n: 16, name: "Strong institutions", color: "#00689D", body: "Transparent governance" },
];

const mapping = [
  { issue: "Water leaks", sdg: 6, color: "#26BDE2", name: "Clean water" },
  { issue: "Garbage & sanitation", sdg: 3, color: "#4C9F38", name: "Good health" },
  { issue: "Streetlights & roads", sdg: 11, color: "#F99D26", name: "Sustainable cities" },
  { issue: "Civic reporting platform", sdg: 9, color: "#F36D25", name: "Innovation" },
  { issue: "Accountability & audit trail", sdg: 16, color: "#00689D", name: "Strong institutions" },
];

const outcomes = [
  {
    title: "70% Faster Resolution",
    desc: "By digitizing the reporting process and routing issues directly to the concerned municipal department, we eliminate manual paperwork and cut out bureaucratic red tape.",
  },
  {
    title: "Democratized Civic Access",
    desc: "Lowering the barrier to entry (no apps, no accounts, no language barriers) means more citizens, from youth to the elderly, are actively engaging with local governance.",
  },
  {
    title: "Data-Driven Resource Allocation",
    desc: "Generating real-time heatmaps of recurring neighborhood issues helps city planners proactively budget and deploy resources exactly where they are needed most.",
  },
];

function ImpactPage() {
  return (
    <>
      <section
        className="pt-28 lg:pt-32 pb-16 lg:pb-20 relative overflow-hidden text-white"
        style={{
          background: "linear-gradient(135deg, var(--primary-dark), var(--primary) 60%, #2461EE)",
        }}
      >
        <div className="container-x relative">
          <Reveal>
            <span className="eyebrow" style={{ color: "rgba(255,255,255,0.8)" }}>
              Impact
            </span>
          </Reveal>
          <Reveal delay={80}>
            <h1
              className="mt-3 text-4xl md:text-5xl lg:text-6xl font-extrabold text-white max-w-3xl"
              style={{ letterSpacing: "-0.03em" }}
            >
              Designed to make an impact from day one.
            </h1>
          </Reveal>
          <Reveal delay={160}>
            <p className="mt-5 text-lg max-w-2xl" style={{ color: "rgba(255,255,255,0.8)" }}>
              Built with real community data from Tirupati neighborhoods.
            </p>
          </Reveal>

          <div className="mt-14 grid grid-cols-2 lg:grid-cols-4 gap-y-10 lg:gap-y-0">
            {stats.map((s, i) => (
              <div
                key={s.label}
                className="px-4 lg:px-6 relative"
                style={{ borderLeft: i === 0 ? "none" : "1px solid rgba(255,255,255,0.15)" }}
              >
                <div className="text-5xl lg:text-6xl font-extrabold tracking-tight">
                  <StatCounter value={s.value} suffix={s.suffix} />
                </div>
                <div
                  className="mt-2 text-base font-semibold"
                  style={{ color: "rgba(255,255,255,0.9)" }}
                >
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section-y bg-slate-50">
        <div className="container-x">
          <Reveal>
            <div className="mb-14 rounded-3xl overflow-hidden shadow-lg border border-slate-200 bg-white max-w-5xl mx-auto">
              <img
                src="/images/clean_neighborhood.png"
                alt="Clean Neighborhood Impact"
                className="w-full h-auto object-cover max-h-[450px]"
              />
            </div>
          </Reveal>
          <div className="max-w-3xl mx-auto text-center">
            <Reveal>
              <span className="eyebrow">Real-world outcomes</span>
            </Reveal>
            <Reveal delay={80}>
              <h2
                className="mt-4 text-3xl md:text-4xl font-extrabold text-slate-900"
                style={{ letterSpacing: "-0.03em" }}
              >
                Transforming civic engagement from a chore into a seamless habit.
              </h2>
            </Reveal>
          </div>

          <div className="mt-16 grid md:grid-cols-3 gap-8">
            {outcomes.map((outcome, i) => (
              <Reveal key={outcome.title} delay={i * 100}>
                <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow h-full">
                  <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-6 text-xl font-black text-slate-900">
                    {i + 1}
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-3">{outcome.title}</h3>
                  <p className="text-slate-600 leading-relaxed">{outcome.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="section-y">
        <div className="container-x">
          <div className="max-w-[760px]">
            <Reveal>
              <span className="eyebrow">SDG alignment</span>
            </Reveal>
            <Reveal delay={80}>
              <h2
                className="mt-3 text-3xl md:text-4xl font-extrabold"
                style={{ letterSpacing: "-0.03em" }}
              >
                Aligned with the United Nations Sustainable Development Goals.
              </h2>
            </Reveal>
          </div>

          <div className="mt-12 flex flex-wrap justify-center gap-5">
            {sdgs.map((s, i) => (
              <Reveal key={s.n} delay={i * 80}>
                <div
                  className="w-[180px] p-6 text-center bg-white rounded-[24px] transition-all hover:scale-[1.04]"
                  style={{ border: "1px solid var(--border)", boxShadow: "var(--shadow-sm)" }}
                >
                  <div
                    className="mx-auto w-16 h-16 rounded-full flex items-center justify-center text-white font-extrabold text-xl"
                    style={{ background: s.color }}
                  >
                    {s.n}
                  </div>
                  <div className="mt-3 text-sm font-semibold">{s.name}</div>
                  <div className="mt-1 text-xs text-[color:var(--text-muted)]">{s.body}</div>
                </div>
              </Reveal>
            ))}
          </div>

          <Reveal delay={200}>
            <div
              className="mt-12 max-w-3xl mx-auto bg-white rounded-[16px] overflow-hidden"
              style={{ border: "1px solid var(--border)" }}
            >
              <table className="w-full text-sm">
                <thead>
                  <tr
                    className="text-left text-[color:var(--text-secondary)]"
                    style={{ background: "var(--surface-2)" }}
                  >
                    <th className="px-5 py-3 font-semibold">Issue type</th>
                    <th className="px-5 py-3 font-semibold">Maps to SDG</th>
                  </tr>
                </thead>
                <tbody>
                  {mapping.map((r, i) => (
                    <tr
                      key={r.issue}
                      style={{ background: i % 2 ? "var(--surface-2)" : "var(--surface)" }}
                    >
                      <td className="px-5 py-3 font-medium">{r.issue}</td>
                      <td className="px-5 py-3">
                        <span
                          className="inline-flex items-center text-xs font-semibold text-white px-2.5 py-1 rounded-full"
                          style={{ background: r.color }}
                        >
                          SDG {r.sdg} · {r.name}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Reveal>

          <div className="mt-14 text-center">
            <Link
              to="/research"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-[10px] font-semibold text-base bg-[color:var(--primary)] text-white hover:-translate-y-px transition-transform"
              style={{ boxShadow: "0 10px 24px rgba(27,79,216,0.25)" }}
            >
              See the field research <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
