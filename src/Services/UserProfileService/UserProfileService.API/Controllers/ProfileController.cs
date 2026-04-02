using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using UserProfileService.Core.DTOs;
using UserProfileService.Core.Interfaces;

namespace UserProfileService.API.Controllers;

/// <summary>
/// Exposes user profile retrieval and update endpoints.
/// All endpoints require a valid JWT.
/// </summary>
[ApiController]
[Route("api/profile")]
[Authorize]
public class ProfileController : ControllerBase
{
    private readonly IProfileService _profileService;

    /// <summary>
    /// Initializes a new instance of <see cref="ProfileController"/>.
    /// </summary>
    /// <param name="profileService">The profile domain service.</param>
    public ProfileController(IProfileService profileService)
    {
        _profileService = profileService;
    }

    /// <summary>Gets the unique identifier of the currently authenticated user from JWT claims.</summary>
    private Guid CurrentUserId =>
        Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? User.FindFirstValue("sub")!);

    /// <summary>Retrieves the profile of the currently authenticated user.</summary>
    /// <returns>200 with profile data including KYC status; 404 if not found.</returns>
    [HttpGet]
    public async Task<IActionResult> GetProfile()
    {
        var result = await _profileService.GetProfileAsync(CurrentUserId);
        if (!result.IsSuccess) return NotFound(new { error = result.Error });
        return Ok(result.Data);
    }

    /// <summary>Updates mutable fields on the currently authenticated user's profile.</summary>
    /// <param name="dto">Fields to update; only non-empty values are applied.</param>
    /// <returns>200 with updated profile; 400 if not found.</returns>
    [HttpPut]
    public async Task<IActionResult> UpdateProfile([FromBody] UpdateProfileDto dto)
    {
        var result = await _profileService.UpdateProfileAsync(CurrentUserId, dto);
        if (!result.IsSuccess) return BadRequest(new { error = result.Error });
        return Ok(result.Data);
    }
}