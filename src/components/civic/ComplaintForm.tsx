import { useEffect, useRef, useState } from "react";
import { Check, MapPin, Camera, Loader2, Upload, X, AlertCircle } from "lucide-react";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { uploadImage, validateImageFile, ImageUploadError, IMAGE_CONFIG } from "@/lib/image-upload";

const categories = ["Streetlight", "Water", "Garbage", "Roads", "Other"];

interface FormState {
  status: "idle" | "loading" | "success" | "error";
  uploadProgress: number;
}

export function ComplaintForm() {
  const [cat, setCat] = useState("Streetlight");
  const [loc, setLoc] = useState("Detecting your location…");
  const [desc, setDesc] = useState("");
  const [state, setState] = useState<FormState>({ status: "idle", uploadProgress: 0 });
  const [submittedId, setSubmittedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

  // Get user location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          try {
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`);
            if (!res.ok) throw new Error("Failed to fetch location");
            const data = await res.json();
            
            // Grab the first 3-4 segments of the display_name for a clear, descriptive address
            const displayLoc = data.display_name.split(',').slice(0, 4).join(',').trim();
            setLoc(displayLoc);
            setCoords({ lat: latitude, lng: longitude });
          } catch (err) {
            setLoc(`Location (${latitude.toFixed(3)}, ${longitude.toFixed(3)})`);
            setCoords({ lat: latitude, lng: longitude });
          }
        },
        () => {
          setLoc("Location access denied");
        }
      );
    } else {
      setTimeout(() => setLoc("Location unavailable"), 1400);
    }
  }, []);

  // Handle file selection
  const handleFileSelect = (file: File | null) => {
    if (!file) return;

    const validation = validateImageFile(file);
    if (!validation.valid) {
      setError(validation.error || "Invalid file");
      return;
    }

    setSelectedFile(file);
    setError(null);

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Handle click to upload
  const handleClickUpload = () => {
    fileInputRef.current?.click();
  };

  // Handle file input change
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFileSelect(e.target.files?.[0] || null);
  };

  // Handle drag and drop
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    handleFileSelect(e.dataTransfer.files?.[0] || null);
  };

  // Remove selected file
  const handleRemoveFile = () => {
    setSelectedFile(null);
    setPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Submit form with optional photo
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (state.status !== "idle" || !desc.trim()) {
      setError("Please describe the issue");
      return;
    }

    setState({ status: "loading", uploadProgress: 0 });
    setError(null);

    try {
      let photoURL: string | null = null;

      // Upload photo if selected
      if (selectedFile) {
        setState({ status: "loading", uploadProgress: 30 });
        photoURL = await uploadImage(selectedFile, "temp", (progress) => {
          setState({ status: "loading", uploadProgress: 30 + (progress * 0.6) / 100 });
        });
      }

      setState({ status: "loading", uploadProgress: 90 });

      // Generate tracking token
      const generateToken = () => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let token = 'CVC-';
        for (let i = 0; i < 6; i++) {
          token += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return token;
      };
      const token = generateToken();

      // Create complaint document in Firestore
      const docRef = await addDoc(collection(db, "complaints"), {
        category: cat,
        location: loc,
        coordinates: coords,
        description: desc,
        photoURL: photoURL || null,
        timestamp: serverTimestamp(),
        status: "open",
        priority: "medium",
        version: 1, // For future schema updates
        token: token,
      });

      setState({ status: "loading", uploadProgress: 100 });
      setSubmittedId(token);
      setState({ status: "success", uploadProgress: 100 });
      setDesc("");
      setSelectedFile(null);
      setPreview(null);

      // Reset form after delay
      setTimeout(() => {
        setState({ status: "idle", uploadProgress: 0 });
        setSubmittedId(null);
      }, 4000);
    } catch (err) {
      console.error("Error submitting complaint:", err);

      let errorMessage = "Failed to submit. Please try again.";
      if (err instanceof ImageUploadError) {
        errorMessage = err.message;
      } else if (err instanceof Error) {
        if (err.message.includes("permission")) {
          errorMessage = "Permission denied. Check your network and try again.";
        } else if (err.message.includes("quota")) {
          errorMessage = "Storage quota exceeded. Please contact support.";
        }
      }

      setError(errorMessage);
      setState({ status: "error", uploadProgress: 0 });
      setTimeout(() => setState({ status: "idle", uploadProgress: 0 }), 3000);
    }
  };

  return (
    <form
      onSubmit={submit}
      className="bg-white rounded-[24px] p-7 sm:p-8 w-full"
      style={{ boxShadow: "var(--shadow-xl)" }}
      aria-label="Submit complaint form"
    >
      {/* Category Selection */}
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
                disabled={state.status !== "idle"}
                className="text-sm font-medium px-3.5 py-2 rounded-full transition-all disabled:opacity-50"
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

      {/* Location Display */}
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

      {/* Description */}
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
          disabled={state.status !== "idle"}
          placeholder="Describe what you see (e.g., 'Streetlight has been out for 3 days')"
          className="w-full resize-y px-4 py-3 rounded-[10px] text-sm bg-white outline-none transition-all placeholder:text-[color:var(--text-muted)] disabled:opacity-50 disabled:cursor-not-allowed"
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

      {/* Photo Upload */}
      <div className="mb-6">
        <label className="block text-sm font-semibold text-[color:var(--text-primary)] mb-1.5">
          Photo (optional)
        </label>

        {/* Preview */}
        {preview && (
          <div className="relative mb-4 rounded-[10px] overflow-hidden bg-gray-100">
            <img
              src={preview}
              alt="Preview"
              className="w-full h-48 object-cover"
            />
            <button
              type="button"
              onClick={handleRemoveFile}
              disabled={state.status !== "idle"}
              className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors disabled:opacity-50"
              aria-label="Remove photo"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* Upload Area */}
        {!preview && (
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={handleClickUpload}
            className="flex flex-col items-center justify-center gap-1.5 py-6 rounded-[10px] cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: dragActive ? "rgba(27, 79, 216, 0.05)" : "var(--surface-2)",
              border: dragActive
                ? "2px solid var(--primary)"
                : "1.5px dashed var(--border-hover)",
            }}
          >
            <Upload
              size={20}
              className="text-[color:var(--text-secondary)]"
            />
            <span className="text-sm text-[color:var(--text-secondary)]">
              Drag a photo here or tap to upload
            </span>
            <span className="text-xs text-[color:var(--text-muted)]">
              Max {IMAGE_CONFIG.MAX_SIZE_MB}MB • {IMAGE_CONFIG.ALLOWED_EXTENSIONS.join(", ").toUpperCase()}
            </span>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept={IMAGE_CONFIG.ALLOWED_TYPES.join(",")}
          onChange={handleFileInputChange}
          className="hidden"
          aria-label="Upload photo"
        />
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-3 rounded-[10px] bg-red-50 border border-red-200 text-sm text-red-600 flex items-start gap-2">
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Upload Progress */}
      {state.status === "loading" && state.uploadProgress > 0 && (
        <div className="mb-4">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-[color:var(--text-secondary)]">Uploading...</span>
            <span className="font-medium">{Math.round(state.uploadProgress)}%</span>
          </div>
          <div
            className="h-2 rounded-full overflow-hidden"
            style={{ background: "var(--surface-2)" }}
          >
            <div
              className="h-full transition-all duration-300"
              style={{
                background: "var(--primary)",
                width: `${state.uploadProgress}%`,
              }}
            />
          </div>
        </div>
      )}

      {/* Submit Button */}
      <button
        type="submit"
        disabled={state.status !== "idle"}
        className="w-full inline-flex items-center justify-center gap-2 h-12 rounded-[10px] font-semibold text-white transition-all disabled:opacity-75 disabled:cursor-not-allowed"
        style={{
          background:
            state.status === "success"
              ? "var(--success)"
              : state.status === "error"
                ? "#dc2626"
                : "var(--primary)",
          boxShadow:
            state.status === "idle"
              ? "0 6px 20px rgba(27,79,216,0.25)"
              : "none",
        }}
      >
        {state.status === "idle" && <>Submit Report →</>}
        {state.status === "loading" && (
          <>
            <Loader2 size={18} className="animate-spin" /> Submitting…
          </>
        )}
        {state.status === "success" && (
          <>
            <Check size={18} /> Report {submittedId} submitted!
          </>
        )}
        {state.status === "error" && <>Error - Try Again</>}
      </button>
    </form>
  );
}
