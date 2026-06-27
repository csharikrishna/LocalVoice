import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { getInvitation, respondToInvitation } from "@/lib/api/admin.functions";
import { Loader2, CheckCircle2, XCircle, Shield, ArrowRight, Lock } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/invite/$token")({
  component: InvitePage,
});

function InvitePage() {
  const { token } = Route.useParams();
  const [invite, setInvite] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<"review" | "set_password" | "done">("review");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = Route.useNavigate();

  useEffect(() => {
    async function fetchInvite() {
      try {
        const data = await getInvitation({ data: token });
        if (!data) {
          setError("This invitation link is invalid or has expired.");
        } else if (data.status !== "pending") {
          setError(`This invitation has already been ${data.status}.`);
        } else {
          setInvite(data);
        }
      } catch (err) {
        setError("Failed to load invitation details.");
      } finally {
        setLoading(false);
      }
    }
    fetchInvite();
  }, [token]);

  const handleDecline = async () => {
    setIsSubmitting(true);
    try {
      const res = await respondToInvitation({ data: { token, action: "reject" } });
      if (res.ok) {
        toast.success("Invitation declined.");
        setError("You have declined this invitation.");
      } else {
        toast.error(res.message);
      }
    } catch (err) {
      toast.error("Failed to decline invitation.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAccept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await respondToInvitation({ data: { token, action: "accept", password } });
      if (res.ok) {
        toast.success("Account created successfully!");
        setStep("done");
      } else {
        toast.error(res.message);
      }
    } catch (err) {
      toast.error("Failed to create account.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Loader2 className="animate-spin text-blue-600" size={40} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 text-center max-w-md w-full">
          <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <XCircle size={32} />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Invitation Unavailable</h1>
          <p className="text-slate-600 mb-8">{error}</p>
          <a href="/" className="text-blue-600 font-medium hover:underline">
            Return to Homepage
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-200 max-w-md w-full overflow-hidden relative">
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 to-indigo-500" />

        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 rotate-3">
            <Shield size={32} />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Welcome to LocalVoice</h1>
          <p className="text-slate-500 mt-2">You've been invited to join the staff portal.</p>
        </div>

        {step === "review" && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-4 mb-8">
              <div>
                <p className="text-xs uppercase tracking-wider font-bold text-slate-400 mb-1">
                  Email
                </p>
                <p className="font-medium text-slate-900">{invite.email}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider font-bold text-slate-400 mb-1">
                  Role
                </p>
                <p className="font-medium text-slate-900 capitalize">
                  {invite.role.replace("_", " ")}
                </p>
              </div>
              {invite.department && (
                <div>
                  <p className="text-xs uppercase tracking-wider font-bold text-slate-400 mb-1">
                    Department
                  </p>
                  <p className="font-medium text-slate-900">{invite.department}</p>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleDecline}
                disabled={isSubmitting}
                className="flex-1 py-3 text-slate-600 font-medium border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors disabled:opacity-50"
              >
                Decline
              </button>
              <button
                onClick={() => setStep("set_password")}
                disabled={isSubmitting}
                className="flex-1 py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50"
              >
                Accept Offer
              </button>
            </div>
          </div>
        )}

        {step === "set_password" && (
          <form
            onSubmit={handleAccept}
            className="animate-in fade-in slide-in-from-right-8 duration-500"
          >
            <p className="text-slate-600 mb-6 text-center">
              Great! Let's secure your account. Please choose a password to complete your
              registration.
            </p>

            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-700 mb-2">Password</label>
              <div className="relative">
                <Lock
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="password"
                  required
                  autoFocus
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none transition-shadow"
                  placeholder="At least 6 characters"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors shadow-sm flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Creating Account...
                </>
              ) : (
                <>
                  Complete Registration <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>
        )}

        {step === "done" && (
          <div className="animate-in fade-in zoom-in-95 duration-500 text-center">
            <div className="w-16 h-16 bg-green-50 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 size={32} />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">You're All Set!</h2>
            <p className="text-slate-600 mb-8">
              Your account has been successfully created. You can now log into the staff portal.
            </p>
            <button
              onClick={() => navigate({ to: "/admin" })}
              className="w-full py-3 bg-slate-900 text-white font-medium rounded-xl hover:bg-slate-800 transition-colors shadow-sm"
            >
              Go to Login
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
