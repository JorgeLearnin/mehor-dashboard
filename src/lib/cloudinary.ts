type CloudinaryImageOptions = {
  width?: number;
  height?: number;
  crop?: 'fill' | 'fit' | 'limit' | 'thumb';
  gravity?: string;
  quality?: string | number;
  format?: string;
  dpr?: string | number;
};

export type SignedCloudinaryUpload = {
  uploadUrl: string;
  fields: Record<string, string | number>;
};

function toPositiveInt(value: unknown) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n);
}

export function isCloudinaryImageUrl(src: string) {
  const raw = String(src || '').trim();
  if (!raw) return false;

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return false;
  }

  return (
    url.hostname.toLowerCase().endsWith('cloudinary.com') &&
    url.pathname.includes('/image/upload/')
  );
}

export function getOptimizedCloudinaryImageUrl(
  src: string,
  options: CloudinaryImageOptions = {},
) {
  const raw = String(src || '').trim();
  if (!raw || !isCloudinaryImageUrl(raw)) return raw;

  const url = new URL(raw);
  const marker = '/image/upload/';
  const markerIndex = url.pathname.indexOf(marker);
  if (markerIndex < 0) return raw;

  const prefix = url.pathname.slice(0, markerIndex + marker.length);
  const suffix = url.pathname.slice(markerIndex + marker.length);
  const segments = suffix.split('/').filter(Boolean);
  const versionIndex = segments.findIndex((segment) => /^v\d+$/.test(segment));
  const beforeVersion =
    versionIndex >= 0 ? segments.slice(0, versionIndex) : [];
  const fromVersion =
    versionIndex >= 0 ? segments.slice(versionIndex) : segments;

  const transforms = [
    `f_${options.format || 'auto'}`,
    `q_${options.quality || 'auto'}`,
    `dpr_${options.dpr || 'auto'}`,
  ];

  const width = toPositiveInt(options.width);
  if (width) transforms.push(`w_${width}`);

  const height = toPositiveInt(options.height);
  if (height) transforms.push(`h_${height}`);

  if (options.crop) transforms.push(`c_${options.crop}`);
  if (options.gravity) transforms.push(`g_${options.gravity}`);

  url.pathname = `${prefix}${[transforms.join(','), ...beforeVersion, ...fromVersion].join('/')}`;
  return url.toString();
}

export function getOptimizedAttachmentUrl(src: string) {
  return getOptimizedCloudinaryImageUrl(src, {
    width: 1400,
    height: 1400,
    crop: 'limit',
    quality: 'auto',
    format: 'auto',
    dpr: 'auto',
  });
}

export async function uploadFileToSignedCloudinaryUrl({
  file,
  upload,
}: {
  file: File;
  upload: SignedCloudinaryUpload;
}) {
  const form = new FormData();
  Object.entries(upload.fields || {}).forEach(([key, value]) => {
    form.append(key, String(value));
  });
  form.append('file', file, file.name);

  const res = await fetch(upload.uploadUrl, {
    method: 'POST',
    body: form,
  });

  const text = await res.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!res.ok) {
    const message =
      (typeof data === 'object' && data !== null
        ? ((data as { error?: { message?: string } }).error?.message ?? null)
        : null) ||
      (typeof data === 'string' && data.trim() ? data.trim() : null) ||
      `Upload failed (${res.status})`;
    throw new Error(message);
  }

  const payload = data as {
    secure_url?: string;
    url?: string;
    public_id?: string;
  };

  const url = String(payload.secure_url || payload.url || '').trim();
  const publicId = String(payload.public_id || '').trim();
  if (!url || !publicId) {
    throw new Error('Upload did not return an image URL');
  }

  return { url, publicId };
}
