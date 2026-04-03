// IUserRepository.cs
using AuthService.Core.Entities;
namespace AuthService.Core.Interfaces;

/// <summary>
/// Defines data-access operations for <see cref="User"/> and <see cref="RefreshToken"/> entities
/// in the Auth service.
/// </summary>
public interface IUserRepository
{
    /// <summary>Retrieves a user by email address, including their refresh tokens.</summary>
    Task<User?> GetByEmailAsync(string email);

    /// <summary>Retrieves a user by unique identifier, including their refresh tokens.</summary>
    Task<User?> GetByIdAsync(Guid id);

    /// <summary>Returns <c>true</c> if a user with the given email already exists.</summary>
    Task<bool> ExistsByEmailAsync(string email);

    /// <summary>Stages a new user for insertion.</summary>
    Task AddAsync(User user);

    /// <summary>Stages a new refresh token for insertion.</summary>
    Task AddRefreshTokenAsync(RefreshToken token);

    /// <summary>Retrieves a refresh token by its value, including the associated user.</summary>
    Task<RefreshToken?> GetRefreshTokenAsync(string token);

    /// <summary>Marks a refresh token as revoked and optionally records its replacement token.</summary>
    Task RevokeRefreshTokenAsync(RefreshToken token, string? replacedBy = null);

    /// <summary>Persists all pending changes to the database.</summary>
    Task SaveChangesAsync();
}