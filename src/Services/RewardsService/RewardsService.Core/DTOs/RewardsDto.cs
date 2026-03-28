namespace RewardsService.Core.DTOs;

public class RewardsDto
{
    public Guid UserId { get; set; }
    public string Email { get; set; } = string.Empty;
    public int TotalPoints { get; set; }
    public int RedeemedPoints { get; set; }
    public int AvailablePoints { get; set; }
    public string Tier { get; set; } = string.Empty;
}

public class PointsTransactionDto
{
    public Guid TransactionId { get; set; }
    public int Points { get; set; }
    public string Description { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
}