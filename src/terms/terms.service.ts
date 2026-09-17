import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TenantContext } from '../common/tenant/tenant-context.service';
import { Term, TermSnapshot } from './entities/term.entity';
import { CreateTermDto } from './dto/create-term.dto';
import { UpdateTermDto } from './dto/update-term.dto';
import { ReorderTermsDto } from './dto/reorder-terms.dto';
import { DEFAULT_TERMS } from './default-terms';

@Injectable()
export class TermsService {
  constructor(
    @InjectRepository(Term)
    private readonly terms: Repository<Term>,
    private readonly tenantContext: TenantContext,
  ) {}

  list(tenantId?: string): Promise<Term[]> {
    return this.terms.find({
      where: { tenantId: this.resolveTenantId(tenantId) },
      order: { sortOrder: 'ASC', createdAt: 'ASC' },
    });
  }

  listActive(tenantId?: string): Promise<Term[]> {
    return this.terms.find({
      where: { tenantId: this.resolveTenantId(tenantId), isActive: true },
      order: { sortOrder: 'ASC', createdAt: 'ASC' },
    });
  }

  async listActiveSnapshots(tenantId?: string): Promise<TermSnapshot[]> {
    const terms = await this.listActive(tenantId);
    return terms.map((term) => ({
      id: term.id,
      title: term.title,
      content: term.content,
      sortOrder: term.sortOrder,
    }));
  }

  async findOne(id: string, tenantId?: string): Promise<Term> {
    const term = await this.terms.findOne({
      where: { id, tenantId: this.resolveTenantId(tenantId) },
    });
    if (!term) {
      throw new NotFoundException('Terms and conditions entry not found');
    }
    return term;
  }

  async create(
    dto: CreateTermDto,
    tenantId?: string,
    createdBy?: string,
  ): Promise<Term> {
    const resolvedTenantId = this.resolveTenantId(tenantId);
    const title = dto.title?.trim() ? dto.title.trim() : null;
    const content = dto.content.trim();
    let sortOrder = dto.sortOrder;
    if (sortOrder === undefined) {
      const last = await this.terms.findOne({
        where: { tenantId: resolvedTenantId },
        order: { sortOrder: 'DESC', createdAt: 'DESC' },
      });
      sortOrder = last ? last.sortOrder + 1 : 0;
    }
    const term = this.terms.create({
      tenantId: resolvedTenantId,
      title,
      content,
      sortOrder,
      isActive: dto.isActive ?? true,
      createdBy: createdBy ?? null,
    });
    return this.terms.save(term);
  }

  async update(
    id: string,
    dto: UpdateTermDto,
    tenantId?: string,
  ): Promise<Term> {
    const term = await this.findOne(id, tenantId);
    if (dto.title !== undefined) {
      term.title = dto.title.trim() ? dto.title.trim() : null;
    }
    if (dto.content !== undefined) {
      term.content = dto.content.trim();
    }
    if (dto.sortOrder !== undefined) {
      term.sortOrder = dto.sortOrder;
    }
    if (dto.isActive !== undefined) {
      term.isActive = dto.isActive;
    }
    return this.terms.save(term);
  }

  async remove(id: string, tenantId?: string): Promise<void> {
    const term = await this.findOne(id, tenantId);
    const result = await this.terms.delete({
      id: term.id,
      tenantId: this.resolveTenantId(tenantId),
    });
    if (!result.affected) {
      throw new NotFoundException('Terms and conditions entry not found');
    }
  }

  async reorder(dto: ReorderTermsDto, tenantId?: string): Promise<Term[]> {
    const resolvedTenantId = this.resolveTenantId(tenantId);
    const uniqueIds = [...new Set(dto.ids)];
    if (uniqueIds.length !== dto.ids.length) {
      throw new BadRequestException('Term order contains duplicate entries');
    }
    const terms = await this.terms.find({
      where: { tenantId: resolvedTenantId },
      order: { sortOrder: 'ASC', createdAt: 'ASC' },
    });
    if (terms.length !== uniqueIds.length) {
      throw new BadRequestException('Term order must include every term once');
    }
    const termsById = new Map(terms.map((term) => [term.id, term]));
    const ordered = dto.ids.map((id, index) => {
      const term = termsById.get(id);
      if (!term) {
        throw new BadRequestException('Term order contains an unknown term');
      }
      term.sortOrder = index;
      return term;
    });
    return this.terms.save(ordered);
  }

  async seedDefaultTerms(
    tenantId?: string,
    createdBy?: string,
  ): Promise<number> {
    const resolvedTenantId = this.resolveTenantId(tenantId);
    const existing = await this.terms.count({
      where: { tenantId: resolvedTenantId },
    });
    if (existing > 0) {
      return existing;
    }
    const terms = this.terms.create(
      DEFAULT_TERMS.map((term, index) => ({
        tenantId: resolvedTenantId,
        title: term.title,
        content: term.content,
        sortOrder: index,
        isActive: true,
        createdBy: createdBy ?? null,
      })),
    );
    await this.terms.save(terms);
    return terms.length;
  }

  private resolveTenantId(tenantId?: string): string {
    return tenantId ?? this.tenantContext.require();
  }
}
