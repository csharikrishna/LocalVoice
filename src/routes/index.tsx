import { createFileRoute, Link } from "@tanstack/react-router";
import {
  QrCode, MapPin, CheckCircle2, Zap, Camera, FolderTree,
  LayoutDashboard, Search, Database, ShieldCheck,
  ArrowRight, Sparkles, Printer
} from "lucide-react";
import { PulseMap } from "@/components/civic/PulseMap";
import { Reveal } from "@/components/civic/Reveal";
import { ComplaintForm } from "@/components/civic/ComplaintForm";
import { useTranslation } from "react-i18next";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "LocalVoice — Report local issues in 60 seconds" },
      {
        name: "description",
        content:
          "Scan a QR sticker on any public asset and report civic issues to the right authority in under a minute. No app, no account.",
      },
    ],
  }),
  component: Home,
});

function Home() {
  return (
    <>
      <Hero />
      <Problem />
      <HowItWorks />
      <ReportSection />
      <Features />
      <ExploreMore />
      <FinalCTA />
    </>
  );
}

/* ---------------- HERO ---------------- */
function Hero() {
  const { t } = useTranslation();

  return (
    <section className="relative pt-28 lg:pt-32 pb-16 lg:pb-24 overflow-hidden">
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(60% 50% at 85% 10%, rgba(27,79,216,0.08), transparent 60%)",
        }}
      />
      <div className="container-x relative grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
        <div>
          <Reveal delay={50}>
            <span
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full"
              style={{
                background: "var(--primary-tint)",
                color: "var(--primary)",
                border: "1px solid rgba(27,79,216,0.2)",
                letterSpacing: "0.05em",
              }}
            >
              <Sparkles size={12} /> APSCHE-Recognised Community Service Project 2026–27
            </span>
          </Reveal>

          <h1
            className="mt-6 font-extrabold leading-[1.05] text-5xl md:text-6xl lg:text-[72px]"
            style={{ letterSpacing: "-0.04em" }}
          >
            <Reveal delay={120}>
              <span className="block" dangerouslySetInnerHTML={{ __html: t("home.title", "Smarter <br/> communities <br/> <span style='color: var(--primary)'>start with a scan.</span>") }} />
            </Reveal>
          </h1>

          <Reveal delay={380}>
            <p className="mt-7 text-lg lg:text-xl text-[color:var(--text-secondary)] max-w-[560px] leading-[1.55]">
              {t("home.subtitle", "LocalVoice turns every public asset into a reporting channel. Scan the QR, describe the problem, and it lands with the right authority — in under 60 seconds.")}
            </p>
          </Reveal>

          <Reveal delay={460}>
            <div className="mt-9 flex flex-wrap items-center gap-3.5">
              <a
                href="#report"
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-[10px] font-semibold text-base text-white bg-[color:var(--primary)] hover:bg-[color:var(--primary-dark)] transition-all hover:-translate-y-px"
                style={{ boxShadow: "0 10px 30px rgba(27,79,216,0.32)" }}
              >
                <QrCode size={18} /> {t("home.reportBtn", "Try the report form")}
              </a>
              <Link
                to="/research"
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-[10px] font-semibold text-base bg-white text-[color:var(--text-primary)] border border-[color:var(--border)] hover:border-[color:var(--primary)] hover:text-[color:var(--primary)] transition-all"
              >
                See field research <ArrowRight size={16} />
              </Link>
            </div>
          </Reveal>

          <Reveal delay={550}>
            <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-[color:var(--text-muted)]">
              <span>⚡ 60-second reporting</span>
              <span className="opacity-40">•</span>
              <span>📍 GPS-accurate location</span>
              <span className="opacity-40">•</span>
              <span>🔒 No account needed</span>
            </div>
          </Reveal>
        </div>

        <Reveal delay={300} className="relative">
          <PulseMap />
        </Reveal>
      </div>
    </section>
  );
}

/* ---------------- PROBLEM ---------------- */
const painPoints = [
  { icon: "🔇", title: "No one to call", body: "Residents don't know which department handles which issue." },
  { icon: "📋", title: "Endless paperwork", body: "Filing a complaint requires forms, offices, and patience." },
  { icon: "🔍", title: "Zero tracking", body: "Once submitted, complaints vanish into a black hole." },
  { icon: "⏳", title: "Weeks of delay", body: "Minor issues remain unresolved for months at a time." },
  { icon: "🤷", title: "No accountability", body: "No way to know if anyone is actually working on it." },
];

