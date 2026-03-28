using Shared.Common;
using Shared.Contracts;
using Shared.Contracts.Events;
using Shared.EventBus;
using UserProfileService.Core.DTOs;
using UserProfileService.Core.Entities;
using UserProfileService.Core.Enums;
using UserProfileService.Core.Interfaces;

namespace UserProfileService.Core.Services;

public class KycService : IKycService
{
    private readonly IProfileRepository _profiles;
    private readonly IKycRepository _kyc;
    private readonly IEventPublisher _publisher;

    public KycService(IProfileRepository profiles, IKycRepository kyc, IEventPublisher publisher)
    {
        _profiles  = profiles;
        _kyc       = kyc;
        _publisher = publisher;
    }

    public async Task<Result<string>> SubmitKycAsync(Guid userId, KycSubmitDto dto)
    {
        var profile = await _profiles.GetByUserIdAsync(userId);
        if (profile is null)
            return Result<string>.Failure("Profile not found.");

        if (profile.KycDocument is not null)
            return Result<string>.Failure("KYC already submitted.");

        var doc = new KycDocument
        {
            UserProfileId  = profile.Id,
            DocumentType   = dto.DocumentType,
            DocumentNumber = dto.DocumentNumber,
            Status         = KycStatus.Pending
        };

        await _kyc.AddAsync(doc);
        await _kyc.SaveChangesAsync();

        return Result<string>.Success("KYC submitted successfully. Pending review.");
    }

    public async Task<Result<string>> ReviewKycAsync(Guid userProfileId, KycReviewDto dto, string reviewedBy)
    {
        var profile = await _profiles.GetByUserIdAsync(userProfileId);
        if (profile is null)
            return Result<string>.Failure("Profile not found.");

        if (profile.KycDocument is null)
            return Result<string>.Failure("No KYC document found.");

        profile.KycDocument.Status     = dto.Approve ? KycStatus.Approved : KycStatus.Rejected;
        profile.KycDocument.ReviewedAt = DateTime.UtcNow;
        profile.KycDocument.ReviewedBy = reviewedBy;
        profile.KycDocument.RejectionReason = dto.Approve ? null : dto.RejectionReason;
        profile.KycDocument.UpdatedAt  = DateTime.UtcNow;

        await _kyc.SaveChangesAsync();

        await _publisher.PublishAsync(
            new KYCStatusUpdatedEvent
            {
                UserId          = profile.UserId,
                Email           = profile.Email,
                FullName        = profile.FullName,
                Status          = profile.KycDocument.Status.ToString(),
                RejectionReason = profile.KycDocument.RejectionReason,
                UpdatedAt       = DateTime.UtcNow
            },
            EventQueues.UserExchange,
            routingKey: "kyc.status.updated");

        return Result<string>.Success($"KYC {(dto.Approve ? "approved" : "rejected")} successfully.");
    }
}