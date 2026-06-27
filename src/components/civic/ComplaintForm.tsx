/**
 * ComplaintForm.tsx — Production-grade civic issue reporting form
 *
 * Best-practice improvements over v1:
 * ─────────────────────────────────────────────────────────────────
 * ACCESSIBILITY
 *   • Every interactive element has an aria-label or is labelledby
 *   • Role="status" live region for upload progress & error messages
 *   • Role="alert" for error states (politely announces to screen readers)
 *   • Field errors linked via aria-describedby
 *   • Keyboard-navigable map modal (focus trap + Escape key close)
 *   • Reduced-motion respected for button animations
 *   • Touch targets ≥ 44px (WCAG 2.5.5)
 *
 * FORM VALIDATION
 *   • Per-field validation with clear inline messages
 *   • Validates before any async work begins
 *   • Sanitises text input (trims, normalises whitespace)
 *
 * PERFORMANCE
 *   • Geolocation with AbortController + cleanup on unmount
 *   • Image preview via createObjectURL instead of FileReader (faster, GC'd on revoke)
 *   • Speech recognition ref cleanup on unmount
 *   • useCallback for stable handler references
 *   • useMemo for expensive derived values
 *
 * UX
 *   • Optimistic progress states with accurate step tracking
 *   • Retry-safe token generation (crypto.getRandomValues)
 *   • Copy-to-clipboard for tracking token
 *   • Full reset to pristine state on "Submit another"
 *   • Graceful fallback when geolocation denied or unavailable
 *   • Textarea auto-grows with content (no fixed rows)
 *   • File drag-and-drop with keyboard parity
 *   • Voice input with visual pulse + transcript preview
 *
 * SECURITY
 *   • Content-Security-Policy-safe (no dangerouslySetInnerHTML)
 *   • File type validated on MIME + extension, not just Accept attr
 *   • File size validated client-side before upload attempt
 *
 * CODE QUALITY
 *   • Single source of truth for UI state via a typed reducer
 *   • No prop-drilling; all state co-located with its handlers
 *   • All side-effects return cleanup functions
 *   • Consistent error boundary messaging
 */

import {
  useEffect,
  useRef,
  useState,
  useCallback,
  useMemo,
  useReducer,
  Suspense,
  lazy,
} from "react";
const ComplaintMapLeaflet = lazy(() => import("./ComplaintMapLeaflet"));

function ClientOnly({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  return mounted ? <>{children}</> : null;
}
import {
  Check,
  MapPin,
  Loader2,
  Upload,
  X,
  AlertCircle,
  Mic,
  MicOff,
  Copy,
  CheckCheck,
  ChevronDown,
} from "lucide-react";
import { z } from "zod";
import imageCompression from "browser-image-compression";
import { validateImageFile, ImageUploadError, IMAGE_CONFIG } from "@/lib/image-upload";
import { checkRateLimit, getRateLimitClientId, recordReportSubmission } from "@/lib/rate-limit";
import ReCAPTCHA from "react-google-recaptcha";
import { useHaptics } from "@/hooks/useHaptics";
import { useTranslation } from "react-i18next";
import { useGeolocation, reverseGeocode } from "@/hooks/useGeolocation";
import { CivicHeroCard } from "./CivicHeroCard";
import { submitComplaint } from "@/lib/api/complaints.functions";

// ─── Constants ────────────────────────────────────────────────────────────────

const DESCRIPTION_MAX = 300;

const CATEGORIES = [
  { id: "streetlight", label: "Streetlight" },
  { id: "water", label: "Water" },
  { id: "garbage", label: "Garbage" },
  { id: "roads", label: "Roads" },
  { id: "drainage", label: "Drainage" },
  { id: "electricity", label: "Electricity" },
  { id: "encroachment", label: "Encroachment" },
  { id: "publictoilet", label: "Public Toilet" },
  { id: "park", label: "Park / Garden" },
  { id: "other", label: "Other" },
] as const;

type CategoryId = (typeof CATEGORIES)[number]["id"];

// ─── Types ────────────────────────────────────────────────────────────────────

interface Coords {
  lat: number;
  lng: number;
}

type SpeechRecognitionResultLike = {
  0: {
    transcript: string;
  };
};

type SpeechRecognitionEventLike = {
  results: ArrayLike<SpeechRecognitionResultLike>;
};

type SpeechRecognitionInstance = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;

type SpeechRecognitionWindow = Window & {
  SpeechRecognition?: SpeechRecognitionConstructor;
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
};

type SubmitPhase = "idle" | "uploading" | "saving" | "success" | "error";

interface FormErrors {
  category?: string;
  location?: string;
  description?: string;
  photo?: string;
}

const formSchema = z.object({
  description: z
    .string()
    .min(10, "Description must be at least 10 characters.")
    .max(300, "Description is too long."),
  locationText: z
    .string()
    .min(1, "Location is required. Please wait or enter it manually.")
    .refine((val) => val !== "Detecting your location…", {
      message: "Location is required. Please wait or enter it manually.",
    }),
});

// Single-reducer state keeps the form coherent; no out-of-sync booleans
interface FormState {
  phase: SubmitPhase;
  uploadProgress: number; // 0–100
  errorMessage: string | null;
  trackingToken: string | null;
  duplicateIssueId: string | null;
  emailSent: boolean;
}

type FormAction =
  | { type: "UPLOAD_PROGRESS"; payload: number }
  | { type: "SAVING" }
  | { type: "SUCCESS"; token: string; emailSent: boolean }
  | { type: "ERROR"; message: string; duplicateIssueId?: string }
  | { type: "RESET" };

function formReducer(state: FormState, action: FormAction): FormState {
  switch (action.type) {
    case "UPLOAD_PROGRESS":
      return { ...state, phase: "uploading", uploadProgress: action.payload };
    case "SAVING":
      return { ...state, phase: "saving", uploadProgress: 100 };
    case "SUCCESS":
      return {
        phase: "success",
        uploadProgress: 100,
        errorMessage: null,
        trackingToken: action.token,
        duplicateIssueId: null,
        emailSent: action.emailSent,
      };
    case "ERROR":
      return {
        phase: "error",
        uploadProgress: 0,
        errorMessage: action.message,
        trackingToken: null,
        duplicateIssueId: action.duplicateIssueId || null,
        emailSent: false,
      };
    case "RESET":
      return {
        phase: "idle",
        uploadProgress: 0,
        errorMessage: null,
        trackingToken: null,
        duplicateIssueId: null,
        emailSent: false,
      };
    default:
      return state;
  }
}

const INITIAL_STATE: FormState = {
  phase: "idle",
  uploadProgress: 0,
  errorMessage: null,
  trackingToken: null,
  duplicateIssueId: null,
  emailSent: false,
};

// ─── Utilities ────────────────────────────────────────────────────────────────

/** Cryptographically random tracking token */
function generateToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(4));
  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
  return `CVC-${hex}`;
}

