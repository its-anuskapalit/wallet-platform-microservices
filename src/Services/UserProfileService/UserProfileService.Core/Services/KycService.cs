using Shared.Common;
using Shared.Contracts;
using Shared.Contracts.Events;
using Shared.EventBus;
using UserProfileService.Core.DTOs;
using UserProfileService.Core.Entities;
using UserProfileService.Core.Enums;
using UserProfileService.Core.Interfaces;

namespace UserProfileService.Core.Services;

/// <summary>
/// Implements KYC (Know Your Customer) submission and admin review workflows.
/// Publishes a <c>KYCStatusUpdatedEvent</c> after an admin approves or rejects a document.
/// </summary>
public class KycService : IKycService
{
    private readonly IProfileRepository _profiles;
    private readonly IKycRepository _kyc;
    private readonly IEventPublisher _publisher;

    /// <summary>
    /// Initializes a new instance of <see cref="KycService"/>.
    /// </summary>
    /// <param name="profiles">Repository for user profile access.</param>
    /// <param name="kyc">Repository for KYC document persistence.</param>
    /// <param name="publisher">Event publisher for broadcasting KYC status events.</param>
    public KycService(IProfileRepository profiles, IKycRepository kyc, IEventPublisher publisher)
    {
        _profiles  = profiles;
        _kyc       = kyc;
        _publisher = publisher;
    }

    /// <summary>
    /// Submits a new KYC document for the specified user and sets its status to Pending.
    /// </summary>
    /// <param name="userId">The user's unique identifier.</param>
    /// <param name="dto">KYC document payload containing document type and number.</param>
    /// <returns>A successful message; or a failure if the profile is not found or KYC was already submitted.</returns>
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

    /// <summary>
    /// Approves or rejects a pending KYC document and publishes a <c>KYCStatusUpdatedEvent</c>
    /// to notify downstream services (e.g., the Notification service).
    /// </summary>
    /// <param name="userProfileId">The unique identifier of the user profile under review.</param>
    /// <param name="dto">Review decision and optional rejection reason.</param>
    /// <param name="reviewedBy">The email of the admin performing the review.</param>
    /// <returns>A success message; or a failure if the profile or KYC document is not found.</returns>
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