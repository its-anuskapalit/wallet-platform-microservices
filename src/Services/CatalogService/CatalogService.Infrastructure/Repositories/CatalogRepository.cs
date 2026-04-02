using CatalogService.Core.Entities;
using CatalogService.Core.Interfaces;
using CatalogService.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace CatalogService.Infrastructure.Repositories;

/// <summary>
/// Entity Framework Core implementation of <see cref="ICatalogRepository"/> for the Catalog service.
/// </summary>
public class CatalogRepository : ICatalogRepository
{
    private readonly CatalogDbContext _db;

    /// <summary>
    /// Initializes a new instance of <see cref="CatalogRepository"/>.
    /// </summary>
    /// <param name="db">The EF Core database context for the Catalog service.</param>
    public CatalogRepository(CatalogDbContext db)
    {
        _db = db;
    }

    /// <summary>Retrieves all active catalog items available for redemption.</summary>
    /// <returns>A list of <see cref="CatalogItem"/> entities where <c>IsActive</c> is <c>true</c>.</returns>
    public async Task<IEnumerable<CatalogItem>> GetAllActiveAsync() =>
        await _db.CatalogItems.Where(c => c.IsActive).ToListAsync();

    /// <summary>Retrieves a catalog item by its unique identifier.</summary>
    /// <param name="id">The catalog item's unique identifier.</param>
    /// <returns>The matching <see cref="CatalogItem"/>, or <c>null</c> if not found.</returns>
    public async Task<CatalogItem?> GetByIdAsync(Guid id) =>
        await _db.CatalogItems.FirstOrDefaultAsync(c => c.Id == id);

    /// <summary>Stages a new <see cref="CatalogItem"/> entity for insertion.</summary>
    /// <param name="item">The catalog item to add.</param>
    public async Task AddAsync(CatalogItem item) =>
        await _db.CatalogItems.AddAsync(item);

    /// <summary>Persists all pending changes to the database.</summary>
    public async Task SaveChangesAsync() =>
        await _db.SaveChangesAsync();
}