import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CompanySetting } from './entities/company-setting.entity';
import { UpdateCompanySettingsDto } from './dto/update-company-settings.dto';
import { ImageKitService } from '../imagekit/imagekit.service';
import { AppConfigService } from '../config/app-config.service';

const COMPANY_DEFAULTS: Partial<CompanySetting> = {
  name: 'Island Beach Vacation',
  shortName: 'Xm',
  email: 'admin@islandbeachvacation.com',
  phone: '+1 (808) 555-1234',
  address: '123 Island Beach Rd, Maui, HI 96753',
  website: 'https://www.islandbeachvacation.com',
  tagline:
    'Island Beach Vacation is a powerful and flexible web application template designed for building modern, responsive, and user-friendly applications.',
  logo: '/images/logo-light.svg',
  currency: 'USD',
  gstin: '',
  pan: '',
  tan: '',
  cin: '',
  defaultTaxRate: 0,
  businessType: 'Private Limited',
  incorporationDate: '',
  authorizedSignatory: 'Aquib Shahbaz',
};

const isDataUrl = (value: string) => /^data:image\//i.test(value);

@Injectable()
export class CompanyService {
  private readonly logger = new Logger(CompanyService.name);

  constructor(
    @InjectRepository(CompanySetting)
    private readonly companyRepository: Repository<CompanySetting>,
    private readonly imageKitService: ImageKitService,
    private readonly config: AppConfigService,
  ) {}

  async getOrCreate(): Promise<CompanySetting> {
    const existing = await this.companyRepository.find({
      order: { createdAt: 'ASC' },
      take: 1,
    });
    if (existing.length > 0) {
      return existing[0];
    }
    const created = this.companyRepository.create(COMPANY_DEFAULTS);
    return this.companyRepository.save(created);
  }

  async update(dto: UpdateCompanySettingsDto): Promise<CompanySetting> {
    const company = await this.getOrCreate();
    const patch: Partial<CompanySetting> = {};
    for (const [key, value] of Object.entries(dto)) {
      if (value === undefined) continue;
      if (key === 'logo' && typeof value === 'string' && isDataUrl(value)) {
        const uploaded = await this.imageKitService.upload(value);
        if (uploaded) {
          patch.logo = uploaded.url;
        } else {
          this.logger.warn(
            'Logo could not be uploaded to ImageKit; storing the data URL instead.',
          );
          patch.logo = value;
        }
      } else {
        (patch as Record<string, unknown>)[key] = value;
      }
    }
    const merged = this.companyRepository.merge(company, patch);
    return this.companyRepository.save(merged);
  }

  async enhanceTagline(tagline?: string): Promise<string> {
    const company = await this.getOrCreate();

    const apiKey = this.config.geminiApiKey;
    if (!apiKey) {
      throw new ServiceUnavailableException(
        'GEMINI_API_KEY is not configured. Add it to the backend .env and restart.',
      );
    }

    const model = this.config.geminiModel.replace(/-\d+$/, '');
    const system =
      'You write short, professional marketing taglines for company documents and websites.';
    const user = tagline?.trim()
      ? `Improve this company tagline so it is more compelling, precise, and professional. Keep it under 25 words. Output only the improved tagline, no quotes, no explanation.\n\nCurrent tagline for "${company.name}":\n"${tagline.trim()}"`
      : `Write a short, professional marketing tagline for the company "${company.name}". Keep it under 25 words. Output only the tagline, no quotes, no explanation.`;

    let response: Response;
    try {
      response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: system }] },
            contents: [{ role: 'user', parts: [{ text: user }] }],
            generationConfig: { temperature: 0.8, maxOutputTokens: 80 },
          }),
          signal: AbortSignal.timeout(30_000),
        },
      );
    } catch {
      throw new ServiceUnavailableException(
        'AI service is unavailable. Check your connection and try again.',
      );
    }

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      const msg = body.includes('API_KEY_INVALID')
        ? 'The Gemini API key is invalid.'
        : body.includes('model')
          ? 'The Gemini model is not available.'
          : `AI service returned status ${response.status}.`;
      throw new ServiceUnavailableException(msg);
    }

    const result = (await response.json()) as unknown as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    const enhanced = (result.candidates?.[0]?.content?.parts?.[0]?.text ?? '')
      .trim()
      .replace(/^["']|["']$/g, '');
    if (!enhanced) {
      throw new ServiceUnavailableException(
        'AI service returned an empty response. Try again.',
      );
    }
    return enhanced;
  }
}
