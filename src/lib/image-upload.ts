

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
  if (!(IMAGE_CONFIG.ALLOWED_TYPES as readonly string[]).includes(file.type)) {
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


