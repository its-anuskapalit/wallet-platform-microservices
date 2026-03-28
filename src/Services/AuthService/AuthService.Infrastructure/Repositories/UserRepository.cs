using AuthService.Core.Entities;
using AuthService.Core.Interfaces;
using AuthService.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace AuthService.Infrastructure.Repositories;

public class UserRepository : IUserRepository
{
    private readonly AuthDbContext _db;

    public UserRepository(AuthDbContext db)
    {
        _db = db;
    }

    public async Task<User?> GetByEmailAsync(string email) =>
        await _db.Users
            .Include(u => u.RefreshTokens)
            .FirstOrDefaultAsync(u => u.Email == email);

    public async Task<User?> GetByIdAsync(Guid id) =>
        await _db.Users
            .Include(u => u.RefreshTokens)
            .FirstOrDefaultAsync(u => u.Id == id);

    public async Task<bool> ExistsByEmailAsync(string email) =>
        await _db.Users.AnyAsync(u => u.Email == email);

    public async Task AddAsync(User user) =>
        await _db.Users.AddAsync(user);

    public async Task AddRefreshTokenAsync(RefreshToken token) =>
        await _db.RefreshTokens.AddAsync(token);

    public async Task<RefreshToken?> GetRefreshTokenAsync(string token) =>
        await _db.RefreshTokens
            .Include(rt => rt.User)
            .FirstOrDefaultAsync(rt => rt.Token == token);

    public Task RevokeRefreshTokenAsync(RefreshToken token, string? replacedBy = null)
    {
        token.IsRevoked = true;
        token.ReplacedByToken = replacedBy;
        token.UpdatedAt = DateTime.UtcNow;
        return Task.CompletedTask;
    }

    public async Task SaveChangesAsync() =>
        await _db.SaveChangesAsync();
}