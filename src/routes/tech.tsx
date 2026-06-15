import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ShieldCheck, Lock, Key } from "lucide-react";
import { Reveal } from "@/components/civic/Reveal";

export const Route = createFileRoute("/tech")({
  head: () => ({
    meta: [
      { title: "Tech & Timeline — LocalVoice" },
      {
        name: "description",
        content:
          "The technology, system flow, security model, and 8-week build timeline behind LocalVoice.",
      },
      { property: "og:title", content: "LocalVoice Architecture — Open, secure, reliable" },
      {
        property: "og:description",
        content: "System flow, technology stack, security model and an 8-week deployment timeline.",
      },
    ],
  }),
  component: TechPage,
});

function TechPage() {
  return (
    <>
      <section className="pt-28 lg:pt-32 pb-10">
        <div className="container-x max-w-[760px]">
          <Reveal>
            <span className="eyebrow">Architecture</span>
          </Reveal>
          <Reveal delay={80}>
            <h1
              className="mt-3 text-4xl md:text-5xl font-extrabold"
              style={{ letterSpacing: "-0.03em" }}
            >
              Built on reliable, open infrastructure.
            </h1>
          </Reveal>
          <Reveal delay={160}>
            <p className="mt-5 text-lg text-[color:var(--text-secondary)] leading-[1.7]">
              A lightweight, browser-first stack that runs anywhere a phone has signal — and
              degrades gracefully when it doesn't.
            </p>
          </Reveal>
        </div>
      </section>

      <TechArch />
      <Timeline />
    </>
  );
}

function TechArch() {
  const [tab, setTab] = useState(0);
  const tabs = ["System flow", "Technology stack", "Security"];

  return (
    <section className="pb-20">
      <div className="container-x">
        <div
          className="flex gap-6 border-b"
          style={{ borderColor: "var(--border)" }}
          role="tablist"
        >
          {tabs.map((t, i) => (
            <button
              key={t}
              role="tab"
              aria-selected={tab === i}
              onClick={() => setTab(i)}
              className="relative pb-3 text-sm font-semibold transition-colors"
              style={{ color: tab === i ? "var(--primary)" : "var(--text-muted)" }}
            >
              {t}
              {tab === i && (
                <span
                  className="absolute inset-x-0 -bottom-px h-0.5"
                  style={{ background: "var(--primary)" }}
                />
              )}
            </button>
          ))}
        </div>

        <div key={tab} className="mt-10" style={{ animation: "fade-in 0.4s ease" }}>
          {tab === 0 && <SystemFlow />}
          {tab === 1 && <TechStack />}
          {tab === 2 && <Security />}
        </div>
      </div>
    </section>
  );
}

