using Shared.Common;

namespace RewardsService.Core.Entities;

public class PointsTransaction : BaseEntity
{
    public Guid RewardsAccountId { get; set; }
    public RewardsAccount RewardsAccount { get; set; } = null!;
    public Guid TransactionId { get; set; }
    public int Points { get; set; }
    public string Description { get; set; } = string.Empty;
}