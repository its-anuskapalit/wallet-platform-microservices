namespace Shared.Contracts.Events;

public class TransactionCompletedEvent
{
    public Guid TransactionId { get; set; }
    public Guid SenderWalletId { get; set; }
    public Guid ReceiverWalletId { get; set; }
    public Guid SenderUserId { get; set; }
    public Guid ReceiverUserId { get; set; }
    public decimal Amount { get; set; }
    public string Currency { get; set; } = "INR";
    public string TransactionType { get; set; } = string.Empty; // Transfer, TopUp, Payment
    public DateTime CompletedAt { get; set; }
    /// <summary>Optional human-readable context for receipts (e.g. bill split title, emails).</summary>
    public string? Memo { get; set; }
}