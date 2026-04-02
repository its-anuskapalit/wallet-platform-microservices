using NotificationService.Core.Entities;

namespace NotificationService.Core.Interfaces;

/// <summary>
/// Defines data-access operations for <see cref="NotificationLog"/> entities.
/// </summary>
public interface INotificationRepository
{
    /// <summary>Stages a new notification log entry for insertion.</summary>
    Task AddAsync(NotificationLog log);

    /// <summary>Persists all pending changes to the database.</summary>
    Task SaveChangesAsync();
}