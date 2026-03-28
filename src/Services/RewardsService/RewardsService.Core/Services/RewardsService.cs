using RewardsService.Core.DTOs;
using RewardsService.Core.Enums;
using RewardsService.Core.Interfaces;
using Shared.Common;

namespace RewardsService.Core.Services;

public class RewardsDomainService : IRewardsService
{
    private readonly IRewardsRepository _rewards;

    public RewardsDomainService(IRewardsRepository rewards)
    {
        _rewards = rewards;
    }

    public async Task<Result<RewardsDto>> GetRewardsAsync(Guid userId)
    {
        var account = await _rewards.GetByUserIdAsync(userId);
        if (account is null)
            return Result<RewardsDto>.Failure("Rewards account not found.");

        return Result<RewardsDto>.Success(MapToDto(account));
    }

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

    public static RewardsTier CalculateTier(int totalPoints) => totalPoints switch
    {
        >= 5000 => RewardsTier.Gold,
        >= 1000 => RewardsTier.Silver,
        _       => RewardsTier.Bronze
    };

    public static int CalculatePoints(decimal amount) =>
        (int)Math.Floor(amount / 10);

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