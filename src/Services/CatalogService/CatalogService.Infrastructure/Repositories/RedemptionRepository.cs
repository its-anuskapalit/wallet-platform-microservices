using CatalogService.Core.Entities;
using CatalogService.Core.Interfaces;
using CatalogService.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace CatalogService.Infrastructure.Repositories;

public class RedemptionRepository : IRedemptionRepository
{
    private readonly CatalogDbContext _db;

    public RedemptionRepository(CatalogDbContext db)
    {
        _db = db;
    }

    public async Task<IEnumerable<Redemption>> GetByUserIdAsync(Guid userId) =>
        await _db.Redemptions
            .Include(r => r.CatalogItem)
            .Where(r => r.UserId == userId)
            .OrderByDescending(r => r.CreatedAt)
            .ToListAsync();

    public async Task AddAsync(Redemption redemption) =>
        await _db.Redemptions.AddAsync(redemption);

    public async Task SaveChangesAsync() =>
        await _db.SaveChangesAsync();
}