namespace Shared.Contracts.Events;

public class WalletFrozenEvent
{
    public Guid WalletId { get; set; }
    public Guid UserId { get; set; }
    public string Email { get; set; } = string.Empty;
    public string Reason { get; set; } = string.Empty;
    public DateTime FrozenAt { get; set; }
}