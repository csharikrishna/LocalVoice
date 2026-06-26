export const DESCRIPTION_MAX = 300;

import { Droplet, Zap, Trash2, Route, Waves, Lightbulb, MapPin, Bath, TreePine, AlertTriangle } from "lucide-react";

export const CATEGORIES = [
  { id: "streetlight", label: "Streetlight", icon: Lightbulb },
  { id: "water", label: "Water", icon: Droplet },
  { id: "garbage", label: "Garbage", icon: Trash2 },
  { id: "roads", label: "Roads", icon: Route },
  { id: "drainage", label: "Drainage", icon: Waves },
  { id: "electricity", label: "Electricity", icon: Zap },
  { id: "encroachment", label: "Encroachment", icon: MapPin },
  { id: "publictoilet", label: "Public Toilet", icon: Bath },
  { id: "park", label: "Park / Garden", icon: TreePine },
  { id: "other", label: "Other", icon: AlertTriangle },
] as const;

export type CategoryId = (typeof CATEGORIES)[number]["id"];

export interface Coords {
  lat: number;
  lng: number;
}

export function generateTrackingToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(4));
  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
  return `CVC-${hex}`;
}

export function sanitiseText(text: string): string {
  return text.trim().replace(/\s+/g, " ");
}

export function getDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const radiusMeters = 6371e3;
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return radiusMeters * c;
}

export function getDepartmentForCategory(category: CategoryId): string {
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

export function calculatePriority(description: string): "low" | "medium" | "high" {
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
  if (highPriority.some((keyword) => desc.includes(keyword))) return "high";
  const mediumPriority = ["broken", "pothole", "leak", "smell", "dead animal"];
  if (mediumPriority.some((keyword) => desc.includes(keyword))) return "medium";
  return "low";
}
