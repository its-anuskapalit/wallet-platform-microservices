using WalletService.Core.Enums;

namespace WalletService.Core.DTOs;

public class WalletDto
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string Email { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public decimal Balance { get; set; }
    public string Currency { get; set; } = string.Empty;
    public WalletStatus Status { get; set; }
}

public class FreezeDto
{
    public string Reason { get; set; } = string.Empty;
}