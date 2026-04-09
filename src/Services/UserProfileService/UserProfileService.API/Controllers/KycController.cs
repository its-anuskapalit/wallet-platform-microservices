using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using UserProfileService.Core.DTOs;
using UserProfileService.Core.Interfaces;

namespace UserProfileService.API.Controllers;

/// <summary>
/// Exposes KYC submission and admin review endpoints.
/// All endpoints require a valid JWT; review requires the Admin role.
/// </summary>
[ApiController]
[Route("api/kyc")]
[Authorize]
public class KycController : ControllerBase
{
    private readonly IKycService     _kycService;
    private readonly IProfileService _profileService;

    public KycController(IKycService kycService, IProfileService profileService)
    {
        _kycService     = kycService;
        _profileService = profileService;
    }

    private Guid   CurrentUserId   => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub")!);
    private string CurrentEmail    => User.FindFirstValue(ClaimTypes.Email) ?? User.FindFirstValue("email") ?? string.Empty;
    private string CurrentFullName => User.FindFirstValue("fullName") ?? User.FindFirstValue(ClaimTypes.Name) ?? string.Empty;
    private string CurrentUserEmail => CurrentEmail;

    /// <summary>
    /// Submits a KYC document for the currently authenticated user.
    /// Automatically creates the user profile if it was never seeded via RabbitMQ.
    /// </summary>
    [HttpPost("submit")]
    public async Task<IActionResult> Submit([FromBody] KycSubmitDto dto)
    {
        // Guarantee profile exists (self-healing for missed UserRegisteredEvent)
        await _profileService.GetOrCreateProfileAsync(CurrentUserId, CurrentEmail, CurrentFullName);

        var result = await _kycService.SubmitKycAsync(CurrentUserId, dto);
        if (!result.IsSuccess) return BadRequest(new { error = result.Error });
        return Ok(new { message = result.Data });
    }

    /// <summary>Approves or rejects a KYC document for the specified user profile. Requires the Admin role.</summary>
    /// <param name="userProfileId">The unique identifier of the user profile under review.</param>
    /// <param name="dto">Review decision and optional rejection reason.</param>
    /// <returns>200 with a confirmation message; 400 if the profile or document is not found.</returns>
    [HttpPost("review/{userProfileId}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Review(Guid userProfileId, [FromBody] KycReviewDto dto)
    {
        var result = await _kycService.ReviewKycAsync(userProfileId, dto, CurrentUserEmail);
        if (!result.IsSuccess) return BadRequest(new { error = result.Error });
        return Ok(new { message = result.Data });
    }
}