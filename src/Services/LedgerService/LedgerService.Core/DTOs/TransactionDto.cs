// TransactionDto.cs
namespace LedgerService.Core.DTOs;

public class TransactionSummaryDto
{
    public decimal TotalSent { get; set; }
    public decimal TotalReceived { get; set; }
    public decimal ThisMonthSent { get; set; }
    public decimal ThisMonthReceived { get; set; }
    public int TotalTransactionCount { get; set; }
    public int ThisMonthTransactionCount { get; set; }
}

public class TransactionDto
{
    public Guid Id { get; set; }
    public Guid SenderWalletId { get; set; }
    public Guid ReceiverWalletId { get; set; }
    public decimal Amount { get; set; }
    public string Currency { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string? FailureReason { get; set; }
    public DateTime CreatedAt { get; set; }
}