/**
 * useGeolocation.ts — High-accuracy location detection with progressive refinement
 *
 * Strategy: watchPosition() keeps updating as GPS locks improve, finalizing as
 * soon as accuracy crosses a usable threshold OR the max wait elapses — whichever
 * is first. This avoids the common mistake of using getCurrentPosition() alone,
 * which often returns a fast, low-accuracy fix (e.g. cell-tower triangulation)
 * and never gets a chance to improve.
 *
 * Key fixes over v1:
 *   • Race condition: watchPosition can fire a new, better fix while a previous
 *     reverse-geocode call is still in flight. v1 would let both calls finalize
 *     and call onSuccess twice. This version uses a `settled` flag + a generation
 *     counter so only the call that "wins" is allowed to commit state.
 *   • AbortController is now created once per detectLocation() call (not once
 *     per finalize attempt), and any in-flight geocode is properly aborted
 *     when a newer, better fix supersedes it — not just on unmount.
 *   • onSuccess / onError are intentionally NOT in the detectLocation dependency
 *     array via a ref, so callers can pass inline arrow functions without
 *     retriggering effects or invalidating the memoized callback identity.
 *   • Permission-denied is treated as terminal — no point continuing to watch.
 *   • Returns a `cancel()` so the consumer can let the user abort detection.
 */

import { useState, useCallback, useRef, useEffect } from 'react';

const GEOCODE_URL = "https://nominatim.openstreetmap.org/reverse";
const NOMINATIM_HEADERS = { "Accept-Language": "en" };
const ACCURACY_THRESHOLD_M = 30; // GPS-lock quality; below this we trust the fix
const MAX_WAIT_MS = 15_000;

// ─── Reverse geocoding ──────────────────────────────────────────────────────

/** Reverse-geocode lat/lng → human-readable address string. */
export async function reverseGeocode(
  lat: number,
  lng: number,
  signal?: AbortSignal
): Promise<string> {
  const url = new URL(GEOCODE_URL);
  url.searchParams.set("lat", String(lat));
  url.searchParams.set("lon", String(lng));
  url.searchParams.set("format", "json");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("zoom", "18"); // street-level precision

  const res = await fetch(url.toString(), { headers: NOMINATIM_HEADERS, signal });
  if (!res.ok) throw new Error(`Geocode request failed (${res.status})`);

  const data = await res.json();
  const addr = data.address ?? {};

  // Structured address reads better than display_name for Indian addresses
  const structured = [
    addr.road || addr.pedestrian || addr.footway,
    addr.neighbourhood || addr.suburb || addr.quarter,
    addr.village || addr.town || addr.city || addr.city_district,
    addr.state_district || addr.county,
    addr.postcode,
  ].filter(Boolean);

  if (structured.length >= 2) return structured.join(", ");

  // Fallback: strip broad regions (state/country) from display_name
  const parts: string[] = (data.display_name ?? "").split(",").map((p: string) => p.trim());
  const ignore = new Set([addr.state, addr.country, addr.country_code].filter(Boolean));
  const local = parts.filter((p) => !ignore.has(p));
  return (local.length > 0 ? local : parts).join(", ");
}

// ─── Types ──────────────────────────────────────────────────────────────────

export interface GeoCoords {
  lat: number;
  lng: number;
}

interface UseGeolocationOptions {
  onSuccess: (coords: GeoCoords, address: string, accuracy: number) => void;
  onError: (message: string) => void;
}

interface UseGeolocationResult {
  detectLocation: () => void;
  cancel: () => void;
  isDetecting: boolean;
  accuracy: number | null;
}

// ─── Hook ───────────────────────────────────────────────────────────────────

