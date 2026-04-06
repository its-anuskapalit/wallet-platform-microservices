using LedgerService.Core.Enums;
using Shared.Common;

namespace LedgerService.Core.Entities;

public class LedgerEntry : BaseEntity
{
    public Guid TransactionId { get; set; } // FK to Transaction
    public Transaction Transaction { get; set; } = null!;
    public Guid WalletId { get; set; } // which wallet this entry affects
    public Guid UserId { get; set; }
    public EntryType EntryType { get; set; } // Debit | Credit
    public decimal Amount { get; set; } //always in possible
    public string Currency { get; set; } = "INR";
    public string Description { get; set; } = string.Empty;
    // NO UpdatedAt — entries are never modified after creation
    // NO IsDeleted — entries are never deleted
}