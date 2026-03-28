using NotificationService.Core.Enums;
using Shared.Common;

namespace NotificationService.Core.Entities;

public class NotificationLog : BaseEntity
{
    public Guid UserId { get; set; }
    public string Email { get; set; } = string.Empty;
    public string Subject { get; set; } = string.Empty;
    public string Body { get; set; } = string.Empty;
    public NotificationType Type { get; set; }
    public bool IsSuccess { get; set; }
    public string? ErrorMessage { get; set; }
}