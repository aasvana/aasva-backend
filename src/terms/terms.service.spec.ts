import { DEFAULT_TERMS } from './default-terms';
import { TermsService } from './terms.service';

describe('TermsService', () => {
  const repository = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  };
  const tenantContext = { require: jest.fn(() => 'tenant-1') };
  const service = new TermsService(repository as never, tenantContext as never);

  beforeEach(() => jest.clearAllMocks());

  describe('listActive', () => {
    it('returns tenant active terms in display order', async () => {
      repository.find.mockResolvedValue([{ id: 'term-1' }]);

      await expect(service.listActive()).resolves.toEqual([{ id: 'term-1' }]);
      expect(repository.find).toHaveBeenCalledWith({
        where: { tenantId: 'tenant-1', isActive: true },
        order: { sortOrder: 'ASC', createdAt: 'ASC' },
      });
    });
  });

  describe('create', () => {
    it('appends a new term after the current maximum sort order', async () => {
      repository.findOne.mockResolvedValue({ sortOrder: 2 });
      repository.create.mockImplementation((value: object) => value);
      repository.save.mockImplementation((value: object) =>
        Promise.resolve({ id: 'term-4', ...value }),
      );

      const saved = await service.create(
        { content: '  Payment is due before travel.  ' },
        'tenant-1',
        'user-1',
      );

      expect(saved).toEqual(
        expect.objectContaining({
          tenantId: 'tenant-1',
          title: null,
          content: 'Payment is due before travel.',
          sortOrder: 3,
          isActive: true,
          createdBy: 'user-1',
        }),
      );
    });
  });

  describe('update', () => {
    it('toggles a term without changing its content', async () => {
      const term = { id: 'term-1', content: 'Original', isActive: true };
      repository.findOne.mockResolvedValue(term);
      repository.save.mockImplementation((value: object) =>
        Promise.resolve(value),
      );

      const updated = await service.update(
        'term-1',
        { isActive: false },
        'tenant-1',
      );

      expect(updated.isActive).toBe(false);
      expect(updated.content).toBe('Original');
    });
  });

  describe('reorder', () => {
    it('assigns sequential positions in the supplied order', async () => {
      repository.find.mockResolvedValue([{ id: 'a' }, { id: 'b' }]);
      repository.save.mockImplementation((value: object) =>
        Promise.resolve(value),
      );

      const ordered = await service.reorder({ ids: ['b', 'a'] }, 'tenant-1');

      expect(ordered.map((term) => [term.id, term.sortOrder])).toEqual([
        ['b', 0],
        ['a', 1],
      ]);
    });
  });

  describe('seedDefaultTerms', () => {
    it('copies every default term into a new tenant', async () => {
      repository.count.mockResolvedValue(0);
      repository.create.mockImplementation((value: object) => value);
      repository.save.mockResolvedValue([]);

      await expect(service.seedDefaultTerms('tenant-1')).resolves.toBe(
        DEFAULT_TERMS.length,
      );
      expect(repository.create).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ tenantId: 'tenant-1', sortOrder: 0 }),
        ]),
      );
      const createMock = repository.create as jest.Mock<unknown[], [unknown]>;
      const createdTerms = createMock.mock.calls[0][0] as unknown[];
      expect(createdTerms).toHaveLength(DEFAULT_TERMS.length);
    });

    it('leaves tenants that already have terms unchanged', async () => {
      repository.count.mockResolvedValue(DEFAULT_TERMS.length);

      await expect(service.seedDefaultTerms('tenant-1')).resolves.toBe(
        DEFAULT_TERMS.length,
      );
      expect(repository.save).not.toHaveBeenCalled();
    });
  });
});