export function useGeolocation({ onSuccess, onError }: UseGeolocationOptions): UseGeolocationResult {
  const [isDetecting, setIsDetecting] = useState(false);
  const [accuracy, setAccuracy] = useState<number | null>(null);

  // Keep latest callbacks in refs so detectLocation's identity stays stable
  // even if the caller passes fresh inline functions on every render.
  const onSuccessRef = useRef(onSuccess);
  const onErrorRef = useRef(onError);
  useEffect(() => { onSuccessRef.current = onSuccess; }, [onSuccess]);
  useEffect(() => { onErrorRef.current = onError; }, [onError]);

  const watchIdRef = useRef<number | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const geocodeAbortRef = useRef<AbortController | null>(null);
  const bestFixRef = useRef<{ lat: number; lng: number; accuracy: number } | null>(null);

  // Monotonically increasing token: only the most recent finalize() call may
  // commit state. Prevents a slow, stale geocode response from overwriting
  // a result that already settled (the core race fixed in this version).
  const generationRef = useRef(0);
  const settledRef = useRef(false);

  const stopWatch = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const cancel = useCallback(() => {
    stopWatch();
    geocodeAbortRef.current?.abort();
    settledRef.current = true; // block any in-flight finalize from committing
    setIsDetecting(false);
  }, [stopWatch]);

  const finalize = useCallback(async (lat: number, lng: number, acc: number) => {
    // Claim this attempt's generation. If a better fix supersedes us before
    // the geocode resolves, our generation goes stale and we no-op on return.
    const myGeneration = ++generationRef.current;
    settledRef.current = false;

    stopWatch();

    // Abort any previous in-flight geocode — it's now superseded.
    geocodeAbortRef.current?.abort();
    const controller = new AbortController();
    geocodeAbortRef.current = controller;

    let address: string;
    try {
      address = await reverseGeocode(lat, lng, controller.signal);
    } catch {
      address = controller.signal.aborted ? "" : `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    }

    // Stale if: aborted mid-flight, a newer generation started, or we already
    // settled via cancel()/error path.
    if (controller.signal.aborted || myGeneration !== generationRef.current || settledRef.current) {
      return;
    }

    settledRef.current = true;
    setAccuracy(Math.round(acc));
    setIsDetecting(false);
    onSuccessRef.current({ lat, lng }, address, acc);
  }, [stopWatch]);

  const detectLocation = useCallback(() => {
    if (!navigator.geolocation) {
      onErrorRef.current("Location is not supported by your browser.");
      return;
    }

    setIsDetecting(true);
    setAccuracy(null);
    bestFixRef.current = null;
    settledRef.current = false;
    generationRef.current++; // invalidate any prior in-flight finalize
    stopWatch();

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, accuracy: newAcc } = position.coords;
        const current = bestFixRef.current;

        if (!current || newAcc < current.accuracy) {
          bestFixRef.current = { lat: latitude, lng: longitude, accuracy: newAcc };
          setAccuracy(Math.round(newAcc));
        }

        if (newAcc <= ACCURACY_THRESHOLD_M) {
          finalize(latitude, longitude, newAcc);
        }
      },
      (error) => {
        stopWatch();

        // A fix already arrived (e.g. timeout after one good reading) — use it.
        if (bestFixRef.current) {
          finalize(bestFixRef.current.lat, bestFixRef.current.lng, bestFixRef.current.accuracy);
          return;
        }

        setIsDetecting(false);

        const messages: Partial<Record<number, string>> = {
          1: "Location access denied. Enable location permissions in your browser settings, or enter the address manually.",
          2: "Location unavailable. Your device couldn't determine your position — please enter it manually.",
          3: "Location timed out. Please try again or enter your location manually.",
        };
        onErrorRef.current(messages[error.code] ?? "Location detection failed. Please enter manually.");
      },
      {
        enableHighAccuracy: true,
        timeout: MAX_WAIT_MS,
        maximumAge: 0,
      }
    );

    timeoutRef.current = setTimeout(() => {
      if (bestFixRef.current) {
        finalize(bestFixRef.current.lat, bestFixRef.current.lng, bestFixRef.current.accuracy);
      } else {
        stopWatch();
        setIsDetecting(false);
        onErrorRef.current("Could not get a GPS fix in time. Please enter your location manually.");
      }
    }, MAX_WAIT_MS);
  }, [stopWatch, finalize]);

  // Cleanup on unmount: stop watching and abort any in-flight geocode/finalize.
  useEffect(() => {
    return () => {
      stopWatch();
      geocodeAbortRef.current?.abort();
      settledRef.current = true;
    };
  }, [stopWatch]);

  return { detectLocation, cancel, isDetecting, accuracy };
}