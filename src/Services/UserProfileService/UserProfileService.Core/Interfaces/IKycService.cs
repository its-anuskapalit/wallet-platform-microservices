using Shared.Common;
using UserProfileService.Core.DTOs;

namespace UserProfileService.Core.Interfaces;

public interface IKycService
{
    Task<Result<string>> SubmitKycAsync(Guid userId, KycSubmitDto dto);
    Task<Result<string>> ReviewKycAsync(Guid userProfileId, KycReviewDto dto, string reviewedBy);
}