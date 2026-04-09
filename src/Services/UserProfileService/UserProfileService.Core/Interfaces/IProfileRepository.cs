using UserProfileService.Core.Entities;
namespace UserProfileService.Core.Interfaces;
/// <summary>
/// Defines data-access operations for <see cref="UserProfile"/> entities.
/// </summary>
public interface IProfileRepository
{
    /// <summary>Retrieves a user profile by user identifier, including the associated KYC document.</summary>
    Task<UserProfile?> GetByUserIdAsync(Guid userId);
    /// <summary>Retrieves a user profile by email address, including the associated KYC document.</summary>
    Task<UserProfile?> GetByEmailAsync(string email);
    /// <summary>Returns <c>true</c> if a profile already exists for the given user.</summary>
    Task<bool> ExistsByUserIdAsync(Guid userId);
    /// <summary>Stages a new user profile for insertion.</summary>
    Task AddAsync(UserProfile profile);
    /// <summary>Returns all user profiles with pagination, ordered by creation date descending.</summary>
    Task<(IEnumerable<UserProfile> Items, int Total)> GetAllAsync(int page, int pageSize);

    /// <summary>Persists all pending changes to the database.</summary>
    Task SaveChangesAsync();
}