namespace Shared.Contracts.Events;

public class PointsRedeemedEvent
{
    public Guid UserId { get; set; }
    public Guid RedemptionId { get; set; }
    public int Points { get; set; }
    public string ItemName { get; set; } = string.Empty;
    public DateTime RedeemedAt { get; set; }
}
