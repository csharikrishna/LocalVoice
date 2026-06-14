import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Menu, X, Printer } from "lucide-react";

const links = [
  { label: "Home", to: "/" as const },
  { label: "Impact", to: "/impact" as const },
  { label: "Research", to: "/research" as const },
  { label: "Tech", to: "/tech" as const },
  { label: "Track Report", to: "/track" as const },
  { label: "Live Map", to: "/map" as const },
];

export function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      aria-label="Main navigation"
      className="fixed top-0 inset-x-0 z-50"
      style={{
        background: scrolled ? "rgba(255,255,255,0.92)" : "rgba(247,249,252,0.80)",
        backdropFilter: "blur(16px)",
        borderBottom: scrolled ? "1px solid var(--border)" : "1px solid transparent",
        boxShadow: scrolled ? "var(--shadow-sm)" : "none",
        transition: "all 0.3s cubic-bezier(0.4,0,0.2,1)",
      }}
    >
      <div className="container-x flex items-center justify-between h-16">
        <Link to="/" className="flex items-center gap-2.5">
          <Logo />
          <span className="font-semibold text-[color:var(--text-primary)] tracking-tight">LocalVoice</span>
        </Link>

        <ul className="hidden lg:flex items-center gap-8">
          {links.map((l) => (
            <li key={l.to}>
              <Link
                to={l.to}
                activeOptions={{ exact: true }}
                activeProps={{ style: { color: "var(--primary)" } }}
                className="text-sm text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)] transition-colors"
              >
                {l.label}
              </Link>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-3">
          <Link
            to="/print-qr"
            className="hidden sm:inline-flex items-center gap-2 text-sm font-semibold text-[color:var(--primary)] bg-[color:var(--primary-tint)] border border-[color:var(--primary)] hover:bg-white px-4 py-2 rounded-[10px] transition-all hover:-translate-y-px"
          >
            <Printer size={16} />
            Print QR
          </Link>
          <Link
            to="/"
            hash="report"
            className="hidden sm:inline-flex items-center text-sm font-semibold text-white bg-[color:var(--primary)] hover:bg-[color:var(--primary-dark)] px-4 py-2 rounded-[10px] transition-all hover:-translate-y-px"
            style={{ boxShadow: "0 4px 14px rgba(27,79,216,0.25)" }}
          >
            Report a Problem
          </Link>
          <button
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            aria-controls="mobile-menu"
            onClick={() => setOpen((v) => !v)}
            className="lg:hidden inline-flex items-center justify-center w-10 h-10 rounded-[10px] text-[color:var(--text-primary)] hover:bg-[color:var(--surface-2)]"
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      <div
        id="mobile-menu"
        className="lg:hidden overflow-hidden transition-[max-height,opacity] duration-300"
        style={{
          maxHeight: open ? 600 : 0,
          opacity: open ? 1 : 0,
          borderTop: open ? "1px solid var(--border)" : "1px solid transparent",
          background: "rgba(255,255,255,0.98)",
          backdropFilter: "blur(16px)",
        }}
      >
        <ul className="container-x py-4 flex flex-col gap-1">
          {links.map((l, i) => (
            <li
              key={l.to}
              style={{
                opacity: open ? 1 : 0,
                transform: open ? "translateY(0)" : "translateY(-6px)",
                transition: `all 0.3s ease ${i * 60}ms`,
              }}
            >
              <Link
                to={l.to}
                onClick={() => setOpen(false)}
                className="block py-3 text-lg font-semibold text-[color:var(--text-primary)]"
              >
                {l.label}
              </Link>
            </li>
          ))}
          <li className="pt-4 pb-2 flex flex-col gap-3"
              style={{
                opacity: open ? 1 : 0,
                transform: open ? "translateY(0)" : "translateY(-6px)",
                transition: `all 0.3s ease ${links.length * 60}ms`,
              }}
          >
            <Link
              to="/"
              hash="report"
              onClick={() => setOpen(false)}
              className="flex items-center justify-center w-full text-base font-bold text-white bg-[color:var(--primary)] py-3.5 rounded-[12px]"
            >
              Report a Problem
            </Link>
            <Link
              to="/print-qr"
              onClick={() => setOpen(false)}
              className="flex items-center justify-center w-full gap-2 text-base font-bold text-[color:var(--primary)] bg-[color:var(--primary-tint)] border border-[color:var(--primary)] py-3.5 rounded-[12px]"
            >
              <Printer size={18} />
              Print QR Poster
            </Link>
          </li>
        </ul>
      </div>
    </nav>
  );
}

export function Logo() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
      <rect x="2" y="2" width="9" height="9" rx="2" fill="var(--primary)" />
      <rect x="13" y="2" width="9" height="9" rx="2" fill="var(--primary)" opacity="0.55" />
      <rect x="2" y="13" width="9" height="9" rx="2" fill="var(--primary)" opacity="0.55" />
      <rect x="13" y="13" width="9" height="9" rx="2" fill="var(--primary)" />
    </svg>
  );
}
