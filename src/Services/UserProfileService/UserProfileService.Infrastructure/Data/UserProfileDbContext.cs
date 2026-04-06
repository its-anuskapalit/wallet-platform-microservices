using Microsoft.EntityFrameworkCore;
using UserProfileService.Core.Entities;
//core  window into database
namespace UserProfileService.Infrastructure.Data;

public class UserProfileDbContext : DbContext
{
    public UserProfileDbContext(DbContextOptions<UserProfileDbContext> options) : base(options) { }
    public DbSet<UserProfile> UserProfiles => Set<UserProfile>();
    public DbSet<KycDocument> KycDocuments => Set<KycDocument>();
    //ModelBuilder: tool to build your database model from your C# classes
    protected override void OnModelCreating(ModelBuilder mb)
    {
        // UserProfiles table config
        mb.Entity<UserProfile>(e =>
        {
            e.HasKey(p => p.Id);
            e.HasIndex(p => p.UserId).IsUnique(); // one profile per user
            e.Property(p => p.Email).IsRequired().HasMaxLength(256);
            e.Property(p => p.FullName).IsRequired().HasMaxLength(200);
            e.Property(p => p.Phone).HasMaxLength(10);
            e.Property(p => p.Address).HasMaxLength(500);
            e.Property(p => p.DateOfBirth).HasMaxLength(20);
            e.HasOne(p => p.KycDocument).WithOne(k => k.UserProfile).HasForeignKey<KycDocument>(k => k.UserProfileId).OnDelete(DeleteBehavior.Cascade); // store enum as string not int
        });
        // KycDocuments table config
        mb.Entity<KycDocument>(e =>
        {
            e.HasKey(k => k.Id);
            e.Property(k => k.DocumentType).IsRequired().HasMaxLength(50);
            e.Property(k => k.DocumentNumber).IsRequired().HasMaxLength(100);
            e.Property(k => k.Status).HasConversion<string>().HasMaxLength(20);
            e.Property(k => k.RejectionReason).HasMaxLength(500);
            e.Property(k => k.ReviewedBy).HasMaxLength(200);
        });
    }
}