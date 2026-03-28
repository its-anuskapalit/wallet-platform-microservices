using WalletService.Core.Enums;

namespace WalletService.Core.DTOs;
public class TopUpDto
{
    public decimal Amount { get; set; }
    public string IdempotencyKey { get; set; } = string.Empty;
}