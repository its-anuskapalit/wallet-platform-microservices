using NotificationService.Core.Entities;

namespace NotificationService.Core.Interfaces;

public interface INotificationRepository
{
    Task AddAsync(NotificationLog log);
    Task SaveChangesAsync();
}