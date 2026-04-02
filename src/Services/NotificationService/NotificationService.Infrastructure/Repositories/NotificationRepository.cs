using NotificationService.Core.Entities;
using NotificationService.Core.Interfaces;
using NotificationService.Infrastructure.Data;

namespace NotificationService.Infrastructure.Repositories;

/// <summary>
/// Entity Framework Core implementation of <see cref="INotificationRepository"/> for the Notification service.
/// Persists notification delivery logs for auditing and retry analysis.
/// </summary>
public class NotificationRepository : INotificationRepository
{
    private readonly NotificationDbContext _db;

    /// <summary>
    /// Initializes a new instance of <see cref="NotificationRepository"/>.
    /// </summary>
    /// <param name="db">The EF Core database context for the Notification service.</param>
    public NotificationRepository(NotificationDbContext db)
    {
        _db = db;
    }

    /// <summary>Stages a new <see cref="NotificationLog"/> entity for insertion.</summary>
    /// <param name="log">The notification log entry to persist.</param>
    public async Task AddAsync(NotificationLog log) =>
        await _db.NotificationLogs.AddAsync(log);

    /// <summary>Persists all pending changes to the database.</summary>
    public async Task SaveChangesAsync() =>
        await _db.SaveChangesAsync();
}