function Problem() {
  return (
    <section className="section-y" style={{ background: "var(--surface-2)" }}>
      <div className="container-x">
        <div className="max-w-[760px] mx-auto text-center">
          <Reveal><span className="eyebrow">The problem</span></Reveal>
          <Reveal delay={80}>
            <h2 className="mt-3 text-3xl md:text-4xl font-extrabold" style={{ letterSpacing: "-0.03em" }}>
              Local problems stay broken for weeks. Sometimes months.
            </h2>
          </Reveal>
          <Reveal delay={160}>
            <p className="mt-5 text-lg text-[color:var(--text-secondary)] leading-[1.7]">
              In most neighborhoods, reporting a broken streetlight means calling a number
              that rings out. Reporting a pothole means finding the right office. LocalVoice
              changes that with a single scan.
            </p>
          </Reveal>
        </div>

        <div className="mt-14 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {painPoints.map((p, i) => (
            <Reveal key={p.title} delay={i * 80}>
              <div
                className="group h-full bg-white p-6 rounded-[16px] transition-all hover:-translate-y-1"
                style={{ border: "1px solid var(--border)", boxShadow: "var(--shadow-sm)" }}
              >
                <div className="text-3xl">{p.icon}</div>
                <h3 className="mt-3 text-lg font-bold">{p.title}</h3>
                <p className="mt-1.5 text-sm text-[color:var(--text-secondary)] leading-[1.6]">{p.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------- HOW IT WORKS ---------------- */
const steps = [
  { n: 1, title: "Scan the QR", body: "Point your camera at the QR sticker on any public asset." },
  { n: 2, title: "Pick a category", body: "We pre-fill location and category based on the sticker." },
  { n: 3, title: "Describe it", body: "Add a quick note and optional photo. No login required." },
  { n: 4, title: "Authority resolves it", body: "The right department gets it instantly — and you get updates." },
];

function HowItWorks() {
  return (
    <section id="how" className="section-y">
      <div className="container-x">
        <div className="max-w-[760px]">
          <Reveal><span className="eyebrow">How it works</span></Reveal>
          <Reveal delay={80}>
            <h2 className="mt-3 text-3xl md:text-4xl font-extrabold" style={{ letterSpacing: "-0.03em" }}>
              Four steps. About sixty seconds.
            </h2>
          </Reveal>
        </div>

        <ol className="mt-12 grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {steps.map((s, i) => (
            <Reveal key={s.n} delay={i * 90}>
              <li className="h-full bg-white rounded-[16px] p-6 relative" style={{ border: "1px solid var(--border)" }}>
                <span
                  className="inline-flex items-center justify-center w-10 h-10 rounded-[10px] font-bold text-white"
                  style={{ background: "var(--primary)" }}
                >
                  {s.n}
                </span>
                <h3 className="mt-4 text-lg font-bold">{s.title}</h3>
                <p className="mt-1.5 text-sm text-[color:var(--text-secondary)] leading-[1.6]">{s.body}</p>
              </li>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}

/* ---------------- REPORT ---------------- */
function ReportSection() {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-y-0 right-0 w-full lg:w-[45%]" style={{ background: "var(--primary)" }} aria-hidden="true" />
      <div className="container-x relative grid lg:grid-cols-[1.1fr_1fr] gap-12 lg:gap-16 section-y items-center">
        <div>
          <Reveal><span className="eyebrow">Report an issue</span></Reveal>
          <Reveal delay={80}>
            <h2 className="mt-3 text-3xl md:text-4xl font-extrabold text-white lg:text-[color:var(--text-primary)]" style={{ letterSpacing: "-0.03em" }}>
              It's as easy as sending a WhatsApp message.
            </h2>
          </Reveal>
          <Reveal delay={160}>
            <p className="mt-5 text-lg text-slate-300 lg:text-[color:var(--text-secondary)] leading-[1.7] max-w-[520px]">
              Pick a category, confirm your auto-detected location, drop a quick description.
              That's it — your complaint goes straight to the right department.
            </p>
          </Reveal>
          <Reveal delay={240}>
            <ul className="mt-7 space-y-3">
              {[
                "Pre-filled forms based on the QR location",
                "No account or login required",
                "Live status tracking after submission",
              ].map((t) => (
                <li key={t} className="flex items-start gap-3 text-base text-slate-200 lg:text-[color:var(--text-primary)]">
                  <CheckCircle2 size={20} className="text-[color:var(--success)] shrink-0 mt-0.5" />
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </Reveal>
        </div>

        <div id="report" className="flex justify-center lg:justify-end min-w-0 w-full scroll-mt-24">
          <Reveal delay={180} className="w-full max-w-xl min-w-0">
            <ComplaintForm />
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/* ---------------- FEATURES ---------------- */
const features = [
  { icon: Zap, title: "Instant QR scanning", body: "No app download. Just a camera." },
  { icon: MapPin, title: "GPS auto-location", body: "Pinpoint-accurate coordinates captured the moment the form opens. No typing, no guessing.", featured: true },
  { icon: Camera, title: "Photo evidence", body: "Attach a photo directly from your phone camera." },
  { icon: FolderTree, title: "Smart categorization", body: "10 issue categories routed to the right department." },
  { icon: LayoutDashboard, title: "Admin dashboard", body: "Live map, analytics, and resolution tracking." },
  { icon: Search, title: "Track your report", body: "Look up your complaint status anytime with your tracking token." },
  { icon: Database, title: "Digital audit trail", body: "Every complaint stored, timestamped, searchable." },
  { icon: ShieldCheck, title: "Privacy first", body: "No account required. No personal data collected. Fully anonymous." },
];

function Features() {
  return (
    <section id="features" className="section-y" style={{ background: "var(--surface-2)" }}>
      <div className="container-x">
        <div className="max-w-[760px]">
          <Reveal><span className="eyebrow">Features</span></Reveal>
          <Reveal delay={80}>
            <h2 className="mt-3 text-3xl md:text-4xl font-extrabold" style={{ letterSpacing: "-0.03em" }}>
              Everything local governance needs, built into a single QR scan.
            </h2>
          </Reveal>
        </div>

        <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 auto-rows-fr">
          {features.map((f, i) => {
            const featured = f.featured;
            return (
              <Reveal key={f.title} delay={i * 60} className={featured ? "sm:col-span-2" : ""}>
                <FeatureCard f={f} featured={!!featured} />
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function FeatureCard({ f, featured }: { f: any; featured: boolean }) {
  return (
    <div
      className="group h-full p-7 rounded-[16px] transition-all hover:-translate-y-1"
      style={{
        background: featured ? "var(--primary)" : "#fff",
        color: featured ? "#fff" : "var(--text-primary)",
        border: featured ? "1px solid transparent" : "1px solid var(--border)",
        boxShadow: featured ? "var(--shadow-xl)" : "var(--shadow-sm)",
      }}
    >
      <div
        className="inline-flex items-center justify-center w-11 h-11 rounded-[10px]"
        style={{ background: featured ? "rgba(255,255,255,0.15)" : "var(--primary-tint)" }}
      >
        <f.icon size={22} color={featured ? "#fff" : "var(--primary)"} />
      </div>
      <h3 className="mt-4 text-xl font-bold">{f.title}</h3>
      <p
        className="mt-2 text-base leading-[1.65]"
        style={{ color: featured ? "rgba(255,255,255,0.85)" : "var(--text-secondary)" }}
      >
        {f.body}
      </p>
    </div>
  );
}

/* ---------------- EXPLORE MORE ---------------- */
function ExploreMore() {
  const cards = [
    {
      to: "/impact" as const,
      eyebrow: "Impact",
      title: "Measurable outcomes & UN SDGs",
      body: "How LocalVoice aligns with five Sustainable Development Goals and the metrics that prove it.",
    },
    {
      to: "/research" as const,
      eyebrow: "Field research",
      title: "From your neighborhood",
      body: "Door-to-door observations and the priority issues residents care about most.",
    },
    {
      to: "/tech" as const,
      eyebrow: "Architecture",
      title: "Tech, security & timeline",
      body: "System flow, the open stack we used, security model, and our 8-week build.",
    },
  ];
  return (
    <section className="section-y">
      <div className="container-x">
        <div className="max-w-[760px]">
          <Reveal><span className="eyebrow">Dig deeper</span></Reveal>
          <Reveal delay={80}>
            <h2 className="mt-3 text-3xl md:text-4xl font-extrabold" style={{ letterSpacing: "-0.03em" }}>
              The story behind the scan.
            </h2>
          </Reveal>
        </div>

        <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {cards.map((c, i) => (
            <Reveal key={c.to} delay={i * 90}>
              <Link
                to={c.to}
                className="group block h-full p-7 rounded-[16px] bg-white transition-all hover:-translate-y-1"
                style={{ border: "1px solid var(--border)", boxShadow: "var(--shadow-sm)" }}
              >
                <span className="eyebrow">{c.eyebrow}</span>
                <h3 className="mt-3 text-xl font-bold">{c.title}</h3>
                <p className="mt-2 text-base text-[color:var(--text-secondary)] leading-[1.65]">{c.body}</p>
                <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-[color:var(--primary)]">
                  Read more <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
                </span>
              </Link>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------- FINAL CTA ---------------- */
function FinalCTA() {
  return (
    <section
      className="section-y relative overflow-hidden text-white"
      style={{ background: "linear-gradient(135deg, #1B4FD8 0%, #0EA5E9 100%)" }}
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(rgba(255,255,255,0.18) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
          opacity: 0.18,
        }}
      />
      <div className="container-x relative text-center max-w-3xl mx-auto">
        <Reveal>
          <h2 className="text-4xl md:text-5xl font-extrabold text-white" style={{ letterSpacing: "-0.03em" }}>
            Your neighborhood deserves better. Start reporting in 60 seconds.
          </h2>
        </Reveal>
        <Reveal delay={120}>
          <p className="mt-5 text-lg" style={{ color: "rgba(255,255,255,0.85)" }}>
            No account. No app. No paperwork. Just a QR scan.
          </p>
        </Reveal>
        <Reveal delay={220}>
          <div className="mt-9 flex flex-wrap justify-center gap-3.5">
            <a
              href="#report"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-[10px] font-semibold text-base bg-white text-[color:var(--primary)] transition-all hover:scale-[1.03]"
              style={{ boxShadow: "0 10px 30px rgba(0,0,0,0.18)" }}
            >
              Scan your first issue <ArrowRight size={16} />
            </a>
            <Link
              to="/impact"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-[10px] font-semibold text-base text-white transition-all hover:bg-white/10"
              style={{ border: "1px solid rgba(255,255,255,0.5)" }}
            >
              See the impact
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