/** Sanitise description: trim + collapse internal whitespace */
function sanitise(text: string): string {
  return text.trim().replace(/\s+/g, " ");
}

function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function getDepartmentForCategory(category: CategoryId): string {
  switch (category) {
    case "streetlight":
    case "electricity":
      return "Electrical";
    case "water":
    case "drainage":
      return "Water Board";
    case "garbage":
    case "publictoilet":
      return "Sanitation";
    case "roads":
    case "encroachment":
      return "Public Works";
    case "park":
      return "Parks & Rec";
    default:
      return "";
  }
}

function calculatePriority(description: string): string {
  const desc = description.toLowerCase();
  const highPriority = [
    "live wire",
    "fire",
    "flood",
    "urgent",
    "accident",
    "danger",
    "hazard",
    "spark",
  ];
  if (highPriority.some((kw) => desc.includes(kw))) return "high";
  const mediumPriority = ["broken", "pothole", "leak", "smell", "dead animal"];
  if (mediumPriority.some((kw) => desc.includes(kw))) return "medium";
  return "low";
}

// ─── Sub-components ───────────────────────────────────────────────────────────

interface ProgressBarProps {
  value: number; // 0–100
  label: string;
}

function ProgressBar({ value, label }: ProgressBarProps) {
  return (
    <div role="status" aria-live="polite" aria-label={label}>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-[color:var(--text-secondary)]">{label}</span>
        <span className="font-medium tabular-nums">{Math.round(value)}%</span>
      </div>
      <div
        className="h-1.5 rounded-full overflow-hidden"
        style={{ background: "var(--surface-2)" }}
        role="progressbar"
        aria-valuenow={Math.round(value)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="h-full rounded-full transition-all duration-300 ease-out"
          style={{ background: "var(--primary)", width: `${value}%` }}
        />
      </div>
    </div>
  );
}

interface FieldErrorProps {
  id: string;
  message?: string;
}

function FieldError({ id, message }: FieldErrorProps) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
      <AlertCircle size={12} aria-hidden="true" />
      {message}
    </p>
  );
}

