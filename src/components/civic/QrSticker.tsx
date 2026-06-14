import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { MapPin, Scan } from "lucide-react";

type Props = {
  url?: string;
  assetId?: string;
  location?: string;
  category?: string;
  className?: string;
};

export function QrSticker({
  url,
  assetId = "VJZ-HYD-0427",
  location = "Vijayawada · Benz Circle",
  category = "Street Light",
  className = "",
}: Props) {
  const fallback = url ?? `https://localvoice.app/r/${assetId}`;
  const [reportUrl, setReportUrl] = useState(fallback);
  useEffect(() => {
    if (!url) setReportUrl(`${window.location.origin}/report?id=${assetId}`);
  }, [url, assetId]);


  return (
    <div
      className={`relative bg-white rounded-2xl p-6 shadow-[0_20px_60px_-20px_rgba(15,23,42,0.35)] border border-[color:var(--border)] ${className}`}
      style={{ maxWidth: 320 }}
    >
      {/* Sticker tape */}
      <div
        aria-hidden="true"
        className="absolute -top-3 left-1/2 -translate-x-1/2 w-24 h-6 rounded-sm opacity-80"
        style={{ background: "rgba(255,209,102,0.55)", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}
      />
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-1.5 text-[10px] font-bold tracking-[0.15em] text-[color:var(--primary)]">
          <Scan size={12} /> LOCALVOICE
        </div>
        <span className="text-[10px] font-mono text-[color:var(--text-tertiary,#64748B)]">
          {assetId}
        </span>
      </div>

      <div className="bg-white rounded-xl p-3 border border-[color:var(--border)] flex items-center justify-center">
        <QRCodeSVG
          value={reportUrl}
          size={220}
          level="M"
          marginSize={0}
          fgColor="#0B1220"
          bgColor="#FFFFFF"
        />
      </div>

      <div className="mt-4 space-y-1">
        <p className="text-sm font-semibold text-[color:var(--text-primary)]">
          Report: {category}
        </p>
        <p className="flex items-center gap-1 text-xs text-[color:var(--text-secondary)]">
          <MapPin size={12} /> {location}
        </p>
      </div>
      <p className="mt-3 text-[10px] text-[color:var(--text-tertiary,#64748B)] break-all font-mono">
        {reportUrl}
      </p>
      <p className="mt-2 text-[11px] text-[color:var(--text-secondary)]">
        Point your phone camera here — no app needed.
      </p>
    </div>
  );
}
