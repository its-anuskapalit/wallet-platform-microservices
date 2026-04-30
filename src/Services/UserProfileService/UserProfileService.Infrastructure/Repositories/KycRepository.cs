using Microsoft.EntityFrameworkCore;
using UserProfileService.Core.Entities;
using UserProfileService.Core.Interfaces;
using UserProfileService.Infrastructure.Data;

namespace UserProfileService.Infrastructure.Repositories;

/// <summary>
/// Entity Framework Core implementation of <see cref="IKycRepository"/> for the UserProfile service.
/// Manages persistence of <see cref="KycDocument"/> entities.
/// </summary>
public class KycRepository : IKycRepository
{
    private readonly UserProfileDbContext _db;

    /// <summary>
    /// Initializes a new instance of <see cref="KycRepository"/>.
    /// </summary>
    /// <param name="db">The EF Core database context for the UserProfile service.</param>
    public KycRepository(UserProfileDbContext db)
    {
        _db = db;
    }

    /// <summary>Retrieves the KYC document associated with the specified user profile.</summary>
    /// <param name="userProfileId">The user profile's unique identifier.</param>
    /// <returns>The matching <see cref="KycDocument"/>, or <c>null</c> if not found.</returns>
    public async Task<KycDocument?> GetByUserProfileIdAsync(Guid userProfileId) =>
        await _db.KycDocuments.FirstOrDefaultAsync(k => k.UserProfileId == userProfileId);

    /// <summary>Stages a new <see cref="KycDocument"/> entity for insertion.</summary>
    /// <param name="document">The KYC document to add.</param>
    public async Task AddAsync(KycDocument document) => await _db.KycDocuments.AddAsync(document);

    /// <summary>Persists all pending changes to the database.</summary>
    public async Task SaveChangesAsync() => await _db.SaveChangesAsync();
}