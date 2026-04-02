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

    /// <summary>Retrieves the rewards account summary for the specified user.</summary>
    /// <param name="userId">The user's unique identifier.</param>
    /// <returns>A successful result with account summary; or a failure if no rewards account exists.</returns>
    public async Task<Result<RewardsDto>> GetRewardsAsync(Guid userId)
    {
        var account = await _rewards.GetByUserIdAsync(userId);
        if (account is null)
            return Result<RewardsDto>.Failure("Rewards account not found.");

        return Result<RewardsDto>.Success(MapToDto(account));
    }

    /// <summary>Retrieves the points transaction history for the specified user, ordered newest-first.</summary>
    /// <param name="userId">The user's unique identifier.</param>
    /// <returns>A successful result with the ordered points history; or a failure if no account exists.</returns>
    public async Task<Result<IEnumerable<PointsTransactionDto>>> GetPointsHistoryAsync(Guid userId)
    {
        var account = await _rewards.GetByUserIdAsync(userId);
        if (account is null)
            return Result<IEnumerable<PointsTransactionDto>>.Failure("Rewards account not found.");

        var history = account.PointsTransactions
            .OrderByDescending(p => p.CreatedAt)
            .Select(p => new PointsTransactionDto
            {
                TransactionId = p.TransactionId,
                Points        = p.Points,
                Description   = p.Description,
                CreatedAt     = p.CreatedAt
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
        _       => RewardsTier.Bronze
    };

    /// <summary>
    /// Calculates the integer points earned for a transaction amount at a rate of 1 point per 10 currency units.
    /// </summary>
    /// <param name="amount">The transaction amount in the local currency.</param>
    /// <returns>The number of points to award, floored to the nearest integer.</returns>
    public static int CalculatePoints(decimal amount) =>
        (int)Math.Floor(amount / 10);

    /// <summary>Maps a <see cref="Entities.RewardsAccount"/> entity to a <see cref="RewardsDto"/> for API responses.</summary>
    private static RewardsDto MapToDto(Entities.RewardsAccount a) => new()
    {
        UserId          = a.UserId,
        Email           = a.Email,
        TotalPoints     = a.TotalPoints,
        RedeemedPoints  = a.RedeemedPoints,
        AvailablePoints = a.AvailablePoints,
        Tier            = a.Tier.ToString()
    };
}