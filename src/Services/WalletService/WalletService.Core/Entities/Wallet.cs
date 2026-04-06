using Shared.Common;
using WalletService.Core.Enums;
namespace WalletService.Core.Entities;
public class Wallet : BaseEntity
{
    public Guid UserId { get; set; } // unique — one wallet per user
    public string Email { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public decimal Balance { get; set; } = 0; // decimal, NOT float
    public string Currency { get; set; } = "INR";
    public WalletStatus Status { get; set; } = WalletStatus.Active;
    public string? FreezeReason { get; set; }
}