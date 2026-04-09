using RewardsService.Core.DTOs;
using RewardsService.Core.Enums;
using RewardsService.Core.Interfaces;
using Shared.Common;

namespace RewardsService.Core.Services;

/// <summary>
/// Implements rewards business logic including account retrieval, points history,
/// tier calculation (Bronze/Silver/Gold), and points earned per transaction.
/// </summary>
public class RewardsDomainService : IRewardsService
{
    private readonly IRewardsRepository _rewards;

    /// <summary>
    /// Initializes a new instance of <see cref="RewardsDomainService"/>.
    /// </summary>
    /// <param name="rewards">Repository for rewards account persistence.</param>
    public RewardsDomainService(IRewardsRepository rewards)
    {
        _rewards = rewards;
    }

    /// <summary>Retrieves the rewards account summary for the specified user, auto-creating if missing.</summary>
    public async Task<Result<RewardsDto>> GetRewardsAsync(Guid userId)
    {
        var account = await EnsureAccountAsync(userId);
        return Result<RewardsDto>.Success(MapToDto(account));
    }

    /// <summary>Retrieves the points transaction history for the specified user, ordered newest-first.</summary>
    public async Task<Result<IEnumerable<PointsTransactionDto>>> GetPointsHistoryAsync(Guid userId)
    {
        var account = await EnsureAccountAsync(userId);
        var history = account.PointsTransactions
            .OrderByDescending(p => p.CreatedAt)
            .Select(p => new PointsTransactionDto
            {
                TransactionId = p.TransactionId,
                Points = p.Points,
                Description = p.Description,
                CreatedAt = p.CreatedAt
            });
        return Result<IEnumerable<PointsTransactionDto>>.Success(history);
    }

    /// <summary>
    /// Determines the rewards tier based on accumulated points.
    /// Gold ≥ 5000, Silver ≥ 1000, Bronze otherwise.
    /// </summary>
    /// <param name="totalPoints">The user's total accumulated points.</param>
    /// <returns>The <see cref="RewardsTier"/> corresponding to the points total.</returns>
    public static RewardsTier CalculateTier(int totalPoints) => totalPoints switch
    {
        >= 5000 => RewardsTier.Gold,
        >= 1000 => RewardsTier.Silver,
        _ => RewardsTier.Bronze
    };

    /// <summary>
    /// Calculates the integer points earned for a transaction amount at a rate of 1 point per 10 currency units.
    /// </summary>
    /// <param name="amount">The transaction amount in the local currency.</param>
    /// <returns>The number of points to award, floored to the nearest integer.</returns>
    public static int CalculatePoints(decimal amount) => (int)Math.Floor(amount / 10);

    /// <summary>Returns the rewards account for any userId, auto-creating if missing (used by CatalogService).</summary>
    public async Task<Result<RewardsDto>> GetRewardsByUserIdAsync(Guid userId)
    {
        var account = await EnsureAccountAsync(userId);
        return Result<RewardsDto>.Success(MapToDto(account));
    }

    /// <summary>Deducts points for a redemption. Returns failure if balance is insufficient.</summary>
    public async Task<Result> DeductPointsAsync(Guid userId, int points, string description, Guid redemptionId)
    {
        var account = await EnsureAccountAsync(userId);

        if (account.AvailablePoints < points)
            return Result.Failure($"Insufficient points. You have {account.AvailablePoints} pts but need {points} pts.");

        account.RedeemedPoints += points;
        account.Tier            = CalculateTier(account.TotalPoints);
        account.UpdatedAt       = DateTime.UtcNow;

        await _rewards.AddPointsTransactionAsync(new Entities.PointsTransaction
        {
            RewardsAccountId = account.Id,
            TransactionId    = redemptionId,
            Points           = -points,
            Description      = description
        });

        await _rewards.SaveChangesAsync();
        return Result.Success();
    }

    /// <summary>
    /// Returns the rewards account for the given user, auto-creating a zero-balance account
    /// if one does not exist (self-healing — handles cases where the signup event was missed).
    /// </summary>
    private async Task<Entities.RewardsAccount> EnsureAccountAsync(Guid userId)
    {
        var account = await _rewards.GetByUserIdAsync(userId);
        if (account is not null) return account;

        account = new Entities.RewardsAccount
        {
            UserId       = userId,
            Email        = string.Empty,
            TotalPoints  = 0,
            RedeemedPoints = 0,
            Tier         = RewardsTier.Bronze
        };
        await _rewards.AddAsync(account);
        await _rewards.SaveChangesAsync();
        return account;
    }

    /// <summary>Maps a <see cref="Entities.RewardsAccount"/> entity to a <see cref="RewardsDto"/> for API responses.</summary>
    private static RewardsDto MapToDto(Entities.RewardsAccount a) => new()
    {
        UserId = a.UserId,
        Email = a.Email,
        TotalPoints = a.TotalPoints,
        RedeemedPoints = a.RedeemedPoints,
        AvailablePoints = a.AvailablePoints,
        Tier = a.Tier.ToString()
    };
}