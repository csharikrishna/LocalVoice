// Constants for image validation
export const IMAGE_CONFIG = {
  MAX_SIZE_MB: 5,
  MAX_SIZE_BYTES: 5 * 1024 * 1024, // 5MB
  ALLOWED_TYPES: ["image/jpeg", "image/png", "image/webp"],
  ALLOWED_EXTENSIONS: ["jpg", "jpeg", "png", "webp"],
} as const;

export class ImageUploadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ImageUploadError";
  }
}

/**
 * Validates image file before upload
 */
export function validateImageFile(file: File): { valid: boolean; error?: string } {
  if (!file) {
    return { valid: false, error: "No file selected" };
  }

  // Check file type
  if (!IMAGE_CONFIG.ALLOWED_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: `Invalid file type. Allowed: ${IMAGE_CONFIG.ALLOWED_EXTENSIONS.join(", ")}`,
    };
  }

  // Check file size
  if (file.size > IMAGE_CONFIG.MAX_SIZE_BYTES) {
    return {
      valid: false,
      error: `File too large. Maximum size: ${IMAGE_CONFIG.MAX_SIZE_MB}MB`,
    };
  }

  return { valid: true };
}

/**
 * Uploads image to Cloudinary using Unsigned Uploads
 * Returns optimized download URL on success
 */
export async function uploadImage(
  file: File,
  _complaintId: string, // Kept for API compatibility with existing code
  onProgress?: (progress: number) => void
): Promise<string> {
  // Validate file
  const validation = validateImageFile(file);
  if (!validation.valid) {
    throw new ImageUploadError(validation.error || "Invalid file");
  }

  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

  if (!cloudName || !uploadPreset) {
    throw new ImageUploadError("Cloudinary configuration missing in environment variables.");
  }

  const url = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", uploadPreset);

  try {
    // Simulate initial progress
    onProgress?.(30);

    const response = await fetch(url, {
      method: "POST",
      body: formData,
    });

    onProgress?.(80);

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Cloudinary upload failed:", errorData);
      throw new Error(errorData.error?.message || "Upload failed");
    }

    const data = await response.json();
    onProgress?.(100);

    // Inject format (f_auto) and quality (q_auto) transformations directly into the secure URL
    // e.g., transforms https://res.cloudinary.com/.../upload/v1234/test.jpg 
    // to https://res.cloudinary.com/.../upload/f_auto,q_auto/v1234/test.jpg
    const optimizedUrl = data.secure_url.replace("/upload/", "/upload/f_auto,q_auto/");
    
    return optimizedUrl;

  } catch (error) {
    console.error("Image upload error:", error);
    throw new ImageUploadError("Failed to upload image. Please try again.");
  }
}

/**
 * Deletes image. Since we use Cloudinary Unsigned Uploads, client-side deletion
 * is disabled by default for security reasons. We will just return a no-op.
 */
export async function deleteImage(_downloadURL: string): Promise<void> {
  console.log("Image deletion skipped (Cloudinary handles lifecycle/cleanup automatically).");
  return Promise.resolve();
}
