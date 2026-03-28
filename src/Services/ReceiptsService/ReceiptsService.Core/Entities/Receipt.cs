using Shared.Common;

namespace ReceiptsService.Core.Entities;

public class Receipt : BaseEntity
{
    public Guid TransactionId { get; set; }
    public Guid SenderUserId { get; set; }
    public Guid ReceiverUserId { get; set; }
    public Guid SenderWalletId { get; set; }
    public Guid ReceiverWalletId { get; set; }
    public decimal Amount { get; set; }
    public string Currency { get; set; } = "INR";
    public string TransactionType { get; set; } = string.Empty;
    public DateTime TransactionDate { get; set; }
}