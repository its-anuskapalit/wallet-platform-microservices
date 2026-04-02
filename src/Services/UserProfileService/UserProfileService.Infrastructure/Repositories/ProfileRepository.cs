using Microsoft.EntityFrameworkCore;
using UserProfileService.Core.Entities;
using UserProfileService.Core.Interfaces;
using UserProfileService.Infrastructure.Data;

namespace UserProfileService.Infrastructure.Repositories;

/// <summary>
/// Entity Framework Core implementation of <see cref="IProfileRepository"/> for the UserProfile service.
/// </summary>
public class ProfileRepository : IProfileRepository
{
    private readonly UserProfileDbContext _db;

    /// <summary>
    /// Initializes a new instance of <see cref="ProfileRepository"/>.
    /// </summary>
    /// <param name="db">The EF Core database context for the UserProfile service.</param>
    public ProfileRepository(UserProfileDbContext db)
    {
        _db = db;
    }

    /// <summary>Retrieves a user profile by user identifier, including the associated KYC document.</summary>
    /// <param name="userId">The user's unique identifier.</param>
    /// <returns>The matching <see cref="UserProfile"/> with KYC document, or <c>null</c> if not found.</returns>
    public async Task<UserProfile?> GetByUserIdAsync(Guid userId) =>
        await _db.UserProfiles
            .Include(p => p.KycDocument)
            .FirstOrDefaultAsync(p => p.UserId == userId);

    /// <summary>Checks whether a profile already exists for the given user.</summary>
    /// <param name="userId">The user's unique identifier.</param>
    /// <returns><c>true</c> if a profile exists; otherwise <c>false</c>.</returns>
    public async Task<bool> ExistsByUserIdAsync(Guid userId) =>
        await _db.UserProfiles.AnyAsync(p => p.UserId == userId);

    /// <summary>Stages a new <see cref="UserProfile"/> entity for insertion.</summary>
    /// <param name="profile">The profile to add.</param>
    public async Task AddAsync(UserProfile profile) =>
        await _db.UserProfiles.AddAsync(profile);

    /// <summary>Persists all pending changes to the database.</summary>
    public async Task SaveChangesAsync() =>
        await _db.SaveChangesAsync();
}