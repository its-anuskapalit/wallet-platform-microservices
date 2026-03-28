using RewardsService.Core.DTOs;
using Shared.Common;

namespace RewardsService.Core.Interfaces;

public interface IRewardsService
{
    Task<Result<RewardsDto>> GetRewardsAsync(Guid userId);
    Task<Result<IEnumerable<PointsTransactionDto>>> GetPointsHistoryAsync(Guid userId);
}