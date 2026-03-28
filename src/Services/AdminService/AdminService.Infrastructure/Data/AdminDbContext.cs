using AdminService.Core.Entities;
using Microsoft.EntityFrameworkCore;

namespace AdminService.Infrastructure.Data;

public class AdminDbContext : DbContext
{
    public AdminDbContext(DbContextOptions<AdminDbContext> options) : base(options) { }

    public DbSet<FraudFlag> FraudFlags => Set<FraudFlag>();

    protected override void OnModelCreating(ModelBuilder mb)
    {
        mb.Entity<FraudFlag>(e =>
        {
            e.HasKey(f => f.Id);
            e.HasIndex(f => f.TransactionId).IsUnique();
            e.Property(f => f.Reason).IsRequired().HasMaxLength(500);
            e.Property(f => f.Resolution).HasMaxLength(500);
        });
    }
}