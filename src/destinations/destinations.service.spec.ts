import { DestinationsService } from './destinations.service';

describe('DestinationsService', () => {
  const repository = {
    createQueryBuilder: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };
  const tenantContext = { require: jest.fn(() => 'tenant-1') };
  const nominatim = { search: jest.fn() };
  const service = new DestinationsService(
    repository as never,
    tenantContext as never,
    nominatim as never,
  );

  beforeEach(() => jest.clearAllMocks());

  it('returns local destinations before querying Nominatim', async () => {
    const local = [{ id: '1', name: 'Park Street' }];
    repository.createQueryBuilder.mockReturnValue({
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue(local),
    });

    await expect(service.search(' Park   Street ')).resolves.toEqual(local);
    expect(nominatim.search).not.toHaveBeenCalled();
  });

  it('returns multiple normalized Nominatim suggestions without saving them', async () => {
    repository.createQueryBuilder.mockReturnValue({
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
    });
    nominatim.search.mockResolvedValue([
      {
        osm_id: 1,
        lat: '22.5',
        lon: '88.3',
        display_name: 'Park Street, Kolkata',
        address: {
          road: 'Park Street',
          city: 'Kolkata',
          state: 'West Bengal',
          country: 'India',
          country_code: 'in',
        },
      },
      {
        osm_id: 2,
        lat: '19.0',
        lon: '73.0',
        display_name: 'Park Street, Other City',
        address: {
          road: 'Park Street',
          city: 'Other City',
          state: 'Maharashtra',
          country: 'India',
          country_code: 'in',
        },
      },
    ]);

    await expect(service.search('Park Street')).resolves.toHaveLength(2);
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('allows manually creating an incomplete destination', async () => {
    repository.findOne.mockResolvedValue(null);
    repository.create.mockImplementation((value: object) => value);
    repository.save.mockImplementation((value: object) =>
      Promise.resolve({ id: '1', ...value }),
    );

    await expect(
      service.create({ name: 'ABC Island Resort Area' }),
    ).resolves.toEqual(
      expect.objectContaining({
        name: 'ABC Island Resort Area',
        city: '',
        state: '',
      }),
    );
  });
});
