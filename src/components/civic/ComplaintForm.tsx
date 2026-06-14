import { useEffect, useState } from "react";
import { Check, MapPin, Camera, Loader2 } from "lucide-react";

const categories = ["Streetlight", "Water", "Garbage", "Roads", "Other"];

export function ComplaintForm() {
  const [cat, setCat] = useState("Streetlight");
  const [loc, setLoc] = useState("Detecting your location…");
  const [desc, setDesc] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "success">("idle");

  useEffect(() => {
    const t = setTimeout(() => setLoc("Ward 4, Near Bus Stand, Tirupati"), 1400);
    return () => clearTimeout(t);
  }, []);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (state !== "idle") return;
    setState("loading");
    setTimeout(() => {
      setState("success");
      setTimeout(() => setState("idle"), 3000);
    }, 1100);
  };

  return (
    <form
      onSubmit={submit}
      className="bg-white rounded-[24px] p-7 sm:p-8 w-full"
      style={{ boxShadow: "var(--shadow-xl)" }}
      aria-label="Demo complaint form"
    >
      <div className="mb-5">
        <label className="block text-sm font-semibold text-[color:var(--text-primary)] mb-1.5">
          Issue category
        </label>
        <div className="flex flex-wrap gap-2">
          {categories.map((c) => {
            const active = cat === c;
            return (
              <button
                key={c}
                type="button"
                onClick={() => setCat(c)}
                className="text-sm font-medium px-3.5 py-2 rounded-full transition-all"
                style={{
                  background: active ? "var(--primary)" : "var(--surface-2)",
                  color: active ? "#fff" : "var(--text-secondary)",
                }}
              >
                {c}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mb-5">
        <label className="block text-sm font-semibold text-[color:var(--text-primary)] mb-1.5">
          Location
        </label>
        <div
          className="flex items-center gap-2 px-4 py-3 rounded-[10px] text-sm"
          style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}
        >
          <MapPin size={16} className="text-[color:var(--primary)] shrink-0" />
          <span className="text-[color:var(--text-secondary)] truncate">{loc}</span>
        </div>
      </div>

      <div className="mb-5">
        <label htmlFor="desc" className="block text-sm font-semibold text-[color:var(--text-primary)] mb-1.5">
          Describe the issue
        </label>
        <textarea
          id="desc"
          rows={3}
          maxLength={300}
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          placeholder="Describe what you see (e.g., 'Streetlight has been out for 3 days')"
          className="w-full resize-y px-4 py-3 rounded-[10px] text-sm bg-white outline-none transition-all placeholder:text-[color:var(--text-muted)]"
          style={{ border: "1px solid var(--border)" }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = "var(--primary)";
            e.currentTarget.style.boxShadow = "0 0 0 3px rgba(27,79,216,0.12)";
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = "var(--border)";
            e.currentTarget.style.boxShadow = "none";
          }}
        />
        <div className="flex justify-end text-xs text-[color:var(--text-muted)] mt-1">
          {desc.length} / 300
        </div>
      </div>

      <div className="mb-6">
        <label className="block text-sm font-semibold text-[color:var(--text-primary)] mb-1.5">
          Photo (optional)
        </label>
        <div
          className="flex flex-col items-center justify-center gap-1.5 py-6 rounded-[10px] cursor-pointer transition-all"
          style={{
            background: "var(--surface-2)",
            border: "1.5px dashed var(--border-hover)",
          }}
        >
          <Camera size={20} className="text-[color:var(--text-secondary)]" />
          <span className="text-sm text-[color:var(--text-secondary)]">
            Drag a photo here or tap to upload
          </span>
        </div>
      </div>

      <button
        type="submit"
        disabled={state !== "idle"}
        className="w-full inline-flex items-center justify-center gap-2 h-12 rounded-[10px] font-semibold text-white transition-all"
        style={{
          background:
            state === "success" ? "var(--success)" : "var(--primary)",
          boxShadow:
            state === "idle" ? "0 6px 20px rgba(27,79,216,0.25)" : "none",
        }}
      >
        {state === "idle" && <>Submit Report →</>}
        {state === "loading" && <><Loader2 size={18} className="animate-spin" /> Submitting…</>}
        {state === "success" && <><Check size={18} /> Complaint #CSP-2847 submitted!</>}
      </button>
    </form>
  );
}
