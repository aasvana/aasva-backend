import { PackagesService } from './packages.service';

describe('PackagesService', () => {
  const repository = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
  };
  const tenantContext = { require: jest.fn(() => 'tenant-1') };
  const imageKitService = { upload: jest.fn() };
  const service = new PackagesService(
    repository as never,
    tenantContext as never,
    imageKitService as never,
  );

  beforeEach(() => jest.clearAllMocks());

  describe('search', () => {
    it('is tenant-scoped and returns ordered templates', async () => {
      const rows = [{ id: '1', days: [] }];
      repository.find.mockResolvedValue(rows);

      await expect(service.search()).resolves.toEqual(rows);
      expect(repository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: 'tenant-1' },
          take: 50,
        }),
      );
    });

    it('normalizes name search terms', async () => {
      repository.find.mockResolvedValue([]);
      await service.search('  Andaman ');
      const findMock = repository.find as jest.Mock<
        Promise<unknown[]>,
        [{ where: Record<string, unknown> }]
      >;
      const firstArg = findMock.mock.calls[0][0];
      expect(firstArg.where.normalizedName).toBeDefined();
      expect(firstArg.where.normalizedName).not.toBe(null);
    });
  });

  describe('create', () => {
    const dto = {
      name: '  Andaman Family  ',
      days: [
        { dayOrder: 1, subject: 'Arrival', description: 'Check-in' },
        { dayOrder: 2, subject: 'Sightseeing', description: 'Beaches' },
      ],
      inclusions: [{ title: 'AC Room' }],
      exclusions: [{ title: 'Airfare' }],
    };

    it('generates a tenant-unique slug from the name and defaults pricing/status', async () => {
      repository.findOne.mockResolvedValue(null);
      repository.create.mockImplementation((value: object) => value);
      repository.save.mockImplementation((value: object) =>
        Promise.resolve({ id: '1', ...value }),
      );

      const saved = await service.create(dto);

      expect(saved).toEqual(
        expect.objectContaining({
          name: 'Andaman Family',
          normalizedName: 'andaman family',
          slug: 'andaman-family',
          tenantId: 'tenant-1',
          durationDays: 2,
          durationNights: 0,
          basePrice: 0,
          pricingType: 'PER_PERSON',
          status: 'draft',
          isPublic: false,
          isFeatured: false,
          inclusions: [{ title: 'AC Room', sortOrder: 0 }],
          exclusions: [{ title: 'Airfare', sortOrder: 0 }],
        }),
      );
      expect(saved.days).toHaveLength(2);
    });

    it('appends a numeric suffix when the slug is already taken in the tenant', async () => {
      repository.findOne
        .mockResolvedValueOnce({ id: 'other', slug: 'andaman-family' })
        .mockResolvedValue(null);
      repository.create.mockImplementation((value: object) => value);
      repository.save.mockImplementation((value: object) =>
        Promise.resolve({ id: '2', ...value }),
      );

      const saved = await service.create(dto);
      expect(saved.slug).toBe('andaman-family-2');
    });

    it('uploads data-URL images through ImageKit into the packages folder', async () => {
      repository.findOne.mockResolvedValue(null);
      imageKitService.upload.mockResolvedValue({
        url: 'https://ik/1.jpg',
        fileId: 'f1',
      });
      repository.create.mockImplementation((value: object) => value);
      repository.save.mockImplementation((value: object) =>
        Promise.resolve({ id: '3', ...value }),
      );

      const saved = await service.create({
        ...dto,
        images: [{ imageUrl: 'data:image/png;base64,AAAA' }],
      });

      expect(imageKitService.upload).toHaveBeenCalledWith(
        'data:image/png;base64,AAAA',
        'package-image',
        '/packages',
      );
      expect(saved.images).toEqual([
        expect.objectContaining({ imageUrl: 'https://ik/1.jpg', sortOrder: 0 }),
      ]);
    });

    it('keeps plain URLs as-is without calling ImageKit', async () => {
      repository.findOne.mockResolvedValue(null);
      repository.create.mockImplementation((value: object) => value);
      repository.save.mockImplementation((value: object) =>
        Promise.resolve({ id: '4', ...value }),
      );

      const saved = await service.create({
        ...dto,
        images: [{ imageUrl: 'https://cdn/cover.jpg', isCover: true }],
      });

      expect(imageKitService.upload).not.toHaveBeenCalled();
      expect(saved.images).toEqual([
        expect.objectContaining({
          imageUrl: 'https://cdn/cover.jpg',
          isCover: true,
        }),
      ]);
    });
  });

  describe('findOne', () => {
    it('throws NotFoundException for a missing package', async () => {
      repository.findOne.mockResolvedValue(null);
      await expect(service.findOne('missing')).rejects.toThrow(
        'Package not found',
      );
      expect(repository.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'missing', tenantId: 'tenant-1' },
        }),
      );
    });

    it('sorts child collections by their order fields', async () => {
      const pkg = {
        id: '1',
        days: [{ dayOrder: 2 }, { dayOrder: 1 }],
        images: [{ sortOrder: 1 }, { sortOrder: 0 }],
        inclusions: [{ sortOrder: 1 }],
        exclusions: [{ sortOrder: 0 }, { sortOrder: 2 }],
      };
      repository.findOne.mockResolvedValue(pkg);

      const result = await service.findOne('1');
      expect(result.days.map((d: { dayOrder: number }) => d.dayOrder)).toEqual([
        1, 2,
      ]);
      expect(
        result.images.map((i: { sortOrder: number }) => i.sortOrder),
      ).toEqual([0, 1]);
    });
  });

  describe('findBySlug', () => {
    it('scopes by tenant and slug', async () => {
      repository.findOne.mockResolvedValue(null);
      await expect(service.findBySlug('beach')).rejects.toThrow(
        'Package not found',
      );
      expect(repository.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { slug: 'beach', tenantId: 'tenant-1' },
        }),
      );
    });
  });

  describe('findPublishedBySlug', () => {
    it('only resolves public+active packages regardless of tenant', async () => {
      repository.findOne.mockResolvedValue(null);
      await expect(service.findPublishedBySlug('beach')).rejects.toThrow(
        'Package not found',
      );
      expect(repository.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { slug: 'beach', isPublic: true, status: 'active' },
        }),
      );
    });
  });

  describe('update', () => {
    it('re-slugs when the name changes and no explicit slug is given', async () => {
      const existing = {
        id: '1',
        name: 'Old Name',
        normalizedName: 'old name',
        slug: 'old-name',
        days: [{ id: 'd1', dayOrder: 1 }],
        images: [],
        inclusions: [],
        exclusions: [],
      };
      repository.findOne
        .mockResolvedValueOnce(existing)
        .mockResolvedValueOnce(null);
      repository.save.mockImplementation((value: object) =>
        Promise.resolve({ ...existing, ...value }),
      );

      const updated = await service.update('1', { name: 'New Name' });

      expect(updated.name).toBe('New Name');
      expect(updated.normalizedName).toBe('new name');
      expect(updated.slug).toBe('new-name');
    });

    it('does not overwrite the slug when the name stays the same', async () => {
      const existing = {
        id: '1',
        name: 'Same',
        normalizedName: 'same',
        slug: 'same',
        days: [],
        images: [],
        inclusions: [],
        exclusions: [],
      };
      repository.findOne.mockResolvedValue(existing);
      repository.save.mockImplementation((value: object) =>
        Promise.resolve({ ...existing, ...value }),
      );

      const updated = await service.update('1', { status: 'active' });

      expect(updated.slug).toBe('same');
      expect(updated.status).toBe('active');
      expect(repository.findOne.mock.calls).toHaveLength(1); // update does pre-fetch only
    });
  });

  describe('remove', () => {
    it('deletes within the tenant scope', async () => {
      repository.delete.mockResolvedValue({ affected: 1 });
      await service.remove('1');
      expect(repository.delete).toHaveBeenCalledWith({
        id: '1',
        tenantId: 'tenant-1',
      });
    });
  });
});
