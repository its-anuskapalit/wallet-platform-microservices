using LedgerService.Core.Enums;
using Shared.Common;

namespace LedgerService.Core.Entities;

public class Transaction : BaseEntity
{
    public Guid SenderWalletId { get; set; }
    public Guid ReceiverWalletId { get; set; }
    public Guid SenderUserId { get; set; }
    public Guid ReceiverUserId { get; set; }
    public decimal Amount { get; set; } // decimal — not float
    public string Currency { get; set; } = "INR";
    public TransactionType Type { get; set; } // TopUp|Transfer|Payment
    public TransactionStatus Status { get; set; } = TransactionStatus.Pending;
    public string? FailureReason { get; set; }
    public string IdempotencyKey { get; set; } = string.Empty; // UNIQUE index
    public ICollection<LedgerEntry> LedgerEntries { get; set; } = [];
}