using CatalogService.Core.Entities;

namespace CatalogService.Core.Interfaces;

/// <summary>
/// Defines data-access operations for <see cref="Redemption"/> entities.
/// </summary>
public interface IRedemptionRepository
{
    /// <summary>Retrieves all redemptions for the specified user, including the associated catalog item, newest-first.</summary>
    Task<IEnumerable<Redemption>> GetByUserIdAsync(Guid userId);

    /// <summary>Stages a new redemption for insertion.</summary>
    Task AddAsync(Redemption redemption);

    /// <summary>Persists all pending changes to the database.</summary>
    Task SaveChangesAsync();
}