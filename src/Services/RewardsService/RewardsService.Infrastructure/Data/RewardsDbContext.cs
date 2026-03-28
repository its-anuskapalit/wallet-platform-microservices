using Microsoft.EntityFrameworkCore;
using RewardsService.Core.Entities;

namespace RewardsService.Infrastructure.Data;

public class RewardsDbContext : DbContext
{
    public RewardsDbContext(DbContextOptions<RewardsDbContext> options) : base(options) { }

    public DbSet<RewardsAccount> RewardsAccounts => Set<RewardsAccount>();
    public DbSet<PointsTransaction> PointsTransactions => Set<PointsTransaction>();

    protected override void OnModelCreating(ModelBuilder mb)
    {
        mb.Entity<RewardsAccount>(e =>
        {
            e.HasKey(r => r.Id);
            e.HasIndex(r => r.UserId).IsUnique();
            e.Property(r => r.Email).IsRequired().HasMaxLength(256);
            e.Property(r => r.Tier).HasConversion<string>().HasMaxLength(20);
            e.Ignore(r => r.AvailablePoints);

            e.HasMany(r => r.PointsTransactions)
             .WithOne(p => p.RewardsAccount)
             .HasForeignKey(p => p.RewardsAccountId)
             .OnDelete(DeleteBehavior.Cascade);
        });

        mb.Entity<PointsTransaction>(e =>
        {
            e.HasKey(p => p.Id);
            e.Property(p => p.Description).HasMaxLength(500);
        });
    }
}