using RewardsService.Core.Enums;
using Shared.Common;

namespace RewardsService.Core.Entities;

public class RewardsAccount : BaseEntity
{
    public Guid UserId { get; set; }
    public string Email { get; set; } = string.Empty;
    public int TotalPoints { get; set; } = 0;
    public int RedeemedPoints { get; set; } = 0;
    public RewardsTier Tier { get; set; } = RewardsTier.Bronze;

    public int AvailablePoints => TotalPoints - RedeemedPoints;

    public ICollection<PointsTransaction> PointsTransactions { get; set; } = [];
}