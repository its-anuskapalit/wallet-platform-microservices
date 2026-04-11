using Microsoft.EntityFrameworkCore;
using WalletService.Core.Entities;

namespace WalletService.Infrastructure.Data;

public class WalletDbContext : DbContext
{
    public WalletDbContext(DbContextOptions<WalletDbContext> options) : base(options) { }

    public DbSet<Wallet>              Wallets         => Set<Wallet>();
    public DbSet<IdempotencyKey>      IdempotencyKeys => Set<IdempotencyKey>();
    public DbSet<BillSplit>           BillSplits      => Set<BillSplit>();
    public DbSet<BillSplitParticipant> BillSplitParticipants => Set<BillSplitParticipant>();

    protected override void OnModelCreating(ModelBuilder mb)
    {
        mb.Entity<BillSplit>(e =>
        {
            e.HasKey(s => s.Id);
            e.Property(s => s.Title).IsRequired().HasMaxLength(200);
            e.Property(s => s.CreatorEmail).IsRequired().HasMaxLength(256);
            e.Property(s => s.TotalAmount).HasPrecision(18, 2);
            e.Property(s => s.Status).HasConversion<string>().HasMaxLength(20);
            e.HasMany(s => s.Participants).WithOne(p => p.BillSplit)
             .HasForeignKey(p => p.BillSplitId).OnDelete(DeleteBehavior.Cascade);
        });

        mb.Entity<BillSplitParticipant>(e =>
        {
            e.HasKey(p => p.Id);
            e.Property(p => p.Email).IsRequired().HasMaxLength(256);
            e.Property(p => p.FullName).HasMaxLength(200);
            e.Property(p => p.ShareAmount).HasPrecision(18, 2);
            e.Property(p => p.Status).HasConversion<string>().HasMaxLength(20);
        });

        mb.Entity<Wallet>(e =>
        {
            e.HasKey(w => w.Id);
            e.HasIndex(w => w.UserId).IsUnique();
            e.Property(w => w.Email).IsRequired().HasMaxLength(256);
            e.Property(w => w.FullName).IsRequired().HasMaxLength(200);
            e.Property(w => w.Balance).HasPrecision(18, 2);
            e.Property(w => w.Currency).HasMaxLength(10);
            e.Property(w => w.Status).HasConversion<string>().HasMaxLength(20);
            e.Property(w => w.FreezeReason).HasMaxLength(500);
        });

        mb.Entity<IdempotencyKey>(e =>
        {
            e.HasKey(i => i.Id);
            e.HasIndex(i => i.Key).IsUnique();
            e.Property(i => i.Key).IsRequired().HasMaxLength(256);
            e.Property(i => i.Response).IsRequired();
        });
    }
}