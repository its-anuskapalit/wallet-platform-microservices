using CatalogService.Core.Entities;

namespace CatalogService.Core.Interfaces;

public interface IRedemptionRepository
{
    Task<IEnumerable<Redemption>> GetByUserIdAsync(Guid userId);
    Task AddAsync(Redemption redemption);
    Task SaveChangesAsync();
}