namespace CatalogService.Core.Interfaces;

/// <summary>
/// HTTP client abstraction for calling the RewardsService API.
/// Used by RedemptionDomainService to check balance and deduct points.
/// </summary>
public interface IRewardsClient
{
    Task<int> GetAvailablePointsAsync(Guid userId);
    Task<bool> DeductPointsAsync(Guid userId, int points, string description, Guid redemptionId);
}
