import { useEffect, useRef, useState } from "react";

type Ring = { id: number; cx: number; cy: number };

export function PulseMap() {
  const [cols, setCols] = useState(12);
  const [rows, setRows] = useState(8);
  const [rings, setRings] = useState<Ring[]>([]);
  const [activeDots, setActiveDots] = useState<Record<string, number>>({});
  const ridRef = useRef(0);

  useEffect(() => {
    const apply = () => {
      if (window.innerWidth < 640) {
        setCols(6);
        setRows(4);
      } else {
        setCols(12);
        setRows(8);
      }
    };
    apply();
    window.addEventListener("resize", apply);
    return () => window.removeEventListener("resize", apply);
  }, []);

  useEffect(() => {
    let alive = true;
    const tick = () => {
      if (!alive) return;
      const x = Math.floor(Math.random() * cols);
      const y = Math.floor(Math.random() * rows);
      const cx = 24 + x * 36;
      const cy = 24 + y * 36;
      const id = ++ridRef.current;
      const key = `${x}-${y}`;
      setActiveDots((d) => ({ ...d, [key]: id }));
      setRings((r) => [...r, { id, cx, cy }]);
      setTimeout(() => {
        setActiveDots((d) => {
          const n = { ...d };
          if (n[key] === id) delete n[key];
          return n;
        });
      }, 400);
      setTimeout(() => {
        setRings((r) => r.filter((rr) => rr.id !== id));
      }, 1500);
      const next = 800 + Math.random() * 1200;
      setTimeout(tick, next);
    };
    const t = setTimeout(tick, 400);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [cols, rows]);

  const width = 24 + cols * 36 + 12;
  const height = 24 + rows * 36 + 12;

  const dots = [];
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const key = `${x}-${y}`;
      const active = activeDots[key] != null;
      dots.push(
        <circle
          key={key}
          cx={24 + x * 36}
          cy={24 + y * 36}
          r={3}
          fill={active ? "var(--primary)" : "var(--border-hover)"}
          opacity={active ? 1 : 0.6}
          style={{ transition: "fill 0.2s, opacity 0.2s" }}
        />
      );
    }
  }

  return (
    <div className="relative w-full" aria-hidden="true">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto"
        style={{ maxHeight: 520 }}
      >
        <defs>
          <pattern id="gridlines" width="36" height="36" patternUnits="userSpaceOnUse">
            <path d="M 36 0 L 0 0 0 36" fill="none" stroke="var(--border)" strokeWidth="1" opacity="0.5" />
          </pattern>
        </defs>
        <rect width={width} height={height} fill="url(#gridlines)" opacity="0.4" />
        {dots}
        {rings.map((r) => (
          <circle
            key={r.id}
            cx={r.cx}
            cy={r.cy}
            r={6}
            fill="none"
            stroke="var(--accent)"
            strokeWidth="2"
            style={{
              transformOrigin: `${r.cx}px ${r.cy}px`,
              animation: "pulse-ring 1.4s ease-out forwards",
              willChange: "transform, opacity",
            }}
          />
        ))}
      </svg>

      {/* Floating info cards */}
      <FloatCard top="8%" left="4%" delay={0} dot="bg-[color:var(--warning)]" title="Streetlight #TL-112" sub="Reported 2 mins ago" />
      <FloatCard top="44%" right="2%" delay={1} dot="bg-[color:var(--accent)]" title="Water Leak — Ward 4" sub="In Progress" />
      <FloatCard bottom="6%" left="12%" delay={2} dot="bg-[color:var(--success)]" title="Pothole #RD-088" sub="Resolved" />
    </div>
  );
}

function FloatCard({
  top, left, right, bottom, delay, dot, title, sub,
}: {
  top?: string; left?: string; right?: string; bottom?: string;
  delay: number; dot: string; title: string; sub: string;
}) {
  return (
    <div
      className="absolute hidden sm:flex items-center gap-2.5 bg-white rounded-[16px] px-3.5 py-2.5"
      style={{
        top, left, right, bottom,
        boxShadow: "var(--shadow-md)",
        animation: `float-y 3s ease-in-out ${delay}s infinite`,
      }}
    >
      <span className={`inline-block w-2 h-2 rounded-full ${dot}`} />
      <div className="leading-tight">
        <div className="text-[11px] font-semibold text-[color:var(--text-primary)]">{title}</div>
        <div className="text-[11px] text-[color:var(--text-muted)]">{sub}</div>
      </div>
    </div>
  );
}
