using CatalogService.Core.DTOs;
using CatalogService.Core.Entities;
using CatalogService.Core.Enums;
using CatalogService.Core.Interfaces;
using Shared.Common;

namespace CatalogService.Core.Services;

public class RedemptionDomainService : IRedemptionService
{
    private readonly ICatalogRepository _catalog;
    private readonly IRedemptionRepository _redemptions;

    public RedemptionDomainService(ICatalogRepository catalog, IRedemptionRepository redemptions)
    {
        _catalog     = catalog;
        _redemptions = redemptions;
    }

    public async Task<Result<RedemptionDto>> RedeemAsync(Guid userId, CreateRedemptionDto dto)
    {
        var item = await _catalog.GetByIdAsync(dto.CatalogItemId);
        if (item is null)
            return Result<RedemptionDto>.Failure("Catalog item not found.");

        if (!item.IsActive)
            return Result<RedemptionDto>.Failure("Item is no longer available.");

        if (item.Stock <= 0)
            return Result<RedemptionDto>.Failure("Item is out of stock.");

        item.Stock--;
        item.UpdatedAt = DateTime.UtcNow;

        var redemption = new Redemption
        {
            UserId        = userId,
            CatalogItemId = item.Id,
            PointsUsed    = item.PointsRequired,
            Status        = RedemptionStatus.Completed
        };

        await _redemptions.AddAsync(redemption);
        await _redemptions.SaveChangesAsync();

        return Result<RedemptionDto>.Success(MapToDto(redemption, item.Name));
    }

    public async Task<Result<IEnumerable<RedemptionDto>>> GetMyRedemptionsAsync(Guid userId)
    {
        var redemptions = await _redemptions.GetByUserIdAsync(userId);
        return Result<IEnumerable<RedemptionDto>>.Success(
            redemptions.Select(r => MapToDto(r, r.CatalogItem.Name)));
    }

    private static RedemptionDto MapToDto(Redemption r, string itemName) => new()
    {
        Id            = r.Id,
        UserId        = r.UserId,
        CatalogItemId = r.CatalogItemId,
        ItemName      = itemName,
        PointsUsed    = r.PointsUsed,
        Status        = r.Status.ToString(),
        CreatedAt     = r.CreatedAt
    };
}