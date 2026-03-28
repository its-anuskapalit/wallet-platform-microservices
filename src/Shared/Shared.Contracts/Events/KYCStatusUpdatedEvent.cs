namespace Shared.Contracts.Events;

public class KYCStatusUpdatedEvent
{
    public Guid UserId { get; set; }
    public string Email { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty; // Pending, Approved, Rejected
    public string? RejectionReason { get; set; }
    public DateTime UpdatedAt { get; set; }
}