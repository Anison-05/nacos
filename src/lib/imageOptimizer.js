/**
 * Candidate Image Processing & Optimization Utility
 *
 * Requirements:
 * - Reject files > 3 MB
 * - Accept only JPG, JPEG, PNG, WEBP
 * - Resize to optimal display dimensions (max 1000px)
 * - Compress with HTML5 Canvas (target quality 0.85)
 * - Produce clean WebP/JPEG blob for upload to Supabase Storage
 */

export const MAX_IMAGE_SIZE_BYTES = 3 * 1024 * 1024; // 3 MB
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

/**
 * Validates candidate image file size and MIME type
 * @param {File} file
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateCandidateImage(file) {
  if (!file) {
    return { valid: false, error: 'No image file provided.' };
  }

  // Type check
  if (!ALLOWED_IMAGE_TYPES.includes(file.type.toLowerCase())) {
    return {
      valid: false,
      error: `Unsupported image format (${file.type || 'unknown'}). Only JPG, JPEG, PNG, and WEBP formats are accepted.`
    };
  }

  // Size check
  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    const sizeInMB = (file.size / (1024 * 1024)).toFixed(2);
    return {
      valid: false,
      error: `File size exceeds the 3 MB limit (Uploaded: ${sizeInMB} MB). Please choose a smaller image.`
    };
  }

  return { valid: true };
}

/**
 * Resizes and compresses an image file using browser Canvas
 * @param {File} file
 * @param {number} maxDimension - Max width or height in px (default 1000)
 * @param {number} quality - Compression quality between 0.1 and 1.0 (default 0.85)
 * @returns {Promise<{ blob: Blob, previewUrl: string, originalSize: number, compressedSize: number }>}
 */
export async function optimizeCandidateImage(file, maxDimension = 1000, quality = 0.85) {
  const validation = validateCandidateImage(file);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => reject(new Error('Failed to read image file.'));

    reader.onload = (event) => {
      const img = new Image();
      img.onerror = () => reject(new Error('Failed to process image elements.'));

      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Calculate aspect-ratio preserved dimensions
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return reject(new Error('Canvas 2D context unavailable in browser.'));
        }

        // Draw image smoothed
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        // Determine output MIME format (prefer webp, fallback to jpeg)
        const outputMime = 'image/webp';

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              return reject(new Error('Failed to generate optimized image blob.'));
            }

            const previewUrl = URL.createObjectURL(blob);
            resolve({
              blob,
              previewUrl,
              originalSize: file.size,
              compressedSize: blob.size,
              dimensions: { width, height }
            });
          },
          outputMime,
          quality
        );
      };

      img.src = event.target.result;
    };

    reader.readAsDataURL(file);
  });
}
