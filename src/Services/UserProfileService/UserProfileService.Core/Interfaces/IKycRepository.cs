using UserProfileService.Core.Entities;

namespace UserProfileService.Core.Interfaces;

/// <summary>
/// Defines data-access operations for <see cref="KycDocument"/> entities.
/// </summary>
public interface IKycRepository
{
    /// <summary>Retrieves the KYC document for the specified user profile, or <c>null</c> if not found.</summary>
    Task<KycDocument?> GetByUserProfileIdAsync(Guid userProfileId);

    /// <summary>Stages a new KYC document for insertion.</summary>
    Task AddAsync(KycDocument document);

    /// <summary>Persists all pending changes to the database.</summary>
    Task SaveChangesAsync();
}