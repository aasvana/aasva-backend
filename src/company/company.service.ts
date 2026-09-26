import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CompanySetting } from './entities/company-setting.entity';
import { UpdateCompanySettingsDto } from './dto/update-company-settings.dto';
import { OnboardCompanyDto } from './dto/onboard-company.dto';
import { ImageKitService } from '../imagekit/imagekit.service';
import { AppConfigService } from '../config/app-config.service';
import { TenantContext } from '../common/tenant/tenant-context.service';
import { TenantsService } from '../tenants/tenants.service';

interface GeminiResponse {
  candidates?: {
    finishReason?: string;
    content?: { parts?: { text?: string }[] };
  }[];
  promptFeedback?: { blockReason?: string };
  usageMetadata?: {
    candidatesTokenCount?: number;
    thoughtsTokenCount?: number;
  };
}

type GeminiAttempt =
  | {
      ok: true;
      modelUsed: string;
      attempts: number;
      text: string;
      finishReason: string;
      blockReason?: string;
      thoughtsTokens?: number;
      outputTokens?: number;
    }
  | {
      ok: false;
      modelUsed: string;
      attempts: number;
      message: string;
      reason: string;
    };

type GeminiRaceResult = GeminiAttempt;

const COMPANY_DEFAULTS: Partial<CompanySetting> = {
  name: 'Aasvana',
  shortName: 'Xm',
  email: 'admin@aasvana.com',
  phone: '+91 90000 00000',
  address: 'Aasvana HQ',
  website: 'https://www.aasvana.com',
  tagline:
    'Aasvana is a powerful and flexible web application template designed for building modern, responsive, and user-friendly applications.',
  logo: '/imgs/brand/Aasvana_Logo.png',
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

  private static readonly MODEL_STAGGER_MS = 700;

  constructor(
    @InjectRepository(CompanySetting)
    private readonly companyRepository: Repository<CompanySetting>,
    private readonly imageKitService: ImageKitService,
    private readonly config: AppConfigService,
    private readonly tenantContext: TenantContext,
    private readonly tenantsService: TenantsService,
  ) {}

  async getOrCreate(): Promise<CompanySetting> {
    const tenantId = this.tenantContext.require();
    const existing = await this.companyRepository.findOne({
      where: { tenantId },
      order: { createdAt: 'ASC' },
    });
    if (existing) {
      return existing;
    }
    const tenant = await this.tenantsService.findById(tenantId);
    const created = this.companyRepository.create({
      ...COMPANY_DEFAULTS,
      name: tenant?.name ?? COMPANY_DEFAULTS.name,
      tenantId,
    });
    return this.companyRepository.save(created);
  }

  async onboard(dto: OnboardCompanyDto): Promise<CompanySetting> {
    const tenantId = this.tenantContext.require();
    const name = dto.name.trim();
    if (name) {
      await this.tenantsService.rename(tenantId, name);
    }
    return this.update(dto);
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

  async enhanceTagline(tagline?: string): Promise<{
    enhanced: string;
    options: string[];
  }> {
    const company = await this.getOrCreate();

    const apiKey = this.config.geminiApiKey;
    if (!apiKey) {
      throw new ServiceUnavailableException(
        'GEMINI_API_KEY is not configured. Add it to the backend .env and restart.',
      );
    }

    const model = this.config.geminiModel.replace(/-\d+$/, '');
    const current = tagline?.trim() ?? '';

    const system = [
      'You are a senior brand copywriter. You write one-line marketing taglines used on company websites, invoices and documents.',
      '',
      'Hard rules:',
      '- Output a numbered list and nothing else. No preamble, no commentary, no quotes around the taglines.',
      '- Each tagline is ONE line of 4 to 14 words, never longer than 140 characters.',
      '- Be specific to this company. The reader should learn something real about the business, not just that it is "professional".',
      '- Prefer a concrete detail, a clear benefit, or a distinctive promise over stacked adjectives.',
      '- Never use: leading, world-class, one-stop, end-to-end, unparalleled, cutting-edge, innovative, state-of-the-art, premier, seamless, robust, holistic, best-in-class, game-changing, next-level, elevate, transform, empower, passionate, dedicated, committed, trusted by thousands, your vision, your partner, quality, excellence, solutions, services, ultimate, ultimate destination, dream, unforgettable.',
      '- Never invent a verifiable claim: no years in business, no client counts, no awards, no statistics, no superlatives.',
      '- No emoji, no hashtags, no ALL CAPS, no em dashes, no semicolons.',
      '- Do not stuff the company name in. Use it only if it reads naturally.',
      '',
      'Examples of the required style:',
      'Travel agency "Andaman Trip Makers" -> Island-hopping trips planned by people who have actually been there.',
      'Dental clinic "Bright Smile Care" -> Dentistry that fits your schedule instead of the other way around.',
      'Accounting firm "Ledger and Co" -> Books that balance, so you can get back to the business.',
      'Electronics retailer "Verma Electronics" -> Billing at the counter in seconds, with stock updated automatically.',
      'Gym "Iron Leaf Strength" -> Stronger after one session, consistent for life.',
    ].join('\n');

    const user = [
      `Company name: ${company.name}`,
      `Website: ${company.website || '(none provided)'}`,
      `Legal form: ${company.businessType || '(none provided)'}`,
      `Existing tagline: ${current || '(none, write one from scratch)'}`,
      '',
      current
        ? 'Improve the existing tagline. Keep any product, place or service names in it, because those are deliberate. Fix awkward wording, make it sharper and more specific, and do not simply add more adjectives.'
        : 'Write a tagline from scratch. Infer the industry from the company name and website, and write for that specific audience.',
      '',
      'Give 5 clearly different options. Vary the angle: one practical benefit, one audience-focused, one about the craft or process, one short and punchy, one that hints at a differentiator.',
      'Output exactly 5 numbered lines and nothing else.',
    ].join('\n');

    const payload = {
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: 'user', parts: [{ text: user }] }],
      generationConfig: { temperature: 0.9, maxOutputTokens: 4000 },
    };

    const call = await this.callGeminiWithFallback(apiKey, model, payload);

    if (!call.ok) {
      this.logger.error(
        `enhance-tagline failed: ${call.reason} (model=${call.modelUsed}, attempts=${call.attempts})`,
      );
      throw new ServiceUnavailableException(call.message);
    }

    this.logger.log(
      `enhance-tagline ok: model=${call.modelUsed} attempts=${call.attempts} finishReason=${call.finishReason} ` +
        `thoughts=${call.thoughtsTokens ?? 0} output=${call.outputTokens ?? 0} chars=${call.text.length}`,
    );

    const options = this.rankTaglines(call.text, company.name);
    if (options.length === 0) {
      this.logger.warn(
        `enhance-tagline produced no usable lines: finishReason=${call.finishReason} ` +
          `blockReason=${call.blockReason ?? 'none'} raw=${JSON.stringify(call.text.slice(0, 300))}`,
      );
      if (call.finishReason === 'MAX_TOKENS') {
        throw new ServiceUnavailableException(
          'The AI response was cut off before it finished. Please try again.',
        );
      }
      if (call.blockReason) {
        throw new ServiceUnavailableException(
          'The AI request was blocked by content filters. Try rewording your tagline.',
        );
      }
      throw new ServiceUnavailableException(
        'AI service returned an empty response. Try again.',
      );
    }
    return { enhanced: options[0], options };
  }

  private async callGeminiWithFallback(
    apiKey: string,
    configuredModel: string,
    payload: unknown,
  ): Promise<GeminiRaceResult> {
    const models = [
      configuredModel,
      ...this.config.geminiFallbackModels.filter((m) => m !== configuredModel),
    ].filter((m) => m.trim().length > 0);

    const unique = [...new Set(models)];
    const deadline = Date.now() + 45_000;

    this.logger.log(
      `enhance-tagline racing ${unique.length} model(s) staggered by ${CompanyService.MODEL_STAGGER_MS}ms: ${unique.join(', ')}`,
    );

    const runs = unique.map((model, index) =>
      this.sleep(index * CompanyService.MODEL_STAGGER_MS).then(() =>
        this.attemptGeminiModel(apiKey, model, payload, deadline),
      ),
    );

    return this.firstSuccessful(runs, unique, deadline);
  }

  private async attemptGeminiModel(
    apiKey: string,
    model: string,
    payload: unknown,
    deadline: number,
  ): Promise<GeminiAttempt> {
    let reason = 'unknown';
    let message = 'AI service is unavailable. Try again.';
    let attempts = 0;

    for (let attempt = 1; attempt <= 2; attempt++) {
      if (Date.now() > deadline) {
        return { ok: false, message, reason, modelUsed: model, attempts };
      }
      attempts += 1;

      let response: Response;
      try {
        response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            signal: AbortSignal.timeout(30_000),
          },
        );
      } catch {
        reason = 'network error or timeout';
        message =
          'AI service is unavailable. Check your connection and try again.';
        continue;
      }

      const body = await response.text().catch(() => '');

      if (response.status === 429 || response.status === 503) {
        const detail = this.extractGoogleError(body);
        reason = `HTTP ${response.status} ${detail}`;
        message =
          'The AI service is temporarily overloaded. Please try again in a few seconds.';
        if (response.status === 429) {
          this.logger.warn(
            `enhance-tagline ${model}: quota/rate limited, not retrying this model (${detail.slice(0, 120)})`,
          );
          return { ok: false, message, reason, modelUsed: model, attempts };
        }
        if (attempt < 2) await this.sleep(600 * attempt);
        continue;
      }

      if (response.status === 404) {
        return {
          ok: false,
          message: `The AI model "${model}" is no longer available.`,
          reason: `model not found: ${model}`,
          modelUsed: model,
          attempts,
        };
      }

      if (!response.ok) {
        if (body.includes('API_KEY_INVALID') || response.status === 401) {
          return {
            ok: false,
            message: 'The Gemini API key is invalid.',
            reason: `HTTP ${response.status} API_KEY_INVALID`,
            modelUsed: model,
            attempts,
          };
        }
        return {
          ok: false,
          message: `AI service returned status ${response.status}.`,
          reason: `HTTP ${response.status} ${this.extractGoogleError(body)}`,
          modelUsed: model,
          attempts,
        };
      }

      let parsed: GeminiResponse;
      try {
        parsed = JSON.parse(body) as GeminiResponse;
      } catch {
        reason = 'unparseable 2xx body';
        message = 'AI service returned an unexpected response.';
        continue;
      }

      const cand = parsed.candidates?.[0];
      const finishReason = cand?.finishReason ?? 'UNKNOWN';
      const text = (cand?.content?.parts ?? [])
        .map((p) => p.text ?? '')
        .join('');

      if (text.trim().length > 0) {
        return {
          ok: true,
          text,
          modelUsed: model,
          attempts,
          finishReason,
          blockReason: parsed.promptFeedback?.blockReason,
          thoughtsTokens: parsed.usageMetadata?.thoughtsTokenCount,
          outputTokens: parsed.usageMetadata?.candidatesTokenCount,
        };
      }

      reason = `empty text (finishReason=${finishReason}, blockReason=${parsed.promptFeedback?.blockReason ?? 'none'})`;
      message = 'The AI service returned no text. Please try again.';
      if (attempt < 2) await this.sleep(600 * attempt);
    }

    return { ok: false, message, reason, modelUsed: model, attempts };
  }

  private async firstSuccessful(
    runs: Promise<GeminiAttempt>[],
    models: string[],
    deadline: number,
  ): Promise<GeminiRaceResult> {
    const settled: (GeminiAttempt | undefined)[] = Array.from(
      { length: runs.length },
      () => undefined,
    );
    let attempts = 0;
    let done = false;
    let bestIndex = -1;
    let best: GeminiAttempt | null = null;
    let resolveRace: (value: GeminiAttempt | null) => void = () => undefined;

    const race = new Promise<GeminiAttempt | null>((resolve) => {
      resolveRace = resolve;
    });

    const lowestPending = () => {
      for (let i = 0; i < runs.length; i++) {
        if (!settled[i]) return i;
      }
      return runs.length;
    };

    const settle = () => {
      if (done) return;
      const pending = lowestPending();
      const expired = Date.now() > deadline;
      const betterCandidateSettled = bestIndex >= 0 && pending > bestIndex;
      if (expired || betterCandidateSettled || pending >= runs.length) {
        done = true;
        resolveRace(best);
      }
    };

    for (let i = 0; i < runs.length; i++) {
      const index = i;
      void runs[index]
        .then((result) => {
          settled[index] = result;
          attempts += result.attempts;
          if (result.ok && (bestIndex === -1 || index < bestIndex)) {
            bestIndex = index;
            best = result;
          }
          settle();
        })
        .catch((err: unknown) => {
          settled[index] = {
            ok: false,
            modelUsed: models[index],
            attempts: 0,
            message: 'AI service is unavailable. Try again.',
            reason: `threw: ${err instanceof Error ? err.message : String(err)}`,
          };
          this.logger.error(
            `enhance-tagline model run threw: ${err instanceof Error ? err.message : String(err)}`,
          );
          settle();
        });
    }

    const timer = setTimeout(
      () => {
        if (done) return;
        done = true;
        resolveRace(best);
      },
      Math.max(0, deadline - Date.now()),
    );
    if (typeof timer.unref === 'function') timer.unref();

    const winner = await race;
    clearTimeout(timer);

    if (winner && winner.ok) {
      attempts = settled.reduce((sum, r) => sum + (r?.attempts ?? 0), 0);
      const failed = settled
        .filter(
          (r): r is Extract<GeminiAttempt, { ok: false }> => r?.ok === false,
        )
        .map((r) => `${r.modelUsed}: ${r.reason}`);
      this.logger.log(
        `enhance-tagline winner=${winner.modelUsed} (rank ${models.indexOf(winner.modelUsed) + 1}/${models.length}); ` +
          `not used -> ${failed.length > 0 ? failed.join(' | ') : 'n/a'}`,
      );
      return { ...winner, attempts };
    }

    const failures = settled.filter(
      (r): r is Extract<GeminiAttempt, { ok: false }> => r?.ok === false,
    );
    const summary =
      failures.map((r) => `${r.modelUsed}: ${r.reason}`).join(' | ') ||
      'no results';

    this.logger.error(
      `enhance-tagline all ${models.length} model(s) failed -> ${summary}`,
    );

    const invalidKey = failures.some((r) =>
      r.reason.includes('API_KEY_INVALID'),
    );
    const notFound =
      failures.length > 0 &&
      failures.every((r) => r.reason.startsWith('model not found'));

    if (invalidKey) {
      return {
        ok: false,
        message: 'The Gemini API key is invalid.',
        reason: summary,
        modelUsed: models[0],
        attempts,
      };
    }
    if (notFound) {
      return {
        ok: false,
        message: 'None of the configured AI models are available.',
        reason: summary,
        modelUsed: models[0],
        attempts,
      };
    }

    return {
      ok: false,
      message:
        'The AI service is temporarily overloaded. Please try again in a few seconds.',
      reason: summary,
      modelUsed: models[0],
      attempts,
    };
  }

  private extractGoogleError(body: string): string {
    try {
      const parsed = JSON.parse(body) as { error?: { message?: string } };
      return parsed.error?.message ?? body.slice(0, 200);
    } catch {
      return body.slice(0, 200);
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private rankTaglines(raw: string, companyName: string): string[] {
    const banned = [
      'leading',
      'world-class',
      'world class',
      'one-stop',
      'end-to-end',
      'unparalleled',
      'cutting-edge',
      'innovative',
      'state-of-the-art',
      'premier',
      'seamless',
      'robust',
      'holistic',
      'best-in-class',
      'game-changing',
      'next-level',
      'elevate',
      'transform',
      'empower',
      'passionate',
      'dedicated',
      'committed',
      'trusted by thousands',
      'your vision',
      'your partner',
      'quality',
      'excellence',
      'solutions',
      'ultimate',
      'dream',
      'unforgettable',
    ];

    const scored: { value: string; score: number }[] = [];
    const seen = new Set<string>();

    for (const line of raw.split(/\r?\n/)) {
      const cleaned = line
        .replace(/^\s*(?:\d+\s*[.)]|[-*•–—])\s*/, '')
        .replace(/^[*_"'`]+|[*_"'`]+$/g, '')
        .replace(/[*_`]/g, '')
        .replace(/^\S[^\n]{0,40}?\s+->\s+/, '')
        .replace(/\s+/g, ' ')
        .trim();

      if (cleaned.length < 12 || cleaned.length > 180) continue;

      const lower = cleaned.toLowerCase();
      if (seen.has(lower)) continue;
      seen.add(lower);

      if (lower === companyName.trim().toLowerCase()) continue;
      if (lower.startsWith('here are') || lower.startsWith('sure,')) continue;

      let score = 0;
      for (const term of banned) {
        if (lower.includes(term)) score -= 100;
      }
      if (cleaned.length >= 40 && cleaned.length <= 130) score += 20;
      if (cleaned.split(/\s+/).length <= 16) score += 10;
      if (/\d/.test(cleaned)) score -= 60;
      if (/[,;]/.test(cleaned)) score -= 5;
      const name = companyName.trim().toLowerCase();
      if (name.length > 2 && lower.startsWith(`${name}:`)) score -= 25;
      if (name.length > 2 && lower.startsWith(`${name} -`)) score -= 25;

      scored.push({ value: cleaned, score });
    }

    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map((entry) => entry.value);
  }
}
