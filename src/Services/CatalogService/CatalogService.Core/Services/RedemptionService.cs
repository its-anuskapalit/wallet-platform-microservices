using CatalogService.Core.DTOs;
using CatalogService.Core.Entities;
using CatalogService.Core.Enums;
using CatalogService.Core.Interfaces;
using Shared.Common;

namespace CatalogService.Core.Services;

/// <summary>
/// Handles catalog item redemption:
///   1. Validates stock and item availability.
///   2. Checks the user has enough loyalty points (via IRewardsClient).
///   3. Deducts points from RewardsService.
///   4. Decrements stock and records the redemption with a generated voucher code.
/// </summary>
public class RedemptionDomainService : IRedemptionService
{
    private readonly ICatalogRepository    _catalog;
    private readonly IRedemptionRepository _redemptions;
    private readonly IRewardsClient        _rewardsClient;

    public RedemptionDomainService( ICatalogRepository    catalog, IRedemptionRepository redemptions, IRewardsClient        rewardsClient)
    {
        _catalog       = catalog;
        _redemptions   = redemptions;
        _rewardsClient = rewardsClient;
    }

    public async Task<Result<RedemptionDto>> RedeemAsync(Guid userId, CreateRedemptionDto dto)
    {
        // 1. Validate the catalog item
        var item = await _catalog.GetByIdAsync(dto.CatalogItemId);
        if (item is null)    return Result<RedemptionDto>.Failure("Catalog item not found.");
        if (!item.IsActive)  return Result<RedemptionDto>.Failure("This item is no longer available.");
        if (item.Stock <= 0) return Result<RedemptionDto>.Failure("This item is out of stock.");

        // 2. Check points balance
        var availablePoints = await _rewardsClient.GetAvailablePointsAsync(userId);
        if (availablePoints < item.PointsRequired)
            return Result<RedemptionDto>.Failure(
                $"You need {item.PointsRequired} pts to redeem this item, but you only have {availablePoints} pts.");

        // 3. Deduct points (via RewardsService HTTP call)
        var redemptionId = Guid.NewGuid();
        var deducted = await _rewardsClient.DeductPointsAsync(
            userId, item.PointsRequired,
            $"Redeemed: {item.Name}",
            redemptionId);

        if (!deducted)
            return Result<RedemptionDto>.Failure("Failed to deduct points. Please try again.");

        // 4. Decrement stock and record redemption with voucher code
        item.Stock--;
        item.UpdatedAt = DateTime.UtcNow;

        var voucher = GenerateVoucherCode(item.Category);

        var redemption = new Redemption
        {
            Id            = redemptionId,
            UserId        = userId,
            CatalogItemId = item.Id,
            PointsUsed    = item.PointsRequired,
            Status        = RedemptionStatus.Completed,
            VoucherCode   = voucher
        };

        await _redemptions.AddAsync(redemption);
        await _redemptions.SaveChangesAsync();

        return Result<RedemptionDto>.Success(MapToDto(redemption, item));
    }

    public async Task<Result<IEnumerable<RedemptionDto>>> GetMyRedemptionsAsync(Guid userId)
    {
        var redemptions = await _redemptions.GetByUserIdAsync(userId);
        return Result<IEnumerable<RedemptionDto>>.Success(
            redemptions.Select(r => MapToDto(r, r.CatalogItem)));
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private static string GenerateVoucherCode(string category)
    {
        var prefix = category.ToUpperInvariant() switch
        {
            "GIFTCARD" => "GC",
            "VOUCHER"  => "VC",
            "CASHBACK" => "CB",
            "FOOD"     => "FD",
            "TRAVEL"   => "TR",
            _          => "WP"
        };
        var token = Guid.NewGuid().ToString("N")[..8].ToUpper();
        return $"{prefix}-{token}";
    }

    private static RedemptionDto MapToDto(Redemption r, CatalogItem item) => new()
    {
        Id            = r.Id,
        UserId        = r.UserId,
        CatalogItemId = r.CatalogItemId,
        ItemName      = item.Name,
        Category      = item.Category,
        PointsUsed    = r.PointsUsed,
        Status        = r.Status.ToString(),
        VoucherCode   = r.VoucherCode,
        CreatedAt     = r.CreatedAt
    };
}
