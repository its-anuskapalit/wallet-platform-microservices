using Shared.Common;
using WalletService.Core.Enums;

namespace WalletService.Core.Entities;

public class Wallet : BaseEntity
{
    public Guid UserId { get; set; }
    public string Email { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public decimal Balance { get; set; } = 0;
    public string Currency { get; set; } = "INR";
    public WalletStatus Status { get; set; } = WalletStatus.Active;
    public string? FreezeReason { get; set; }
}