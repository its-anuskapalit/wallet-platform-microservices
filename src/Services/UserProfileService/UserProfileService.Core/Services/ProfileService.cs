using Shared.Common;
using UserProfileService.Core.DTOs;
using UserProfileService.Core.Interfaces;

namespace UserProfileService.Core.Services;

/// <summary>
/// Implements user profile retrieval and update operations.
/// </summary>
public class ProfileService : IProfileService
{
    private readonly IProfileRepository _profiles;

    /// <summary>
    /// Initializes a new instance of <see cref="ProfileService"/>.
    /// </summary>
    /// <param name="profiles">Repository for user profile persistence.</param>
    public ProfileService(IProfileRepository profiles)
    {
        _profiles = profiles;
    }

    /// <summary>Retrieves the profile of the specified user including KYC status.</summary>
    /// <param name="userId">The user's unique identifier.</param>
    /// <returns>A successful result with the profile; or a failure if not found.</returns>
    public async Task<Result<ProfileDto>> GetProfileAsync(Guid userId)
    {
        var profile = await _profiles.GetByUserIdAsync(userId);
        if (profile is null)
            return Result<ProfileDto>.Failure("Profile not found.");

        return Result<ProfileDto>.Success(MapToDto(profile));
    }

    /// <summary>
    /// Returns an existing profile or creates one on-the-fly when the RabbitMQ
    /// UserRegisteredEvent was missed (e.g. broker was down during registration).
    /// </summary>
    public async Task<Result<ProfileDto>> GetOrCreateProfileAsync(Guid userId, string email, string fullName)
    {
        var profile = await _profiles.GetByUserIdAsync(userId);
        if (profile is null)
        {
            profile = new Entities.UserProfile
            {
                UserId   = userId,
                Email    = email,
                FullName = fullName,
                Phone    = string.Empty
            };
            await _profiles.AddAsync(profile);
            await _profiles.SaveChangesAsync();
        }
        return Result<ProfileDto>.Success(MapToDto(profile));
    }

    /// <summary>Updates mutable profile fields for the specified user.</summary>
    /// <param name="userId">The user's unique identifier.</param>
    /// <param name="dto">Fields to update; only non-null/non-empty values are applied.</param>
    /// <returns>A successful result with the updated profile; or a failure if not found.</returns>
    public async Task<Result<ProfileDto>> UpdateProfileAsync(Guid userId, UpdateProfileDto dto)
    {
        var profile = await _profiles.GetByUserIdAsync(userId);
        if (profile is null)
            return Result<ProfileDto>.Failure("Profile not found.");

        if (!string.IsNullOrWhiteSpace(dto.FullName))    profile.FullName    = dto.FullName;
        if (!string.IsNullOrWhiteSpace(dto.Phone))       profile.Phone       = dto.Phone;
        if (!string.IsNullOrWhiteSpace(dto.Address))     profile.Address     = dto.Address;
        if (!string.IsNullOrWhiteSpace(dto.DateOfBirth)) profile.DateOfBirth = dto.DateOfBirth;
        profile.UpdatedAt = DateTime.UtcNow;

        await _profiles.SaveChangesAsync();
        return Result<ProfileDto>.Success(MapToDto(profile));
    }

    /// <summary>Looks up a user's basic profile by email for recipient resolution (send-by-email flow).</summary>
    public async Task<Result<ProfileDto>> LookupByEmailAsync(string email)
    {
        if (string.IsNullOrWhiteSpace(email))
            return Result<ProfileDto>.Failure("Email is required.");

        var profile = await _profiles.GetByEmailAsync(email.Trim().ToLower());
        if (profile is null)
            return Result<ProfileDto>.Failure("No user found with that email address.");

        return Result<ProfileDto>.Success(MapToDto(profile));
    }

    /// <summary>Returns paginated list of all profiles for admin views.</summary>
    public async Task<Result<PagedResult<ProfileDto>>> GetAllProfilesAsync(int page, int pageSize)
    {
        var (items, total) = await _profiles.GetAllAsync(page, pageSize);
        return Result<PagedResult<ProfileDto>>.Success(new PagedResult<ProfileDto>
        {
            Items      = items.Select(MapToDto),
            TotalCount = total,
            Page       = page,
            PageSize   = pageSize
        });
    }

    /// <summary>Maps a <see cref="Entities.UserProfile"/> entity to a <see cref="ProfileDto"/> for API responses.</summary>
    private static ProfileDto MapToDto(Entities.UserProfile p) => new()
    {
        UserId = p.UserId,
        Email = p.Email,
        FullName = p.FullName,
        Phone = p.Phone,
        Address = p.Address,
        DateOfBirth = p.DateOfBirth,
        KycStatus = p.KycDocument?.Status
    };
}