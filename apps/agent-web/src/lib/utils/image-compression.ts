/**
 * Client-side image compression utility.
 * Compresses images to WebP/JPEG before storing as base64 data URLs.
 * This keeps photo sizes small enough for JSONB storage in day plans.
 */

export interface CompressedImage {
  /** Base64 data URL (e.g., data:image/webp;base64,...) */
  dataUrl: string;
  /** Original filename */
  name: string;
  /** Compressed size in bytes */
  size: number;
  /** Width after compression */
  width: number;
  /** Height after compression */
  height: number;
}

export interface CompressionOptions {
  /** Max width in pixels (default: 1200) */
  maxWidth?: number;
  /** Max height in pixels (default: 900) */
  maxHeight?: number;
  /** Quality 0-1 (default: 0.7) */
  quality?: number;
  /** Output format (default: 'image/webp', fallback 'image/jpeg') */
  format?: 'image/webp' | 'image/jpeg';
  /** Max file size in bytes after compression (default: 150KB) */
  maxSizeBytes?: number;
}

const DEFAULT_OPTIONS: Required<CompressionOptions> = {
  maxWidth: 1200,
  maxHeight: 900,
  quality: 0.7,
  format: 'image/webp',
  maxSizeBytes: 150 * 1024, // 150KB
};

/**
 * Check if the browser supports WebP encoding.
 */
function supportsWebP(): boolean {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    return canvas.toDataURL('image/webp').startsWith('data:image/webp');
  } catch {
    return false;
  }
}

/**
 * Load a File as an HTMLImageElement.
 */
function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${file.name}`));
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Calculate dimensions maintaining aspect ratio within max bounds.
 */
function calculateDimensions(
  originalWidth: number,
  originalHeight: number,
  maxWidth: number,
  maxHeight: number
): { width: number; height: number } {
  let width = originalWidth;
  let height = originalHeight;

  if (width > maxWidth) {
    height = Math.round(height * (maxWidth / width));
    width = maxWidth;
  }
  if (height > maxHeight) {
    width = Math.round(width * (maxHeight / height));
    height = maxHeight;
  }

  return { width, height };
}

/**
 * Compress a single image file to a base64 data URL.
 * Automatically reduces quality if the result exceeds maxSizeBytes.
 */
export async function compressImage(
  file: File,
  options: CompressionOptions = {}
): Promise<CompressedImage> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // Validate file type
  if (!file.type.startsWith('image/')) {
    throw new Error(`Invalid file type: ${file.type}. Only images are allowed.`);
  }

  // Load image
  const img = await loadImage(file);
  const { width, height } = calculateDimensions(
    img.naturalWidth,
    img.naturalHeight,
    opts.maxWidth,
    opts.maxHeight
  );

  // Draw to canvas
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context not available');

  // Use high-quality image smoothing
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, width, height);

  // Clean up object URL
  URL.revokeObjectURL(img.src);

  // Determine format (fallback to JPEG if WebP not supported)
  const format = opts.format === 'image/webp' && !supportsWebP()
    ? 'image/jpeg'
    : opts.format;

  // Compress with progressive quality reduction if needed
  let quality = opts.quality;
  let dataUrl = canvas.toDataURL(format, quality);
  let size = Math.round((dataUrl.length - dataUrl.indexOf(',') - 1) * 0.75);

  // Reduce quality progressively if over size limit
  while (size > opts.maxSizeBytes && quality > 0.2) {
    quality -= 0.1;
    dataUrl = canvas.toDataURL(format, quality);
    size = Math.round((dataUrl.length - dataUrl.indexOf(',') - 1) * 0.75);
  }

  return {
    dataUrl,
    name: file.name,
    size,
    width,
    height,
  };
}

/**
 * Compress multiple image files in parallel.
 */
export async function compressImages(
  files: FileList | File[],
  options: CompressionOptions = {}
): Promise<CompressedImage[]> {
  const fileArray = Array.from(files);
  
  // Limit to 6 images per batch to avoid memory issues
  if (fileArray.length > 6) {
    throw new Error('Maximum 6 images allowed at once.');
  }

  return Promise.all(fileArray.map(file => compressImage(file, options)));
}

/**
 * Estimate the base64 size of photos for a day plan.
 * Useful for showing remaining storage capacity to the agent.
 */
export function estimatePhotosSize(photos: string[]): number {
  return photos.reduce((total, dataUrl) => {
    const base64Part = dataUrl.indexOf(',') >= 0 ? dataUrl.substring(dataUrl.indexOf(',') + 1) : dataUrl;
    return total + Math.round(base64Part.length * 0.75);
  }, 0);
}

/**
 * Format bytes to human-readable string.
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
