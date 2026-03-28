using Microsoft.EntityFrameworkCore;
using NotificationService.Core.Entities;

namespace NotificationService.Infrastructure.Data;

public class NotificationDbContext : DbContext
{
    public NotificationDbContext(DbContextOptions<NotificationDbContext> options) : base(options) { }

    public DbSet<NotificationLog> NotificationLogs => Set<NotificationLog>();

    protected override void OnModelCreating(ModelBuilder mb)
    {
        mb.Entity<NotificationLog>(e =>
        {
            e.HasKey(n => n.Id);
            e.Property(n => n.Email).IsRequired().HasMaxLength(256);
            e.Property(n => n.Subject).IsRequired().HasMaxLength(500);
            e.Property(n => n.Type).HasConversion<string>().HasMaxLength(50);
            e.Property(n => n.ErrorMessage).HasMaxLength(500);
        });
    }
}