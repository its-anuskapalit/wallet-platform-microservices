using AuthService.Core.Entities;
using AuthService.Core.Interfaces;
using AuthService.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace AuthService.Infrastructure.Repositories;

/// <summary>
/// Entity Framework Core implementation of <see cref="IUserRepository"/> for the Auth service.
/// Provides persistence operations for <see cref="User"/> and <see cref="RefreshToken"/> entities.
/// </summary>
public class UserRepository : IUserRepository
{
    private readonly AuthDbContext _db;

    /// <summary>
    /// Initializes a new instance of <see cref="UserRepository"/>.
    /// </summary>
    /// <param name="db">The EF Core database context for the Auth service.</param>
    public UserRepository(AuthDbContext db)
    {
        _db = db;
    }

    /// <summary>Retrieves a user and their refresh tokens by email address.</summary>
    /// <param name="email">The user's email address.</param>
    /// <returns>The matching <see cref="User"/> including refresh tokens, or <c>null</c> if not found.</returns>
    public async Task<User?> GetByEmailAsync(string email) =>
        await _db.Users
            .Include(u => u.RefreshTokens)
            .FirstOrDefaultAsync(u => u.Email == email);

    /// <summary>Retrieves a user and their refresh tokens by unique identifier.</summary>
    /// <param name="id">The user's unique identifier.</param>
    /// <returns>The matching <see cref="User"/> including refresh tokens, or <c>null</c> if not found.</returns>
    public async Task<User?> GetByIdAsync(Guid id) =>
        await _db.Users
            .Include(u => u.RefreshTokens)
            .FirstOrDefaultAsync(u => u.Id == id);

    /// <summary>Checks whether a user with the given email address already exists.</summary>
    /// <param name="email">The email address to check.</param>
    /// <returns><c>true</c> if a user with that email exists; otherwise <c>false</c>.</returns>
    public async Task<bool> ExistsByEmailAsync(string email) =>
        await _db.Users.AnyAsync(u => u.Email == email);

    /// <summary>Stages a new <see cref="User"/> entity for insertion.</summary>
    /// <param name="user">The user to add.</param>
    public async Task AddAsync(User user) =>
        await _db.Users.AddAsync(user);

    /// <summary>Stages a new <see cref="RefreshToken"/> entity for insertion.</summary>
    /// <param name="token">The refresh token to add.</param>
    public async Task AddRefreshTokenAsync(RefreshToken token) =>
        await _db.RefreshTokens.AddAsync(token);

    /// <summary>Retrieves a refresh token by its value, including the associated user.</summary>
    /// <param name="token">The refresh token string.</param>
    /// <returns>The matching <see cref="RefreshToken"/> with its user, or <c>null</c> if not found.</returns>
    public async Task<RefreshToken?> GetRefreshTokenAsync(string token) =>
        await _db.RefreshTokens
            .Include(rt => rt.User)
            .FirstOrDefaultAsync(rt => rt.Token == token);

    /// <summary>
    /// Marks a refresh token as revoked and optionally records the token that replaced it.
    /// </summary>
    /// <param name="token">The refresh token to revoke.</param>
    /// <param name="replacedBy">The token string of the replacement token, or <c>null</c> if none.</param>
    public Task RevokeRefreshTokenAsync(RefreshToken token, string? replacedBy = null)
    {
        token.IsRevoked = true;
        token.ReplacedByToken = replacedBy;
        token.UpdatedAt = DateTime.UtcNow;
        return Task.CompletedTask;
    }

    /// <summary>Persists all pending changes to the database.</summary>
    public async Task SaveChangesAsync() =>
        await _db.SaveChangesAsync();
}