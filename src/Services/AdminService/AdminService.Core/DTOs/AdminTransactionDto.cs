namespace AdminService.Core.DTOs;

public class AdminTransactionDto
{
    public Guid Id { get; set; }
    public Guid SenderUserId { get; set; }
    public Guid ReceiverUserId { get; set; }
    public decimal Amount { get; set; }
    public string Currency { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public bool IsFlagged { get; set; }
}

public class FraudFlagDto
{
    public string Reason { get; set; } = string.Empty;
}

public class FraudFlagResponseDto
{
    public Guid Id { get; set; }
    public Guid TransactionId { get; set; }
    public string Reason { get; set; } = string.Empty;
    public bool IsResolved { get; set; }
    public DateTime CreatedAt { get; set; }
}