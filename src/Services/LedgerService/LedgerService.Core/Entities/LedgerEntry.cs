using LedgerService.Core.Enums;
using Shared.Common;

namespace LedgerService.Core.Entities;

public class LedgerEntry : BaseEntity
{
    public Guid TransactionId { get; set; }
    public Transaction Transaction { get; set; } = null!;
    public Guid WalletId { get; set; }
    public Guid UserId { get; set; }
    public EntryType EntryType { get; set; }
    public decimal Amount { get; set; }
    public string Currency { get; set; } = "INR";
    public string Description { get; set; } = string.Empty;
}