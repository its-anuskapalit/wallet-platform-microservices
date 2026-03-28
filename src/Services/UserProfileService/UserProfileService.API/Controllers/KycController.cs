using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using UserProfileService.Core.DTOs;
using UserProfileService.Core.Interfaces;

namespace UserProfileService.API.Controllers;

[ApiController]
[Route("api/kyc")]
[Authorize]
public class KycController : ControllerBase
{
    private readonly IKycService _kycService;

    public KycController(IKycService kycService)
    {
        _kycService = kycService;
    }

    private Guid CurrentUserId =>
        Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? User.FindFirstValue("sub")!);

    private string CurrentUserEmail =>
        User.FindFirstValue(ClaimTypes.Email)
            ?? User.FindFirstValue("email")!;

    [HttpPost("submit")]
    public async Task<IActionResult> Submit([FromBody] KycSubmitDto dto)
    {
        var result = await _kycService.SubmitKycAsync(CurrentUserId, dto);
        if (!result.IsSuccess) return BadRequest(new { error = result.Error });
        return Ok(new { message = result.Data });
    }

    [HttpPost("review/{userProfileId}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Review(Guid userProfileId, [FromBody] KycReviewDto dto)
    {
        var result = await _kycService.ReviewKycAsync(userProfileId, dto, CurrentUserEmail);
        if (!result.IsSuccess) return BadRequest(new { error = result.Error });
        return Ok(new { message = result.Data });
    }
}