import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

const qrSticker = read("src/components/civic/QrSticker.tsx");
assert.match(qrSticker, /buildQrReportUrl/, "QR URL builder should be explicit and testable.");
assert.match(qrSticker, /#report/, "Default QR links should target the existing report section.");
assert.doesNotMatch(
  qrSticker,
  /\/report\?id=/,
  "QR links must not target the missing /report route.",
);
assert.doesNotMatch(
  qrSticker,
  /\/r\/\$\{assetId\}/,
  "QR links must not target the missing /r route.",
);

const complaintForm = read("src/components/civic/ComplaintForm.tsx");
assert.match(
  complaintForm,
  /submitComplaint/,
  "Complaint form should use the server submission function.",
);
assert.doesNotMatch(
  complaintForm,
  /6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI/,
  "Complaint form must not use Google's public reCAPTCHA test key.",
);
assert.doesNotMatch(
  complaintForm,
  /addDoc\(collection\(db,\s*["']complaints["']\)/,
  "Complaint form must not create complaint documents directly from the browser.",
);

const complaintServerFn = read("src/lib/api/complaints.functions.ts");
const complaintServerHandler = read("src/lib/api/complaints.server.ts");
assert.match(
  complaintServerFn,
  /import\("\.\/complaints\.server"\)/,
  "Complaint server function should isolate server-only imports behind a dynamic server import.",
);
assert.match(
  complaintServerHandler,
  /siteverify/,
  "Server complaint submission should verify reCAPTCHA.",
);
assert.match(
  complaintServerHandler,
  /checkServerReportRateLimit/,
  "Server complaint submission should rate-limit requests.",
);
assert.match(
  complaintServerHandler,
  /findDuplicate/,
  "Server complaint submission should perform duplicate checks.",
);

const firestoreRules = read("firestore.rules");
assert.match(
  firestoreRules,
  /function isValidComplaint\(\)/,
  "Complaint create validation must exist.",
);
assert.match(firestoreRules, /function isOnlyUpvoting\(\)/, "Public upvote guard must exist.");
assert.match(
  firestoreRules,
  /allow create:\s*if\s*[\s\S]*isValidComplaint\(\)\s*&&\s*[\s\S]*isValidPhotoURL\(\)/,
  "Complaint creates should require complaint and photo URL validation.",
);
assert.match(
  firestoreRules,
  /match \/\{document=\*\*\}\s*\{\s*allow read, write: if false;/,
  "Firestore catch-all deny rule must remain present.",
);
assert.match(
  firestoreRules,
  /match \/admins\/\{adminId\}[\s\S]*allow write: if isSuperAdmin\(\);/,
  "Admin writes should remain gated by isSuperAdmin until the role model is rewritten.",
);

const storageRules = read("storage.rules");
assert.match(
  storageRules,
  /function isValidSize\(\)/,
  "Storage upload size validation must exist.",
);
assert.match(storageRules, /image\/jpeg/, "Storage rules should allow JPEG complaint images.");
assert.match(storageRules, /image\/png/, "Storage rules should allow PNG complaint images.");
assert.match(storageRules, /image\/webp/, "Storage rules should allow WebP complaint images.");
assert.match(
  storageRules,
  /match \/\{allPaths=\*\*\}\s*\{\s*allow read, write: if false;/,
  "Storage catch-all deny rule must remain present.",
);

console.log("Milestone 1 smoke checks passed.");
