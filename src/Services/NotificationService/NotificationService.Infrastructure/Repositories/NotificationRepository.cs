using NotificationService.Core.Entities;
using NotificationService.Core.Interfaces;
using NotificationService.Infrastructure.Data;

namespace NotificationService.Infrastructure.Repositories;

public class NotificationRepository : INotificationRepository
{
    private readonly NotificationDbContext _db;

    public NotificationRepository(NotificationDbContext db)
    {
        _db = db;
    }

    public async Task AddAsync(NotificationLog log) =>
        await _db.NotificationLogs.AddAsync(log);

    public async Task SaveChangesAsync() =>
        await _db.SaveChangesAsync();
}