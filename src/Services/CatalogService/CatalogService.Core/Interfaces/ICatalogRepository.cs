using CatalogService.Core.Entities;

namespace CatalogService.Core.Interfaces;

public interface ICatalogRepository
{
    Task<IEnumerable<CatalogItem>> GetAllActiveAsync();
    Task<CatalogItem?> GetByIdAsync(Guid id);
    Task AddAsync(CatalogItem item);
    Task SaveChangesAsync();
}