using CatalogService.Core.Entities;

namespace CatalogService.Core.Interfaces;

/// <summary>
/// Defines data-access operations for <see cref="CatalogItem"/> entities.
/// </summary>
public interface ICatalogRepository
{
    /// <summary>Retrieves all catalog items where <c>IsActive</c> is <c>true</c>.</summary>
    Task<IEnumerable<CatalogItem>> GetAllActiveAsync();

    /// <summary>Retrieves a catalog item by its unique identifier, or <c>null</c> if not found.</summary>
    Task<CatalogItem?> GetByIdAsync(Guid id);

    /// <summary>Stages a new catalog item for insertion.</summary>
    Task AddAsync(CatalogItem item);

    /// <summary>Persists all pending changes to the database.</summary>
    Task SaveChangesAsync();
}