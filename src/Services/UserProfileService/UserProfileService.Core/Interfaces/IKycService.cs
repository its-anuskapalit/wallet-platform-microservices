using Shared.Common;
using UserProfileService.Core.DTOs;

namespace UserProfileService.Core.Interfaces;

/// <summary>
/// Defines KYC (Know Your Customer) submission and admin review operations.
/// </summary>
public interface IKycService
{
    /// <summary>Submits a KYC document for the specified user and sets status to Pending.</summary>
    Task<Result<string>> SubmitKycAsync(Guid userId, KycSubmitDto dto);

    /// <summary>Approves or rejects a pending KYC document and publishes a status-updated event.</summary>
    Task<Result<string>> ReviewKycAsync(Guid userProfileId, KycReviewDto dto, string reviewedBy);
}