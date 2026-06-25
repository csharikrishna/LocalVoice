import React, { useState } from "react";
import { signInWithEmailAndPassword, sendSignInLinkToEmail } from "firebase/auth";
import { auth } from "../../lib/firebase";
import { Loader2, Lock } from "lucide-react";

function getAuthError(error: unknown) {
  if (error && typeof error === "object") {
    return error as { code?: string; message?: string };
  }
  return { message: String(error) };
}

export function AdminLogin() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [linkSent, setLinkSent] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const domain = (import.meta.env.VITE_APP_NAME || "LocalVoice")
      .toLowerCase()
      .replace(/\s+/g, "");
    // Support both short usernames (e.g. 'electrical') and full emails (e.g. 'electrical@localvoice.admin')
    const adminEmail = username.includes("@") ? username : `${username}@${domain}.admin`;

    try {
      await signInWithEmailAndPassword(auth, adminEmail, password);
    } catch (err) {
      const authError = getAuthError(err);
      // If the superadmin account was deleted from Firebase Auth, recreate it on the fly
      if (
        username === import.meta.env.VITE_ADMIN_USERNAME &&
        (authError.code === "auth/invalid-credential" || authError.code === "auth/user-not-found")
      ) {
        try {
          const { createUserWithEmailAndPassword } = await import("firebase/auth");
          await createUserWithEmailAndPassword(auth, adminEmail, password);
          return;
        } catch (createErr) {
          const createError = getAuthError(createErr);
          if (createError.code === "auth/email-already-in-use") {
            setError(
              "Invalid credentials. If you forgot your password, please use the Magic Link below.",
            );
          } else {
            setError("Error initializing superadmin: " + (createError.message || "Unknown error"));
          }
        }
      } else {
        setError("Invalid credentials. Please check your username and password.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleMagicLink = async () => {
    setError("");
    setLoading(true);
    const email = import.meta.env.VITE_ADMIN_EMAIL;

    if (!email) {
      setError("Admin email not configured in .env.local");
      setLoading(false);
      return;
    }

    try {
      const actionCodeSettings = {
        url: window.location.origin + "/admin",
        handleCodeInApp: true,
      };
      await sendSignInLinkToEmail(auth, email, actionCodeSettings);
      window.localStorage.setItem("emailForSignIn", email);
      setLinkSent(true);
    } catch (err) {
      const authError = getAuthError(err);
      setError("Failed to send magic link: " + (authError.message || "Unknown error"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[color:var(--bg)] px-4">
      <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-xl border border-gray-100">
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4 text-blue-600">
            <Lock size={24} />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Login</h1>
          <p className="text-sm text-gray-500 mt-1 text-center">
            Sign in with your default admin credentials.
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              placeholder="admin_user"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : "Sign In"}
          </button>
        </form>

        <div className="mt-6 flex items-center justify-between">
          <span className="border-b border-gray-200 w-1/5 lg:w-1/4"></span>
          <span className="text-xs text-center text-gray-500 uppercase font-semibold tracking-wider">
            Or
          </span>
          <span className="border-b border-gray-200 w-1/5 lg:w-1/4"></span>
        </div>

        <div className="mt-6">
          {linkSent ? (
            <div className="text-sm text-green-700 bg-green-50 p-4 rounded-lg text-center border border-green-200">
              <span className="block font-semibold mb-1">Check your inbox!</span>
              We've sent a magic link to your admin email.
            </div>
          ) : (
            <button
              type="button"
              onClick={handleMagicLink}
              disabled={loading}
              className="w-full bg-white border-2 border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50 font-medium py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              Send Magic Link
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
