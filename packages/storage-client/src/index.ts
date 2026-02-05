export interface UploadOptions {
  onProgress?: (percent: number) => void;
  signal?: AbortSignal;
}

export interface UploadResult {
  url: string;
  key: string;
}

export class UploadError extends Error {
  readonly statusCode?: number;
  readonly originalError?: unknown;

  constructor(
    message: string,
    statusCode?: number,
    originalError?: unknown
  ) {
    super(message);
    this.name = 'UploadError';
    this.statusCode = statusCode;
    this.originalError = originalError;
  }
}

export async function uploadFile(
  file: File,
  presignedUrl: string,
  options: UploadOptions = {}
): Promise<UploadResult> {
  const { onProgress, signal } = options;

  try {
    const xhr = new XMLHttpRequest();

    const uploadPromise = new Promise<string>((resolve, reject) => {
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable && onProgress) {
          const percent = Math.round((event.loaded / event.total) * 100);
          onProgress(percent);
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          const url = presignedUrl.split('?')[0];
          resolve(url);
        } else {
          reject(new UploadError(`Upload failed with status ${xhr.status}`, xhr.status));
        }
      });

      xhr.addEventListener('error', () => {
        reject(new UploadError('Network error during upload'));
      });

      xhr.addEventListener('abort', () => {
        reject(new UploadError('Upload aborted'));
      });

      xhr.open('PUT', presignedUrl);
      xhr.setRequestHeader('Content-Type', file.type);
      xhr.send(file);
    });

    if (signal) {
      signal.addEventListener('abort', () => {
        xhr.abort();
      });
    }

    const url = await uploadPromise;

    const urlParts = new URL(presignedUrl);
    const key = urlParts.pathname.substring(1);

    return { url, key };
  } catch (error) {
    if (error instanceof UploadError) {
      throw error;
    }
    throw new UploadError('Unexpected error during upload', undefined, error);
  }
}

export async function uploadFileSimple(file: File, presignedUrl: string): Promise<string> {
  try {
    const response = await fetch(presignedUrl, {
      method: 'PUT',
      body: file,
      headers: {
        'Content-Type': file.type,
      },
    });

    if (!response.ok) {
      throw new UploadError(`Upload failed with status ${response.status}`, response.status);
    }

    return presignedUrl.split('?')[0];
  } catch (error) {
    if (error instanceof UploadError) {
      throw error;
    }
    throw new UploadError('Unexpected error during upload', undefined, error);
  }
}
