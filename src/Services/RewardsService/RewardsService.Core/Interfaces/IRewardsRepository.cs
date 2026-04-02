using RewardsService.Core.Entities;

namespace RewardsService.Core.Interfaces;

/// <summary>
/// Defines data-access operations for <see cref="RewardsAccount"/> and <see cref="PointsTransaction"/> entities.
/// </summary>
public interface IRewardsRepository
{
    /// <summary>Retrieves a rewards account by user identifier, including points transactions.</summary>
    Task<RewardsAccount?> GetByUserIdAsync(Guid userId);

    /// <summary>Returns <c>true</c> if a rewards account already exists for the given user.</summary>
    Task<bool> ExistsByUserIdAsync(Guid userId);

    /// <summary>Stages a new rewards account for insertion.</summary>
    Task AddAsync(RewardsAccount account);

    /// <summary>Stages a new points transaction record for insertion.</summary>
    Task AddPointsTransactionAsync(PointsTransaction transaction);

    /// <summary>Persists all pending changes to the database.</summary>
    Task SaveChangesAsync();
}