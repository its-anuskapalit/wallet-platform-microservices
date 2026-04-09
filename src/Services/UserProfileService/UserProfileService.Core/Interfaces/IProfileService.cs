using Shared.Common;
using UserProfileService.Core.DTOs;
namespace UserProfileService.Core.Interfaces;
/// <summary>
/// Defines user profile retrieval and update operations.
/// </summary>
public interface IProfileService
{
    /// <summary>Retrieves the profile of the specified user, including KYC status.</summary>
    Task<Result<ProfileDto>> GetProfileAsync(Guid userId);

    /// <summary>
    /// Returns an existing profile or creates one on-the-fly from the provided seed data.
    /// Used as a self-healing fallback when the RabbitMQ UserRegisteredEvent was missed.
    /// </summary>
    Task<Result<ProfileDto>> GetOrCreateProfileAsync(Guid userId, string email, string fullName);

    /// <summary>Updates mutable profile fields for the specified user.</summary>
    Task<Result<ProfileDto>> UpdateProfileAsync(Guid userId, UpdateProfileDto dto);

    /// <summary>Looks up a user's basic profile info by email. Used for email-based recipient resolution.</summary>
    Task<Result<ProfileDto>> LookupByEmailAsync(string email);

    /// <summary>Returns all profiles (admin only) with pagination.</summary>
    Task<Result<PagedResult<ProfileDto>>> GetAllProfilesAsync(int page, int pageSize);
}