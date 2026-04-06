using LedgerService.Core.Entities;
using Microsoft.EntityFrameworkCore;

namespace LedgerService.Infrastructure.Data;

public class LedgerDbContext : DbContext
{
    public LedgerDbContext(DbContextOptions<LedgerDbContext> options) : base(options) { }

    public DbSet<Transaction> Transactions => Set<Transaction>();
    public DbSet<LedgerEntry> LedgerEntries => Set<LedgerEntry>();

    protected override void OnModelCreating(ModelBuilder mb)
    {
        // Transactions — idempotency key must be unique
        mb.Entity<Transaction>(e =>
        {
            e.HasKey(t => t.Id);
            e.HasIndex(t => t.IdempotencyKey).IsUnique();
            e.Property(t => t.Amount).HasPrecision(18, 2);
            e.Property(t => t.Currency).HasMaxLength(10);
            e.Property(t => t.Type).HasConversion<string>().HasMaxLength(20);
            e.Property(t => t.Status).HasConversion<string>().HasMaxLength(20);
            e.Property(t => t.IdempotencyKey).IsRequired().HasMaxLength(256);
            e.Property(t => t.FailureReason).HasMaxLength(500);

            e.HasMany(t => t.LedgerEntries)
             .WithOne(l => l.Transaction)
             .HasForeignKey(l => l.TransactionId)
             .OnDelete(DeleteBehavior.Restrict);
        });
        // LedgerEntries — restrict delete to prevent orphan entries
        mb.Entity<LedgerEntry>(e =>
        {
            e.HasKey(l => l.Id);
            e.Property(l => l.Amount).HasPrecision(18, 2);
            e.Property(l => l.Currency).HasMaxLength(10);
            e.Property(l => l.EntryType).HasConversion<string>().HasMaxLength(10);
            e.Property(l => l.Description).HasMaxLength(500);
        });
    }
}