using WalletService.Core.Enums;

namespace WalletService.Core.DTOs;
public class DeductDto
{
    public decimal Amount { get; set; }
    public string IdempotencyKey { get; set; } = string.Empty;
}