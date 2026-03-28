using CatalogService.Core.DTOs;
using Shared.Common;

namespace CatalogService.Core.Interfaces;

public interface IRedemptionService
{
    Task<Result<RedemptionDto>> RedeemAsync(Guid userId, CreateRedemptionDto dto);
    Task<Result<IEnumerable<RedemptionDto>>> GetMyRedemptionsAsync(Guid userId);
}