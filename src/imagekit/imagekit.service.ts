import { Injectable, Logger } from '@nestjs/common';
import { AppConfigService } from '../config/app-config.service';

const IMAGEKIT_UPLOAD_URL = 'https://upload.imagekit.io/v1/files/upload';

export type ImageKitUploadResult = { url: string; fileId: string };

@Injectable()
export class ImageKitService {
  private readonly logger = new Logger(ImageKitService.name);

  constructor(private readonly config: AppConfigService) {}

  get isConfigured(): boolean {
    return Boolean(this.config.imagekitPrivateKey);
  }

  async upload(
    dataUrl: string,
    fileName = 'company-logo',
  ): Promise<ImageKitUploadResult | null> {
    if (!this.isConfigured) return null;
    const match = /^data:([^;]+);base64,(.+)$/.exec(dataUrl);
    if (!match) return null;

    const mime = match[1];
    const ext =
      mime.includes('jpeg') || mime.includes('jpg')
        ? 'jpg'
        : mime.includes('png')
          ? 'png'
          : mime.includes('webp')
            ? 'webp'
            : 'png';

    const base64 = match[2];

    const auth = `Basic ${Buffer.from(`${this.config.imagekitPrivateKey}:`).toString('base64')}`;

    const form = new FormData();
    form.append('file', base64);
    form.append('fileName', `${fileName}.${ext}`);
    form.append('folder', '/logos');
    form.append('useUniqueFileName', 'true');
    form.append('isPrivateFile', 'false');

    let response: Response;
    try {
      response = await fetch(IMAGEKIT_UPLOAD_URL, {
        method: 'POST',
        headers: { Authorization: auth },
        body: form,
        signal: AbortSignal.timeout(30_000),
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`ImageKit upload unreachable: ${msg}`);
      return null;
    }

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      this.logger.warn(
        `ImageKit upload failed (${response.status}): ${body.slice(0, 200)}`,
      );
      return null;
    }

    const result = (await response.json()) as unknown as {
      url: string;
      fileId: string;
    };
    return { url: result.url, fileId: result.fileId };
  }
}
