using CatalogService.Core.Entities;
using CatalogService.Core.Interfaces;
using CatalogService.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace CatalogService.Infrastructure.Repositories;

public class CatalogRepository : ICatalogRepository
{
    private readonly CatalogDbContext _db;

    public CatalogRepository(CatalogDbContext db)
    {
        _db = db;
    }

    public async Task<IEnumerable<CatalogItem>> GetAllActiveAsync() =>
        await _db.CatalogItems.Where(c => c.IsActive).ToListAsync();

    public async Task<CatalogItem?> GetByIdAsync(Guid id) =>
        await _db.CatalogItems.FirstOrDefaultAsync(c => c.Id == id);

    public async Task AddAsync(CatalogItem item) =>
        await _db.CatalogItems.AddAsync(item);

    public async Task SaveChangesAsync() =>
        await _db.SaveChangesAsync();
}