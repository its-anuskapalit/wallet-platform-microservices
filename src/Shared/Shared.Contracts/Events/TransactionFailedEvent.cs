namespace Shared.Contracts.Events;

public class TransactionFailedEvent
{
    public Guid TransactionId { get; set; }
    public Guid SenderUserId { get; set; }
    public decimal Amount { get; set; }
    public string Reason { get; set; } = string.Empty;
    public DateTime FailedAt { get; set; }
}