using Microsoft.EntityFrameworkCore;
using ReceiptsService.Core.Entities;

namespace ReceiptsService.Infrastructure.Data;

public class ReceiptsDbContext : DbContext
{
    public ReceiptsDbContext(DbContextOptions<ReceiptsDbContext> options) : base(options) { }

    public DbSet<Receipt> Receipts => Set<Receipt>();

    protected override void OnModelCreating(ModelBuilder mb)
    {
        mb.Entity<Receipt>(e =>
        {
            e.HasKey(r => r.Id);
            e.HasIndex(r => r.TransactionId).IsUnique();
            e.Property(r => r.Amount).HasPrecision(18, 2);
            e.Property(r => r.Currency).HasMaxLength(10);
            e.Property(r => r.TransactionType).HasMaxLength(50);
            e.Property(r => r.Memo).HasMaxLength(1500);
        });
    }
}