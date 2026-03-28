using AuthService.Core.Entities;
using Microsoft.EntityFrameworkCore;

namespace AuthService.Infrastructure.Data;

public class AuthDbContext : DbContext
{
    public AuthDbContext(DbContextOptions<AuthDbContext> options) : base(options) { }

    public DbSet<User> Users => Set<User>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();

    protected override void OnModelCreating(ModelBuilder mb)
    {
        mb.Entity<User>(e =>
        {
            e.HasKey(u => u.Id);

            e.Property(u => u.Email)
                .IsRequired()
                .HasMaxLength(256);

            e.HasIndex(u => u.Email)
                .IsUnique();

            e.Property(u => u.PasswordHash)
                .IsRequired();

            e.Property(u => u.FullName)
                .IsRequired()
                .HasMaxLength(200);

            e.Property(u => u.Phone)
                .HasMaxLength(20);

            e.Property(u => u.Role)
                .HasConversion<string>()
                .HasMaxLength(20);

            e.Property(u => u.CreatedAt)
                .IsRequired();

            e.HasMany(u => u.RefreshTokens)
                .WithOne(rt => rt.User)
                .HasForeignKey(rt => rt.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        mb.Entity<RefreshToken>(e =>
        {
            e.HasKey(rt => rt.Id);

            e.Property(rt => rt.Token)
                .IsRequired()
                .HasMaxLength(512);

            e.HasIndex(rt => rt.Token)
                .IsUnique();

            e.Property(rt => rt.ExpiresAt)
                .IsRequired();
        });
    }
}