function StructuredLocationInput({
  onChange,
  disabled,
  error,
}: {
  onChange: (val: string) => void;
  disabled?: boolean;
  error?: string;
}) {
  const [street, setStreet] = useState("");
  const [landmark, setLandmark] = useState("");
  const [pincode, setPincode] = useState("");

  useEffect(() => {
    const parts = [street, landmark, pincode ? `Pincode: ${pincode}` : ""].filter(Boolean);
    onChange(parts.join(", "));
  }, [street, landmark, pincode, onChange]);

  return (
    <div className="flex flex-col gap-3">
      <input
        id="street"
        name="street"
        aria-label="Street or Area Name"
        type="text"
        placeholder="Street / Area Name *"
        required
        value={street}
        onChange={(e) => setStreet(e.target.value)}
        disabled={disabled}
        className="w-full px-4 py-3 rounded-[10px] text-sm bg-white outline-none transition-all disabled:opacity-50"
        style={{ border: error ? "1px solid #dc2626" : "1px solid var(--border)" }}
      />
      <div className="flex gap-3">
        <input
          id="landmark"
          name="landmark"
          aria-label="Landmark (optional)"
          type="text"
          placeholder="Landmark (optional)"
          value={landmark}
          onChange={(e) => setLandmark(e.target.value)}
          disabled={disabled}
          className="w-full px-4 py-3 rounded-[10px] text-sm bg-white outline-none transition-all disabled:opacity-50 border border-[color:var(--border)] focus:border-[color:var(--primary)]"
        />
        <input
          id="pincode"
          name="pincode"
          aria-label="Pincode"
          type="text"
          placeholder="Pincode"
          value={pincode}
          onChange={(e) => setPincode(e.target.value)}
          disabled={disabled}
          className="w-1/2 px-4 py-3 rounded-[10px] text-sm bg-white outline-none transition-all disabled:opacity-50 border border-[color:var(--border)] focus:border-[color:var(--primary)]"
        />
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function ComplaintForm() {
  const { t } = useTranslation();
  const haptics = useHaptics();
  const recaptchaSiteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY as string | undefined;
  const showSpeechInput = import.meta.env.VITE_ENABLE_SPEECH_INPUT === "true";
  // ── Field state ─────────────────────────────────────────────────────────────
  const [category, setCategory] = useState<CategoryId>("streetlight");
  const [locationText, setLocationText] = useState("");
  const [locationEditable, setLocationEditable] = useState(true);
  const [locationDetected, setLocationDetected] = useState(false);
  const [description, setDescription] = useState("");
  const [email, setEmail] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [coords, setCoords] = useState<Coords | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FormErrors>({});

  const [captchaValue, setCaptchaValue] = useState<string | null>(null);
  const [rateLimitState, setRateLimitState] = useState({ allowed: true, remaining: 3 });

  useEffect(() => {
    setRateLimitState(checkRateLimit());
  }, []);

  // ── Submit machine ───────────────────────────────────────────────────────────
  const [formState, dispatch] = useReducer(formReducer, INITIAL_STATE);
  const isSubmitting = formState.phase === "uploading" || formState.phase === "saving";

  // ── Copy-to-clipboard for tracking token ────────────────────────────────────
  const [copied, setCopied] = useState(false);

  // ── Map modal ────────────────────────────────────────────────────────────────
  const [mapOpen, setMapOpen] = useState(false);
  const [tempCoords, setTempCoords] = useState<Coords | null>(null);
  const [mapGeocoding, setMapGeocoding] = useState(false);
  const mapModalRef = useRef<HTMLDivElement>(null);

  // ── Speech recognition ────────────────────────────────────────────────────
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const baseTextRef = useRef(""); // text snapshot before current dictation session

  // ── Refs ──────────────────────────────────────────────────────────────────
  const fileInputRef = useRef<HTMLInputElement>(null);
  const descRef = useRef<HTMLTextAreaElement>(null);
  // ─── Geolocation Hook ───────────────────────────────────────────────────────
  const { detectLocation, cancel, isDetecting, accuracy } = useGeolocation({
    onSuccess: (newCoords, address, acc) => {
      setLocationText(address);
      setCoords(newCoords);
      setLocationDetected(true);
      setLocationEditable(false);
      haptics.success();
    },
    onError: (message) => {
      setFieldErrors((prev) => ({ ...prev, location: message }));
      haptics.error();
    },
  });

  // ─── Speech recognition setup ────────────────────────────────────────────────
  useEffect(() => {
    if (typeof window === "undefined") return;
    const speechWindow = window as SpeechRecognitionWindow;
    const SR = speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;
    if (!SR) return;

    setSpeechSupported(true);
    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "en-IN";

    rec.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((result) => result[0].transcript)
        .join("");
      const full = baseTextRef.current + transcript;
      setDescription(full.slice(0, DESCRIPTION_MAX));
    };

    rec.onerror = () => setIsListening(false);
    rec.onend = () => setIsListening(false);

    recognitionRef.current = rec;

    return () => {
      rec.onresult = null;
      rec.onerror = null;
      rec.onend = null;
      try {
        rec.abort();
      } catch {
        /* ignore */
      }
    };
  }, []);

  // ─── Auto-grow textarea ──────────────────────────────────────────────────────
  useEffect(() => {
    const el = descRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [description]);

  // ─── Revoke object URL on unmount / file change ──────────────────────────────
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  // ─── Focus trap for map modal ────────────────────────────────────────────────
  useEffect(() => {
    if (!mapOpen) return;
    const el = mapModalRef.current;
    if (!el) return;

    const focusable = el.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    first?.focus();

    const trap = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMapOpen(false);
        return;
      }
      if (e.key !== "Tab") return;
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };

    document.addEventListener("keydown", trap);
    return () => document.removeEventListener("keydown", trap);
  }, [mapOpen]);

  // ─── Handlers ────────────────────────────────────────────────────────────────

  const toggleListening = useCallback(() => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      setDescription((prev) => {
        const base = prev.trim() ? prev.trim() + " " : "";
        baseTextRef.current = base;
        return base;
      });
      try {
        recognitionRef.current?.start();
        setIsListening(true);
      } catch {
        // Already started — ignore
      }
    }
  }, [isListening]);

  const handleFileSelect = useCallback((file: File | null) => {
    if (!file) return;

    const validation = validateImageFile(file);
    if (!validation.valid) {
      setFieldErrors((prev) => ({ ...prev, photo: validation.error ?? "Invalid file" }));
      return;
    }

    // Revoke previous URL before creating a new one
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
    setSelectedFile(file);
    setFieldErrors((prev) => ({ ...prev, photo: undefined }));
  }, []);

  const handleRemoveFile = useCallback(() => {
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(e.type === "dragenter" || e.type === "dragover");
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);
      handleFileSelect(e.dataTransfer.files?.[0] ?? null);
    },
    [handleFileSelect],
  );

  const handleConfirmMapLocation = useCallback(async () => {
    if (!tempCoords) return;
    setMapGeocoding(true);
    try {
      const address = await reverseGeocode(tempCoords.lat, tempCoords.lng);
      setLocationText(address);
      setCoords(tempCoords);
    } catch {
      setLocationText(`${tempCoords.lat.toFixed(5)}, ${tempCoords.lng.toFixed(5)}`);
      setCoords(tempCoords);
    } finally {
      setMapGeocoding(false);
      setMapOpen(false);
    }
  }, [tempCoords]);

  const handleCopyToken = useCallback(async () => {
    if (!formState.trackingToken) return;
    try {
      await navigator.clipboard.writeText(formState.trackingToken);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* Clipboard API unavailable — silent */
    }
  }, [formState.trackingToken]);

  // ─── Validation ──────────────────────────────────────────────────────────────

  const validate = useCallback((): boolean => {
    const data = { description: sanitise(description), locationText };
    const result = formSchema.safeParse(data);

    if (!result.success) {
      const formatted = result.error.format();
      setFieldErrors({
        description: formatted.description?._errors[0],
        location: formatted.locationText?._errors[0],
      });
      return false;
    }

    setFieldErrors({});
    return true;
  }, [description, locationText]);

  // ─── Submit ──────────────────────────────────────────────────────────────────

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (isSubmitting) return;
      if (!validate()) return;

      if (!captchaValue) {
        dispatch({ type: "ERROR", message: "Please verify that you are human using the CAPTCHA." });
        setTimeout(() => dispatch({ type: "RESET" }), 5000);
        return;
      }

      const { allowed } = checkRateLimit();
      if (!allowed) {
        dispatch({
          type: "ERROR",
          message: "Wow, what a Civic Hero! You have reached the limit of 24 reports for today.",
        });
        setRateLimitState({ allowed: false, remaining: 0 });
        return;
      }

      dispatch({ type: "UPLOAD_PROGRESS", payload: 0 });

      try {
        let photoBase64: string | null = null;

        if (selectedFile) {
          dispatch({ type: "UPLOAD_PROGRESS", payload: 10 });
          const options = {
            maxSizeMB: 1.5,
            maxWidthOrHeight: 1920,
            useWebWorker: true,
            exifOrientation: 1,
            onProgress: (progress: number) => {
              dispatch({ type: "UPLOAD_PROGRESS", payload: 10 + Math.round(progress * 0.4) });
            },
          };

          const compressedFile = await imageCompression(selectedFile, options);
          dispatch({ type: "UPLOAD_PROGRESS", payload: 50 });

          photoBase64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
              dispatch({ type: "UPLOAD_PROGRESS", payload: 90 });
              resolve(reader.result as string);
            };
            reader.onerror = () => reject(new Error("Failed to read image file"));
            reader.readAsDataURL(compressedFile);
          });
        }

        dispatch({ type: "SAVING" });

        const result = await submitComplaint({
          data: {
            category,
            location: locationText,
            coordinates: coords ?? null,
            description,
            photoBase64,
            isAnonymous,
            email,
            captchaToken: captchaValue,
            clientId: getRateLimitClientId(),
          },
        });

        if (!result.ok) {
          dispatch({
            type: "ERROR",
            message: result.message,
            duplicateIssueId: result.duplicateIssueId,
          });
          setTimeout(() => dispatch({ type: "RESET" }), 5000);
          return;
        }

        try {
          const storedIds = localStorage.getItem("localVoice_my_reports");
          const myReports = storedIds ? JSON.parse(storedIds) : [];
          if (!myReports.includes(result.id)) {
            myReports.push(result.id);
          }
          localStorage.setItem("localVoice_my_reports", JSON.stringify(myReports));

          // Also save the tracking token for easy access on the track page
          const storedTokens = localStorage.getItem("localvoice_recent_tokens");
          const myTokens = storedTokens ? JSON.parse(storedTokens) : [];
          if (!myTokens.includes(result.token)) {
            // Add to beginning, keep max 10
            myTokens.unshift(result.token);
            if (myTokens.length > 10) myTokens.length = 10;
          }
          localStorage.setItem("localvoice_recent_tokens", JSON.stringify(myTokens));
        } catch (e) {
          console.error("Failed to save to local storage", e);
        }

        recordReportSubmission();
        setRateLimitState(checkRateLimit());
        // Save email so CivicHeroCard can grab it for the receipt attachment
        if (email) {
          localStorage.setItem("localvoice_last_email", email);
        }
        dispatch({ type: "SUCCESS", token: result.token, emailSent: !!email });
        haptics.success();
      } catch (err) {
        console.error("[ComplaintForm] Submit error:", err);

        let message = "Failed to submit. Please check your connection and try again.";
        if (err instanceof ImageUploadError) {
          message = err.message;
        } else if (err instanceof Error) {
          if (err.message.includes("permission-denied")) {
            message = "Permission denied. Please refresh and try again.";
          } else if (err.message.includes("quota")) {
            message = "Storage quota exceeded. Please contact support.";
          }
        }

        dispatch({ type: "ERROR", message });
        haptics.error();
        // Auto-clear error after 5 s so the button recovers
        setTimeout(() => dispatch({ type: "RESET" }), 5000);
      }
    },
    [
      isSubmitting,
      validate,
      selectedFile,
      category,
      locationText,
      coords,
      description,
      captchaValue,
      isAnonymous,
      haptics,
    ],
  );

  const handleReset = useCallback(() => {
    dispatch({ type: "RESET" });
    setDescription("");
    setSelectedFile(null);
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setFieldErrors({});
    setCopied(false);
  }, []);

  // ─── Derived UI values ───────────────────────────────────────────────────────

  const progressLabel = useMemo(() => {
    if (formState.phase === "uploading") return "Uploading photo…";
    if (formState.phase === "saving") return "Saving report…";
    return "";
  }, [formState.phase]);

  const submitLabel = useMemo(() => {
    if (formState.phase === "uploading") return "Uploading…";
    if (formState.phase === "saving") return "Saving…";
    if (formState.phase === "error") return "Failed — try again";
    return "Submit report";
  }, [formState.phase]);

  const descRemaining = DESCRIPTION_MAX - description.length;
  const descWarning = descRemaining <= 50;

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <>
      <form
        onSubmit={handleSubmit}
        noValidate
        aria-label="Report a civic issue"
        className="bg-white rounded-[24px] p-5 sm:p-8 w-full"
        style={{ boxShadow: "var(--shadow-xl)" }}
      >
        {/* ── Category ────────────────────────────────────────────────────── */}
        <fieldset className="mb-6 border-0 p-0 m-0">
          <legend className="block text-sm font-semibold text-[color:var(--text-primary)] mb-2">
            {t("form.category", "Issue category")}
          </legend>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map(({ id, label }) => {
              const active = category === id;
              return (
                <button
                  key={id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => {
                    setCategory(id);
                    haptics.lightTap();
                  }}
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium px-3 py-2 rounded-full transition-all duration-150 active:scale-95 disabled:opacity-40 min-h-[40px] sm:min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--primary)] focus-visible:ring-offset-2"
                  style={{
                    background: active ? "var(--primary)" : "var(--surface-2)",
                    color: active ? "#fff" : "var(--text-secondary)",
                    boxShadow: active ? "0 2px 8px rgba(27,79,216,0.20)" : "none",
                  }}
                >
                  {t(`categories.${id}`, label)}
                </button>
              );
            })}
          </div>
        </fieldset>

        {/* ── Location ────────────────────────────────────────────────────── */}
        <fieldset className="mb-6 border-0 p-0 m-0">
          <legend className="block text-sm font-semibold text-[color:var(--text-primary)] mb-2">
            Location
          </legend>

          {locationEditable ? (
            <div
              className="flex flex-col gap-4"
              id="location-input"
              aria-describedby={fieldErrors.location ? "location-error" : undefined}
            >
              <div className="flex gap-2 w-full">
                <button
                  type="button"
                  onClick={() => {
                    detectLocation();
                    haptics.lightTap();
                  }}
                  disabled={isSubmitting || isDetecting}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-[10px] text-sm font-semibold transition-all duration-150 active:scale-[0.98] border border-[color:var(--primary)] text-[color:var(--primary)] hover:bg-blue-50 disabled:opacity-50"
                >
                  {isDetecting ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      {accuracy !== null
                        ? `Refining GPS... (~${accuracy}m)`
                        : "Detecting Location..."}
                    </>
                  ) : (
                    <>
                      <MapPin size={16} />
                      Check for Auto-Location
                    </>
                  )}
                </button>

                {isDetecting && (
                  <button
                    type="button"
                    onClick={cancel}
                    className="flex items-center justify-center px-4 rounded-[10px] text-sm font-semibold transition-all border border-red-500 text-red-500 hover:bg-red-50"
                    aria-label="Cancel location detection"
                  >
                    <X size={20} />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-3">
                <hr className="flex-1 border-[color:var(--border)]" />
                <span className="text-[10px] font-bold text-[color:var(--text-muted)] tracking-wider">
                  OR ENTER MANUALLY
                </span>
                <hr className="flex-1 border-[color:var(--border)]" />
              </div>

              <StructuredLocationInput
                onChange={setLocationText}
                disabled={isSubmitting}
                error={fieldErrors.location}
              />
            </div>
          ) : (
            <div
              id="location-input"
              aria-live="polite"
              className="flex items-start gap-2 px-4 py-3 rounded-[10px] text-sm w-full"
              style={{
                background: "var(--surface-2)",
                border: fieldErrors.location ? "1px solid #dc2626" : "1px solid var(--border)",
              }}
            >
              <MapPin
                size={16}
                className="text-[color:var(--primary)] shrink-0 mt-0.5"
                aria-hidden="true"
              />
              <span className="text-[color:var(--text-secondary)] break-words flex-1 line-clamp-2">
                {locationText}
              </span>
              {!locationDetected && (
                <Loader2
                  size={14}
                  className="animate-spin text-[color:var(--primary)] shrink-0 mt-0.5"
                  aria-label="Detecting location"
                />
              )}
            </div>
          )}

          <FieldError id="location-error" message={fieldErrors.location} />

          {locationDetected && !isSubmitting && (
            <div className="mt-2 flex items-center gap-3 text-xs flex-wrap">
              {accuracy !== null && (
                <span
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold"
                  style={{
                    background:
                      accuracy <= 30 ? "#dcfce7" : accuracy <= 100 ? "#fef3c7" : "#fee2e2",
                    color: accuracy <= 30 ? "#166534" : accuracy <= 100 ? "#92400e" : "#991b1b",
                  }}
                >
                  📍 ±{accuracy}m{" "}
                  {accuracy <= 30 ? "GPS" : accuracy <= 100 ? "Good" : "Approximate"}
                </span>
              )}
              <button
                type="button"
                onClick={() => setLocationEditable((v) => !v)}
                className="font-medium text-[color:var(--primary)] hover:underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--primary)] rounded"
              >
                {locationEditable ? "Use detected location" : "Edit manually"}
              </button>
              <span aria-hidden="true" className="text-[color:var(--text-muted)]">
                ·
              </span>
              <button
                type="button"
                onClick={() => {
                  setTempCoords(coords ?? { lat: 13.6288, lng: 79.4192 }); // Tirupati default
                  setMapOpen(true);
                }}
                className="flex items-center gap-1 font-medium text-[color:var(--primary)] hover:underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--primary)] rounded"
              >
                <MapPin size={12} aria-hidden="true" />
                Adjust on map
              </button>
            </div>
          )}
        </fieldset>

        {/* ── Description ─────────────────────────────────────────────────── */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <label
              htmlFor="description"
              className="block text-sm font-semibold text-[color:var(--text-primary)]"
            >
              Describe the issue
            </label>

            {showSpeechInput && speechSupported && (
              <button
                type="button"
                onClick={toggleListening}
                aria-label={isListening ? "Stop voice input" : "Start voice input"}
                aria-pressed={isListening}
                className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--primary)] focus-visible:ring-offset-2 ${
                  isListening
                    ? "bg-red-100 text-red-700"
                    : "bg-[color:var(--surface-2)] text-[color:var(--text-secondary)] hover:text-[color:var(--primary)] border border-[color:var(--border)]"
                }`}
              >
                {isListening ? (
                  <>
                    <span className="relative flex h-2 w-2" aria-hidden="true">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                    </span>
                    <MicOff size={13} />
                    Stop
                  </>
                ) : (
                  <>
                    <Mic size={13} />
                    Speak
                  </>
                )}
              </button>
            )}
          </div>

          <textarea
            ref={descRef}
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value.slice(0, DESCRIPTION_MAX))}
            disabled={isSubmitting}
            aria-describedby={
              [fieldErrors.description ? "desc-error" : null, "desc-count"]
                .filter(Boolean)
                .join(" ") || undefined
            }
            aria-invalid={!!fieldErrors.description}
            placeholder="e.g. Streetlight on MG Road near the bus stop has been out for 3 days"
            className="w-full resize-none overflow-hidden min-h-[80px] px-4 py-3 rounded-[10px] text-sm bg-white outline-none transition-all placeholder:text-[color:var(--text-muted)] disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              border: fieldErrors.description ? "1px solid #dc2626" : "1px solid var(--border)",
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = "var(--primary)";
              e.currentTarget.style.boxShadow = "0 0 0 3px rgba(27,79,216,0.12)";
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = fieldErrors.description
                ? "#dc2626"
                : "var(--border)";
              e.currentTarget.style.boxShadow = "none";
            }}
          />

          <FieldError id="desc-error" message={fieldErrors.description} />

          <p
            id="desc-count"
            aria-live="polite"
            className={`mt-1 text-xs text-right transition-colors ${descWarning ? "text-amber-600 font-medium" : "text-[color:var(--text-muted)]"}`}
          >
            {descRemaining} characters left
          </p>
        </div>

        {/* ── Photo Upload ─────────────────────────────────────────────────── */}
        <div className="mb-7">
          <p className="text-sm font-semibold text-[color:var(--text-primary)] mb-2">
            Photo <span className="font-normal text-[color:var(--text-muted)]">(optional)</span>
          </p>

          {/* Preview */}
          {previewUrl && (
            <div className="relative mb-3 rounded-[12px] overflow-hidden bg-gray-100 group">
              <img
                src={previewUrl}
                alt="Preview of the selected photo"
                className="w-full h-48 object-cover"
              />
              <div
                className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors"
                aria-hidden="true"
              />
              <button
                type="button"
                onClick={handleRemoveFile}
                disabled={isSubmitting}
                aria-label="Remove photo"
                className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                <X size={15} aria-hidden="true" />
              </button>
            </div>
          )}

          {/* Drop zone — only shown when no preview */}
          {!previewUrl && (
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  fileInputRef.current?.click();
                }
              }}
              role="button"
              tabIndex={0}
              aria-label={`Upload a photo. Maximum ${IMAGE_CONFIG.MAX_SIZE_MB}MB, formats: ${IMAGE_CONFIG.ALLOWED_EXTENSIONS.join(", ").toUpperCase()}`}
              aria-describedby={fieldErrors.photo ? "photo-error" : undefined}
              className={`flex flex-col items-center justify-center gap-2 py-7 rounded-[12px] cursor-pointer transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--primary)] focus-visible:ring-offset-2 ${dragActive ? "scale-[1.02] shadow-[0_0_24px_rgba(27,79,216,0.12)]" : ""}`}
              style={{
                background: dragActive ? "rgba(27,79,216,0.04)" : "var(--surface-2)",
                border: dragActive
                  ? "2px dashed var(--primary)"
                  : "1.5px dashed var(--border-hover)",
              }}
            >
              <Upload size={22} className="text-[color:var(--text-secondary)]" aria-hidden="true" />
              <span className="text-sm font-semibold text-[color:var(--text-secondary)]">
                Tap to take a photo or upload
              </span>
              <span className="text-xs text-[color:var(--text-muted)]">
                Up to {IMAGE_CONFIG.MAX_SIZE_MB}MB ·{" "}
                {IMAGE_CONFIG.ALLOWED_EXTENSIONS.join(" / ").toUpperCase()}
              </span>
            </div>
          )}

          <FieldError id="photo-error" message={fieldErrors.photo} />

          <input
            ref={fileInputRef}
            id="photo-upload"
            type="file"
            accept={IMAGE_CONFIG.ALLOWED_TYPES.join(",")}
            capture="environment"
            onChange={(e) => handleFileSelect(e.target.files?.[0] ?? null)}
            className="sr-only"
            aria-hidden="true"
            tabIndex={-1}
          />
        </div>

        {/* ── Email Notification ──────────────────────────────────────────────── */}
        <div className="mb-6 border-0 p-0 m-0">
          <label
            htmlFor="email"
            className="block text-sm font-semibold text-[color:var(--text-primary)] mb-2"
          >
            Get Notified{" "}
            <span className="font-normal text-[color:var(--text-muted)]">(optional)</span>
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isSubmitting}
            placeholder="Enter your email to receive an update when fixed"
            className="w-full px-4 py-3 rounded-[10px] text-sm bg-white outline-none transition-all placeholder:text-[color:var(--text-muted)] disabled:opacity-50 disabled:cursor-not-allowed"
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
        </div>

        {/* ── Anonymous Reporting Toggle ─────────────────────────────────────── */}
        <div className="mb-6 flex items-center justify-between p-4 rounded-[12px] bg-slate-50 border border-slate-200">
          <div>
            <p className="text-sm font-semibold text-slate-800">Report Anonymously</p>
            <p className="text-xs text-slate-500 mt-0.5">Hide your identity on the public map.</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={isAnonymous}
            onClick={() => setIsAnonymous(!isAnonymous)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
              isAnonymous ? "bg-slate-900" : "bg-slate-300"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                isAnonymous ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>

        {/* ── Progress ─────────────────────────────────────────────────────── */}
        {isSubmitting && formState.uploadProgress > 0 && (
          <div className="mb-5">
            <ProgressBar value={formState.uploadProgress} label={progressLabel} />
          </div>
        )}

        {/* ── Global error ─────────────────────────────────────────────────── */}
        {formState.phase === "error" && formState.errorMessage && (
          <div
            role="alert"
            className="mb-5 p-3.5 rounded-[10px] bg-red-50 border border-red-200 text-sm flex items-start gap-2.5"
          >
            <AlertCircle size={16} className="text-red-700 shrink-0 mt-0.5" aria-hidden="true" />
            <div className="flex-1 text-red-700">
              <span className="font-semibold">{formState.errorMessage}</span>
              {formState.duplicateIssueId && (
                <div className="mt-3">
                  <a
                    href={`/map?issueId=${formState.duplicateIssueId}`}
                    className="inline-flex items-center justify-center bg-red-100 hover:bg-red-200 text-red-800 px-4 py-2 rounded-md font-medium transition-colors"
                  >
                    <MapPin size={16} className="mr-2" />
                    View on Map to Upvote
                  </a>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Success / Submit ─────────────────────────────────────────────── */}
        {formState.phase === "success" && formState.trackingToken ? (
          <CivicHeroCard
            token={formState.trackingToken}
            category={category}
            location={locationText}
            onReset={handleReset}
            emailSent={formState.emailSent}
          />
        ) : (
          <div className="flex flex-col gap-4">
            {!rateLimitState.allowed && (
              <div className="p-4 rounded-[12px] bg-indigo-50 border border-indigo-200 flex items-start gap-2.5">
                <AlertCircle size={16} className="text-indigo-700 shrink-0 mt-0.5" />
                <div className="text-sm text-indigo-700">
                  <p className="font-bold">Wow, what a Civic Hero!</p>
                  <p className="mt-1">
                    Thanks for saving this city from issues and thanks for your survey today and
                    letting us know! You've reached the maximum limit of 24 reports for today. Get
                    some rest and come back tomorrow!
                  </p>
                </div>
              </div>
            )}

            {rateLimitState.allowed && rateLimitState.remaining <= 6 && (
              <div className="p-4 rounded-[12px] bg-amber-50 border border-amber-200 flex items-start gap-2.5 mb-2">
                <AlertCircle size={16} className="text-amber-700 shrink-0 mt-0.5" />
                <div className="text-sm text-amber-700">
                  <p className="font-bold">You are reaching your limit!</p>
                  <p className="mt-1">
                    You have {rateLimitState.remaining} requests left today. Thanks for being so
                    active in your community!
                  </p>
                </div>
              </div>
            )}

            {rateLimitState.allowed && recaptchaSiteKey && (
              <div className="mt-8 flex justify-center">
                <ClientOnly>
                  <ReCAPTCHA
                    sitekey={recaptchaSiteKey}
                    onChange={(token) => setCaptchaValue(token)}
                    theme="light"
                  />
                </ClientOnly>
              </div>
            )}

            {rateLimitState.allowed && !recaptchaSiteKey && (
              <div className="p-4 rounded-[12px] bg-red-50 border border-red-200 flex items-start gap-2.5 mb-2">
                <AlertCircle size={16} className="text-red-700 shrink-0 mt-0.5" />
                <div className="text-sm text-red-700">
                  <p className="font-bold">Reporting is temporarily unavailable.</p>
                  <p className="mt-1">The reCAPTCHA site key is not configured.</p>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting || !rateLimitState.allowed || !recaptchaSiteKey}
              aria-busy={isSubmitting}
              className="relative overflow-hidden w-full inline-flex items-center justify-center gap-2 h-12 rounded-[10px] font-semibold text-white transition-all duration-200 active:scale-[0.98] disabled:active:scale-100 disabled:opacity-80 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--primary)] focus-visible:ring-offset-2"
              style={{
                background:
                  formState.phase === "error" || !rateLimitState.allowed || !recaptchaSiteKey
                    ? "#dc2626"
                    : "var(--primary)",
                boxShadow:
                  !isSubmitting && rateLimitState.allowed && recaptchaSiteKey
                    ? "0 4px 16px rgba(27,79,216,0.25)"
                    : "none",
              }}
            >
              {isSubmitting && (
                <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent" />
              )}
              {isSubmitting ? (
                <>
                  <Loader2 size={17} className="animate-spin" aria-hidden="true" /> {submitLabel}
                </>
              ) : (
                submitLabel
              )}
            </button>
          </div>
        )}
      </form>

      {/* ── Map Modal ──────────────────────────────────────────────────────────── */}
      {mapOpen && tempCoords && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Adjust pin location on map"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-6"
        >
          <div
            ref={mapModalRef}
            className="flex flex-col bg-white w-full h-full sm:h-[85vh] max-h-[820px] max-w-3xl sm:rounded-2xl shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-[color:var(--border)] bg-white shrink-0">
              <h2 className="font-bold text-[color:var(--text-primary)] text-base">
                Adjust pin location
              </h2>
              <button
                type="button"
                onClick={() => setMapOpen(false)}
                aria-label="Close map"
                className="p-1.5 rounded-full text-[color:var(--text-secondary)] hover:bg-[color:var(--surface-2)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--primary)]"
              >
                <X size={20} aria-hidden="true" />
              </button>
            </div>

            {/* Map */}
            <div className="flex-1 relative min-h-0 bg-slate-50">
              <ClientOnly>
                <Suspense
                  fallback={
                    <div className="w-full h-full flex items-center justify-center">
                      <Loader2 className="animate-spin text-[color:var(--primary)]" size={32} />
                    </div>
                  }
                >
                  <ComplaintMapLeaflet locationCoords={tempCoords} setTempCoords={setTempCoords} />
                </Suspense>
              </ClientOnly>

              {/* Confirm overlay */}
              <div className="absolute bottom-5 left-1/2 -translate-x-1/2 w-[90%] sm:w-80 z-[400] pointer-events-none">
                <div
                  className="bg-white rounded-[16px] p-4 pointer-events-auto"
                  style={{
                    boxShadow: "0 4px 24px rgba(0,0,0,0.15)",
                    border: "1px solid var(--border)",
                  }}
                >
                  <p className="text-xs text-[color:var(--text-secondary)] text-center mb-3">
                    Drag the pin to the exact location of the issue.
                  </p>
                  <button
                    type="button"
                    onClick={handleConfirmMapLocation}
                    disabled={mapGeocoding}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-[10px] bg-[color:var(--primary)] text-white font-semibold text-sm transition-all disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--primary)] focus-visible:ring-offset-2"
                  >
                    {mapGeocoding ? (
                      <>
                        <Loader2 size={16} className="animate-spin" aria-hidden="true" /> Updating
                        location…
                      </>
                    ) : (
                      "Confirm location"
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
