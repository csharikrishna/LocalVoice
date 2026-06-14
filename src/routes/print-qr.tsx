import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { QRCodeSVG } from "qrcode.react";
import { Printer, ArrowLeft, Languages, ChevronDown } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { POSTER_TRANSLATIONS } from "@/locales/poster-translations";

type PrintQrSearch = {
  lang?: string;
};

export const Route = createFileRoute("/print-qr")({
  validateSearch: (search: Record<string, unknown>): PrintQrSearch => {
    return {
      lang: search.lang as string | undefined,
    };
  },
  component: PrintQrRoute,
});

function PrintQrRoute() {
  const { lang } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const [url, setUrl] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const activeLang = lang && POSTER_TRANSLATIONS[lang] ? lang : "eng";
  const t = POSTER_TRANSLATIONS[activeLang];

  useEffect(() => {
    setUrl(`${window.location.origin}/#report`);
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col lg:flex-row gap-12 p-8 lg:p-12 print:block print:p-0 print:bg-white">
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @media print {
              @page {
                size: A4 portrait;
                margin: 0;
              }

              body, html {
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
                margin: 0 !important;
                padding: 0 !important;
                height: 100% !important;
                overflow: hidden !important;
              }
            }
          `,
        }}
      />

      {/* Poster Container (Left Side) */}
      <div className="flex-1 flex justify-center lg:justify-end print:block print:justify-start">
        <div className="relative w-[210mm] h-[297mm] print:w-full print:h-[99vh] bg-[#FAF9F6] shadow-2xl print:shadow-none overflow-hidden flex flex-col items-center justify-center text-center px-16">

        {/* Decorative elements */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-10 right-10 w-44 h-44 rounded-full border border-slate-200" />
          <div className="absolute top-16 right-16 w-24 h-24 rounded-full border border-slate-100" />

          <div className="absolute bottom-12 left-12 w-72 h-72 rounded-full border border-slate-100" />
          <div className="absolute bottom-24 left-24 w-40 h-40 rounded-full border border-slate-100" />
        </div>

        {/* Brand */}
        <div className="mb-8 relative z-10">
          <p className="text-xs uppercase tracking-[0.6em] text-slate-500 mb-4 font-bold">
            {t.civicPlatform}
          </p>

          <h1 className="text-[5.5rem] font-black tracking-[-0.08em] text-slate-950 leading-none">
            LOCALVOICE
          </h1>
        </div>

        {/* Headline */}
        <div className="mb-10 relative z-10">
          <h2
            className={`font-black text-slate-950 tracking-tight ${t.headlineClass || "text-5xl leading-[1.05]"}`}
            dangerouslySetInnerHTML={{ __html: t.headline }}
          />
        </div>

        {/* QR */}
        <div className="relative z-10 mb-8">
          <div className="rounded-[40px] bg-white border border-slate-200 p-8 shadow-sm">
            {url && (
              <QRCodeSVG
                value={url}
                size={340}
                level="H"
                includeMargin={false}
                fgColor="#020617"
                bgColor="#FFFFFF"
              />
            )}
          </div>
        </div>

        {/* Description */}
        <div className="relative z-10 max-w-3xl pb-12">
          <p className={`text-slate-600 leading-relaxed px-4 font-medium ${t.descClass || "text-xl"}`}>
            {t.scanToReport}
          </p>

          {/* Categories */}
          <div className="flex flex-wrap justify-center gap-3 mt-8">
            {t.categories.map((item: string) => (
              <div
                key={item}
                className={`px-4 py-2 rounded-full border border-slate-200 bg-white text-slate-700 font-bold shadow-sm ${t.categoryClass || "text-base"}`}
              >
                {item}
              </div>
            ))}
          </div>

          {/* CTA */}
          <div className="mt-10">
            <div className="inline-flex items-center rounded-full bg-slate-950 text-white px-8 py-4 text-xl font-bold shadow-lg">
              {t.scanWithCamera}
            </div>

            <p className="mt-4 text-slate-500 text-base font-semibold">
              {t.noAppNeeded}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="absolute bottom-8 left-0 right-0 text-center">
          <div className="w-24 h-px bg-slate-300 mx-auto mb-4" />

          <p className="text-sm tracking-[0.25em] uppercase text-slate-400 font-bold">
            {t.makingCommunitiesBetter}
          </p>
        </div>
      </div>
      </div>

      {/* Sidebar Controls (Right Side) */}
      <div className="w-full lg:w-80 shrink-0 print:hidden flex flex-col gap-6 lg:pt-10">
        <div>
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors font-bold mb-8"
          >
            <ArrowLeft size={18} />
            Back to Dashboard
          </Link>

          <h3 className="text-2xl font-bold text-slate-900 mb-2">Print Settings</h3>
          <p className="text-slate-500 mb-6">Customize the poster before printing to distribute in your local neighborhood.</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <label className="block text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
            <Languages size={16} />
            Poster Language
          </label>
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="w-full flex items-center justify-between bg-slate-50 border border-slate-200 hover:border-slate-300 hover:bg-white transition-all rounded-xl py-3 px-4 text-left outline-none focus:ring-2 focus:ring-slate-900 shadow-sm"
            >
              <span className="font-semibold text-slate-800">
                {POSTER_TRANSLATIONS[activeLang]?.name || "Select Language"}
              </span>
              <ChevronDown 
                size={18} 
                className={`text-slate-400 transition-transform duration-200 ${dropdownOpen ? "rotate-180" : ""}`} 
              />
            </button>

            {dropdownOpen && (
              <div className="absolute z-50 w-full mt-2 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden py-2 animate-in fade-in slide-in-from-top-2 duration-200">
                {Object.entries(POSTER_TRANSLATIONS).map(([key, val]) => (
                  <button
                    key={key}
                    onClick={() => {
                      navigate({ search: { lang: key } });
                      setDropdownOpen(false);
                    }}
                    className={`w-full text-left px-4 py-2.5 hover:bg-slate-50 transition-colors flex items-center justify-between ${
                      activeLang === key ? "bg-slate-50 text-slate-900 font-bold" : "text-slate-600 font-medium"
                    }`}
                  >
                    {val.name}
                    {activeLang === key && (
                      <span className="w-2 h-2 rounded-full bg-slate-900" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <button
          onClick={() => window.print()}
          className="flex items-center justify-center gap-2 w-full rounded-2xl bg-slate-950 text-white px-6 py-4 shadow-lg hover:bg-slate-800 hover:-translate-y-0.5 transition-all font-bold text-lg mt-4"
        >
          <Printer size={20} />
          Print Poster Now
        </button>
      </div>
    </div>
  );
}