using RewardsService.Core.DTOs;
using Shared.Common;

namespace RewardsService.Core.Interfaces;

/// <summary>
/// Defines rewards account retrieval and points history operations.
/// </summary>
public interface IRewardsService
{
    /// <summary>Retrieves the rewards account summary for the specified user.</summary>
    Task<Result<RewardsDto>> GetRewardsAsync(Guid userId);

    /// <summary>Retrieves the points transaction history for the specified user, newest-first.</summary>
    Task<Result<IEnumerable<PointsTransactionDto>>> GetPointsHistoryAsync(Guid userId);
}