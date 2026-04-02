using CatalogService.Core.Entities;
using CatalogService.Core.Interfaces;
using CatalogService.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace CatalogService.Infrastructure.Repositories;

/// <summary>
/// Entity Framework Core implementation of <see cref="IRedemptionRepository"/> for the Catalog service.
/// </summary>
public class RedemptionRepository : IRedemptionRepository
{
    private readonly CatalogDbContext _db;

    /// <summary>
    /// Initializes a new instance of <see cref="RedemptionRepository"/>.
    /// </summary>
    /// <param name="db">The EF Core database context for the Catalog service.</param>
    public RedemptionRepository(CatalogDbContext db)
    {
        _db = db;
    }

    /// <summary>
    /// Retrieves all redemptions made by the specified user, including the associated catalog item,
    /// ordered by creation date descending.
    /// </summary>
    /// <param name="userId">The user's unique identifier.</param>
    /// <returns>An ordered list of <see cref="Redemption"/> records with catalog items.</returns>
    public async Task<IEnumerable<Redemption>> GetByUserIdAsync(Guid userId) =>
        await _db.Redemptions
            .Include(r => r.CatalogItem)
            .Where(r => r.UserId == userId)
            .OrderByDescending(r => r.CreatedAt)
            .ToListAsync();

    /// <summary>Stages a new <see cref="Redemption"/> entity for insertion.</summary>
    /// <param name="redemption">The redemption to add.</param>
    public async Task AddAsync(Redemption redemption) =>
        await _db.Redemptions.AddAsync(redemption);

    /// <summary>Persists all pending changes to the database.</summary>
    public async Task SaveChangesAsync() =>
        await _db.SaveChangesAsync();
}