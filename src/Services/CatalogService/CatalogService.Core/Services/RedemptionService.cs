using CatalogService.Core.DTOs;
using CatalogService.Core.Entities;
using CatalogService.Core.Enums;
using CatalogService.Core.Interfaces;
using Shared.Common;

namespace CatalogService.Core.Services;

/// <summary>
/// Implements redemption business logic: validates stock availability, decrements stock,
/// and records the redemption transaction.
/// </summary>
public class RedemptionDomainService : IRedemptionService
{
    private readonly ICatalogRepository _catalog;
    private readonly IRedemptionRepository _redemptions;

    /// <summary>
    /// Initializes a new instance of <see cref="RedemptionDomainService"/>.
    /// </summary>
    /// <param name="catalog">Repository for catalog item access.</param>
    /// <param name="redemptions">Repository for redemption persistence.</param>
    public RedemptionDomainService(ICatalogRepository catalog, IRedemptionRepository redemptions)
    {
        _catalog     = catalog;
        _redemptions = redemptions;
    }

    /// <summary>
    /// Redeems a catalog item for the specified user by decrementing its stock
    /// and recording a completed redemption.
    /// </summary>
    /// <param name="userId">The user performing the redemption.</param>
    /// <param name="dto">Redemption request containing the catalog item identifier.</param>
    /// <returns>
    /// A successful result with the redemption record; or a failure if the item is not found,
    /// inactive, or out of stock.
    /// </returns>
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

    /// <summary>Retrieves all redemptions made by the specified user.</summary>
    /// <param name="userId">The user's unique identifier.</param>
    /// <returns>A successful result containing the user's redemption history.</returns>
    public async Task<Result<IEnumerable<RedemptionDto>>> GetMyRedemptionsAsync(Guid userId)
    {
        var redemptions = await _redemptions.GetByUserIdAsync(userId);
        return Result<IEnumerable<RedemptionDto>>.Success(
            redemptions.Select(r => MapToDto(r, r.CatalogItem.Name)));
    }

    /// <summary>Maps a <see cref="Redemption"/> entity and item name to a <see cref="RedemptionDto"/> for API responses.</summary>
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