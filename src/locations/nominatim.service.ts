import { Injectable, Logger } from '@nestjs/common';

export type NominatimResult = {
  name?: string;
  place_id?: number;
  osm_id?: number;
  lat?: string;
  lon?: string;
  display_name?: string;
  address?: Record<string, string>;
};

@Injectable()
export class NominatimService {
  private readonly logger = new Logger(NominatimService.name);
  private lastRequestAt = 0;

  async search(query: string): Promise<NominatimResult[]> {
    const wait = Math.max(0, 1000 - (Date.now() - this.lastRequestAt));
    if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
    this.lastRequestAt = Date.now();

    const url = new URL('https://nominatim.openstreetmap.org/search');
    url.searchParams.set('q', query);
    url.searchParams.set('format', 'jsonv2');
    url.searchParams.set('addressdetails', '1');
    url.searchParams.set('limit', '5');
    url.searchParams.set('countrycodes', 'in');

    try {
      const response = await fetch(url, {
        headers: {
          Accept: 'application/json',
          'User-Agent': 'Aasvana/1.0 location-search',
        },
        signal: AbortSignal.timeout(5000),
      });
      if (!response.ok) {
        this.logger.warn(`Nominatim returned HTTP ${response.status}`);
        return [];
      }
      const body: unknown = await response.json();
      return Array.isArray(body) ? (body as NominatimResult[]) : [];
    } catch (error) {
      this.logger.warn(`Nominatim request failed: ${String(error)}`);
      return [];
    }
  }
}
