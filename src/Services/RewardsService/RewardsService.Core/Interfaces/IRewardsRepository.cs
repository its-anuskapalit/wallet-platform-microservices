using RewardsService.Core.Entities;

namespace RewardsService.Core.Interfaces;

public interface IRewardsRepository
{
    Task<RewardsAccount?> GetByUserIdAsync(Guid userId);
    Task<bool> ExistsByUserIdAsync(Guid userId);
    Task AddAsync(RewardsAccount account);
    Task AddPointsTransactionAsync(PointsTransaction transaction);
    Task SaveChangesAsync();
}