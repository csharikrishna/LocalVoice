import { motion } from "framer-motion";
import { Download, Share2, ScanLine } from "lucide-react";
import { toPng } from "html-to-image";
import { QRCodeSVG } from "qrcode.react";
import { useState, useEffect, useRef } from "react";
import { ShareRecordDialog } from "./ShareRecordDialog";
import { toast } from "sonner";
import { sendReceiptEmail } from "@/lib/api/complaints.functions";

function getErrorDetails(error: unknown) {
  if (error && typeof error === "object") {
    return error as { name?: string; message?: string };
  }
  return { message: String(error) };
}

interface CivicHeroCardProps {
  token: string;
  category: string;
  location: string;
  onReset: () => void;
  emailSent?: boolean;
}

export function CivicHeroCard({ token, category, location, onReset, emailSent }: CivicHeroCardProps) {
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [sendingReceipt, setSendingReceipt] = useState(emailSent === true);
  const receiptSentRef = useRef(false);
  const APP_URL = import.meta.env.VITE_APP_URL || "https://localvoicee.vercel.app";
  const trackingUrl = `${APP_URL}/track?token=${token}`;

  useEffect(() => {
    if (emailSent && !receiptSentRef.current) {
      receiptSentRef.current = true;
      const sendEmail = async () => {
        // Small delay to ensure the card is fully rendered in the DOM
        await new Promise(r => setTimeout(r, 500));
        const cardElement = document.getElementById("official-report-dossier");
        if (!cardElement) {
          setSendingReceipt(false);
          return;
        }
        
        try {
          const dataUrl = await toPng(cardElement, {
            cacheBust: true,
            backgroundColor: "#ffffff",
            pixelRatio: 2, // slightly lower for email attachment size
            skipFonts: true,
            filter: (node) => (node as HTMLElement).id !== "scanner-line",
          });
          
          const email = localStorage.getItem("localvoice_last_email");
          if (email) {
            await sendReceiptEmail({ data: { token, email, base64Image: dataUrl } });
          }
        } catch (err) {
          console.error("Failed to generate and send receipt:", err);
        } finally {
          setSendingReceipt(false);
        }
      };
      
      sendEmail();
    }
  }, [emailSent, token]);

  const handleDownload = async () => {
    const cardElement = document.getElementById("official-report-dossier");
    if (!cardElement) return;

    try {
      const dataUrl = await toPng(cardElement, {
        cacheBust: true,
        backgroundColor: "#ffffff",
        pixelRatio: 3,
        skipFonts: true, // Prevents SecurityError from cross-origin Google Fonts
        filter: (node) => {
          return (node as HTMLElement).id !== "scanner-line";
        },
      });

      const appPrefix = (import.meta.env.VITE_APP_NAME || "localvoice")
        .toLowerCase()
        .replace(/\s+/g, "_");
      const filename = `${appPrefix}-receipt-${token}.png`;

      // On mobile (especially iOS Safari), programmatic downloads of Data URLs often silently fail.
      // The most reliable way to "Save" an image on mobile is using the native Share sheet.
      let sharedNatively = false;
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      
      if (isMobile && typeof navigator !== "undefined" && navigator.share) {
        try {
          const blob = await (await fetch(dataUrl)).blob();
          const file = new File([blob], filename, { type: "image/png" });
          if (navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({
              files: [file],
              title: "Save Receipt",
            });
            sharedNatively = true;
          }
        } catch (shareErr) {
          const error = getErrorDetails(shareErr);
          if (error.name !== "AbortError") {
            console.warn(
              "Native share for saving failed, falling back to anchor download",
              shareErr,
            );
          } else {
            sharedNatively = true; // User cancelled the share sheet, do not fallback
          }
        }
      }

      // Fallback for Desktop or browsers without Web Share API
      if (!sharedNatively) {
        const link = document.createElement("a");
        link.download = filename;
        link.href = dataUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success("Receipt downloaded!");
      }
    } catch (err) {
      console.error("Failed to download card:", err);
      const error = getErrorDetails(err);
      toast.error("Failed to generate receipt: " + (error.message || "Unknown error"));
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 100, delay: 0.2 }}
      className="mt-6 flex flex-col items-center gap-4"
    >
      {(emailSent || sendingReceipt) && (
        <div className={`w-full px-4 py-3 rounded-lg border text-sm font-medium text-center shadow-sm transition-colors ${sendingReceipt ? 'bg-blue-50 text-blue-800 border-blue-200' : 'bg-emerald-50 text-emerald-800 border-emerald-200'}`}>
          {sendingReceipt ? '⏳ Generating and sending your receipt...' : '✅ A copy of this receipt and tracking link has been sent to your email!'}
        </div>
      )}

      <div
        id="official-report-dossier"
        className="w-full relative overflow-hidden rounded-lg border border-slate-300 bg-[#f8fafc] shadow-lg"
        style={{ perspective: "1000px" }}
      >
        {/* Scanner animation */}
        <motion.div
          id="scanner-line"
          initial={{ top: "-10%" }}
          animate={{ top: "110%" }}
          transition={{ duration: 2, ease: "linear", repeat: Infinity, repeatDelay: 3 }}
          className="absolute left-0 w-full h-1 bg-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.5)] z-20"
        />

        <div className="absolute top-0 right-0 w-32 h-32 opacity-5 pointer-events-none">
          <svg viewBox="0 0 100 100" className="w-full h-full fill-current text-slate-900">
            <polygon points="100,0 100,100 0,0" />
          </svg>
        </div>

        <div className="p-6 relative z-10">
          <div className="flex items-start justify-between mb-6 border-b border-slate-200 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded bg-slate-900 flex items-center justify-center">
                <span className="text-white text-lg font-mono font-bold">LV</span>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">
                  Secure Record
                </p>
                <h3 className="font-bold text-lg text-slate-900 leading-tight">
                  Official Report Receipt
                </h3>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-1">
                Timestamp
              </p>
              <p className="text-xs font-mono text-slate-600">{new Date().toLocaleDateString()}</p>
            </div>
          </div>

          <div className="space-y-5">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-1">
                Issue Category
              </p>
              <p className="font-mono text-sm font-semibold text-slate-900 uppercase">{category}</p>
            </div>

            <div>
              <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-1">
                Incident Location
              </p>
              <p className="font-mono text-xs text-slate-700 bg-slate-200/50 p-2 rounded">
                {location}
              </p>
            </div>

            <div className="flex justify-between items-end bg-slate-900 text-white p-3 rounded">
              <div className="flex-1">
                <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-1">
                  Tracking Token
                </p>
                <p className="font-mono font-bold tracking-wider text-lg">{token}</p>
                <p className="text-[10px] font-mono font-bold text-emerald-400 mt-2">
                  VERIFICATION: SECURE
                </p>
              </div>
              <div className="shrink-0 ml-4 bg-white p-1.5 rounded flex items-center justify-center">
                <QRCodeSVG value={trackingUrl} size={48} level="H" includeMargin={false} />
              </div>
            </div>
          </div>
        </div>
        <div className="bg-slate-200 border-t border-slate-300 text-slate-600 text-center py-2 text-[10px] font-mono tracking-widest uppercase">
          {(import.meta.env.VITE_APP_URL || "localvoicee.vercel.app").replace(/^https?:\/\//, "")}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 w-full">
        <button
          type="button"
          onClick={handleDownload}
          className="flex items-center justify-center gap-2 py-3 rounded bg-slate-900 text-white font-semibold text-sm hover:bg-slate-800 transition-colors"
        >
          <Download size={16} /> Save Receipt
        </button>
        <button
          type="button"
          onClick={() => setIsShareOpen(true)}
          className="flex items-center justify-center gap-2 py-3 rounded bg-white border border-slate-300 text-slate-700 font-semibold text-sm hover:bg-slate-50 transition-colors"
        >
          <Share2 size={16} /> Share Record
        </button>
      </div>

      <button
        type="button"
        onClick={onReset}
        className="w-full h-12 rounded-[10px] font-semibold text-[color:var(--primary)] bg-white transition-all hover:bg-[color:var(--surface-2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--primary)] focus-visible:ring-offset-2"
        style={{ border: "1.5px solid var(--border)" }}
      >
        Submit another report
      </button>

      <ShareRecordDialog
        isOpen={isShareOpen}
        onClose={() => setIsShareOpen(false)}
        token={token}
        category={category}
        location={location}
      />
    </motion.div>
  );
}