function SystemFlow() {
  const nodes = [
    "QR code",
    "Mobile browser",
    "Geolocation + form",
    "Secure cloud",
    "Admin dashboard",
  ];
  return (
    <div
      className="bg-white rounded-[16px] p-6 lg:p-10 overflow-x-auto"
      style={{ border: "1px solid var(--border)" }}
    >
      <div className="flex items-center gap-3 min-w-max">
        {nodes.map((n, i) => (
          <div key={n} className="flex items-center gap-3">
            <div
              className="px-4 py-2.5 rounded-full text-sm font-semibold whitespace-nowrap"
              style={{
                background: "var(--primary-tint)",
                color: "var(--primary)",
                border: "1px solid rgba(27,79,216,0.18)",
              }}
            >
              {n}
            </div>
            {i < nodes.length - 1 && (
              <svg width="60" height="20" aria-hidden="true">
                <line
                  x1="0"
                  y1="10"
                  x2="60"
                  y2="10"
                  stroke="var(--accent)"
                  strokeWidth="2"
                  strokeDasharray="6 6"
                  style={{ animation: "dash-pulse 1.2s linear infinite" }}
                />
              </svg>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function TechStack() {
  const stack = [
    {
      title: "HTML5 Geolocation API",
      category: "Core Functionality",
      desc: "Instantly captures and validates citizen coordinates to pinpoint issues down to a 5-meter radius without requiring manual address entry.",
    },
    {
      title: "Dynamic QR Routing",
      category: "Identity & Linking",
      desc: "Unique QR nodes embedded with ward, street, and asset data. Scanning instantly loads the precise reporting form for that exact physical location.",
    },
    {
      title: "Firebase / Firestore",
      category: "Database & Backend",
      desc: "A robust NoSQL cloud database that handles real-time complaint ingestion, automatic indexing, and live dashboard syncing with zero latency.",
    },
    {
      title: "TanStack Router",
      category: "Navigation & State",
      desc: "Type-safe routing and state management that ensures snappy page transitions, search-param driven filtering, and zero hydration mismatches.",
    },
    {
      title: "Tailwind CSS",
      category: "UI & Design System",
      desc: "A utility-first CSS framework that allows us to build a lightning-fast, 100% mobile-responsive design system with custom brand tokens.",
    },
    {
      title: "PWA Capabilities",
      category: "Progressive Web App",
      desc: "The app works beautifully in a mobile browser but behaves like a native app, allowing offline data caching and fast loading over 3G networks.",
    },
  ];
  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
      {stack.map((item, i) => (
        <Reveal key={item.title} delay={i * 80}>
          <div className="bg-white p-6 rounded-[20px] border border-slate-200 shadow-sm hover:shadow-md transition-all h-full">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 block">
              {item.category}
            </span>
            <h3 className="text-xl font-bold text-slate-900 mb-3">{item.title}</h3>
            <p className="text-sm text-slate-600 leading-relaxed">{item.desc}</p>
          </div>
        </Reveal>
      ))}
    </div>
  );
}

function Security() {
  const items = [
    {
      icon: ShieldCheck,
      title: "End-to-End Encryption",
      body: "All network traffic is encrypted via TLS 1.3 HTTPS, ensuring citizen data is completely secure in transit.",
    },
    {
      icon: Key,
      title: "Zero-Account Anonymity",
      body: "We strictly adhere to privacy-first principles. No account is required, and we don't collect PII unless you explicitly opt in.",
    },
    {
      icon: Lock,
      title: "Row-Level Database Rules",
      strict: true,
      body: "Strict Firebase Security Rules ensure that complaints can only be written by users, but only read or modified by authenticated Municipal Admins.",
    },
  ];
  return (
    <div className="grid sm:grid-cols-3 gap-5">
      {items.map((it) => (
        <div
          key={it.title}
          className="p-6 bg-white rounded-[16px]"
          style={{ border: "1px solid var(--border)" }}
        >
          <div
            className="w-11 h-11 rounded-[10px] flex items-center justify-center"
            style={{ background: "var(--primary-tint)" }}
          >
            <it.icon size={22} className="text-[color:var(--primary)]" />
          </div>
          <h3 className="mt-4 text-lg font-bold">{it.title}</h3>
          <p className="mt-2 text-sm text-[color:var(--text-secondary)] leading-[1.65]">
            {it.body}
          </p>
        </div>
      ))}
    </div>
  );
}

const weeks = [
  { n: 1, phase: "Field survey", activity: "Door-to-door interviews across Ward 4." },
  { n: 2, phase: "Issue mapping", activity: "Categorised top civic pain points." },
  { n: 3, phase: "Design system", activity: "Built tokens, typography, components." },
  { n: 4, phase: "Form & GPS", activity: "Geolocation flow + complaint schema." },
  { n: 5, phase: "QR generation", activity: "Bulk QR sticker design and printing." },
  { n: 6, phase: "Admin dashboard", activity: "Live map and resolution workflow." },
  { n: 7, phase: "Pilot deploy", activity: "Tested with three local resident groups." },
  { n: 8, phase: "Public launch", activity: "Citywide rollout with municipal partners." },
];

function Timeline() {
  const ref = useRef<HTMLDivElement | null>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onScroll = () => {
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight;
      const total = rect.height + vh * 0.5;
      const passed = Math.max(0, vh - rect.top);
      const p = Math.min(1, Math.max(0, passed / total));
      setProgress(p);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <section className="section-y" style={{ background: "var(--surface-2)" }}>
      <div className="container-x">
        <div className="max-w-[760px]">
          <Reveal>
            <span className="eyebrow">Timeline</span>
          </Reveal>
          <Reveal delay={80}>
            <h2
              className="mt-3 text-3xl md:text-4xl font-extrabold"
              style={{ letterSpacing: "-0.03em" }}
            >
              Eight weeks. One community. Real change.
            </h2>
          </Reveal>
        </div>

        <div ref={ref} className="mt-14 relative">
          <div
            className="absolute left-5 lg:left-1/2 lg:-translate-x-1/2 top-0 bottom-0 w-[2px]"
            style={{ background: "var(--border)" }}
            aria-hidden="true"
          >
            <div
              className="w-full origin-top"
              style={{
                height: "100%",
                background: "linear-gradient(to bottom, var(--primary), var(--accent))",
                transform: `scaleY(${progress})`,
                transformOrigin: "top",
                transition: "transform 0.1s linear",
              }}
            />
          </div>

          <ol className="space-y-10">
            {weeks.map((w, i) => (
              <Reveal key={w.n} delay={i * 60}>
                <li
                  className={`relative grid lg:grid-cols-2 gap-4 lg:gap-12 items-center ${i % 2 ? "lg:[&>div:first-child]:order-2" : ""}`}
                >
                  <span
                    aria-hidden="true"
                    className="absolute left-5 lg:left-1/2 -translate-x-1/2 w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm z-10"
                    style={{
                      background: "var(--primary)",
                      boxShadow: "0 0 0 5px var(--primary-tint)",
                      top: "50%",
                      marginTop: "-20px",
                    }}
                  >
                    {w.n}
                  </span>
                  <div
                    className={
                      i % 2 ? "lg:pl-16 pl-16 lg:pr-0" : "pl-16 lg:pl-0 lg:pr-16 lg:text-right"
                    }
                  />
                  <div className={i % 2 ? "lg:pr-16 pl-16 lg:pl-0" : "pl-16 lg:pl-16"}>
                    <div
                      className="bg-white rounded-[16px] p-5"
                      style={{ border: "1px solid var(--border)", boxShadow: "var(--shadow-sm)" }}
                    >
                      <div
                        className="text-xs font-bold text-[color:var(--primary)]"
                        style={{ letterSpacing: "0.08em" }}
                      >
                        WEEK {w.n}
                      </div>
                      <div className="mt-1 text-lg font-bold">{w.phase}</div>
                      <p className="mt-1.5 text-sm text-[color:var(--text-secondary)]">
                        {w.activity}
                      </p>
                      <span
                        className="inline-flex items-center gap-1 mt-3 text-[11px] font-semibold text-white px-2 py-1 rounded-full"
                        style={{ background: "var(--success)" }}
                      >
                        ✓ Complete
                      </span>
                    </div>
                  </div>
                </li>
              </Reveal>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
