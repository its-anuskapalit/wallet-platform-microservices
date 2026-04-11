namespace WalletService.Core.DTOs;

public class LedgerInitiateTransferDto
{
    public Guid SenderWalletId { get; set; }
    public Guid ReceiverWalletId { get; set; }
    public Guid ReceiverUserId { get; set; }
    public decimal Amount { get; set; }
    public string Currency { get; set; } = "INR";
    public string Type { get; set; } = "Transfer";
    public string IdempotencyKey { get; set; } = string.Empty;
    public string? Memo { get; set; }
}
