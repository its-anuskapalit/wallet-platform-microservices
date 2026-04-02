using CatalogService.Core.DTOs;
using Shared.Common;

namespace CatalogService.Core.Interfaces;

/// <summary>
/// Defines catalog item redemption operations.
/// </summary>
public interface IRedemptionService
{
    /// <summary>Redeems a catalog item for the specified user, decrementing its stock.</summary>
    Task<Result<RedemptionDto>> RedeemAsync(Guid userId, CreateRedemptionDto dto);

    /// <summary>Retrieves the redemption history for the specified user.</summary>
    Task<Result<IEnumerable<RedemptionDto>>> GetMyRedemptionsAsync(Guid userId);
}