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

    private Guid   CurrentUserId   => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub")!);
    private string CurrentEmail    => User.FindFirstValue(ClaimTypes.Email) ?? User.FindFirstValue("email") ?? string.Empty;
    private string CurrentFullName => User.FindFirstValue("fullName") ?? User.FindFirstValue(ClaimTypes.Name) ?? string.Empty;

    /// <summary>
    /// Retrieves the profile of the currently authenticated user.
    /// If the profile does not yet exist (e.g. RabbitMQ event was missed), it is created automatically.
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> GetProfile()
    {
        var result = await _profileService.GetOrCreateProfileAsync(CurrentUserId, CurrentEmail, CurrentFullName);
        if (!result.IsSuccess) return NotFound(new { error = result.Error });
        return Ok(result.Data);
    }

    /// <summary>Updates mutable fields on the currently authenticated user's profile.</summary>
    [HttpPut]
    public async Task<IActionResult> UpdateProfile([FromBody] UpdateProfileDto dto)
    {
        await _profileService.GetOrCreateProfileAsync(CurrentUserId, CurrentEmail, CurrentFullName);
        var result = await _profileService.UpdateProfileAsync(CurrentUserId, dto);
        if (!result.IsSuccess) return BadRequest(new { error = result.Error });
        return Ok(result.Data);
    }

    /// <summary>
    /// Looks up a user profile by email address. Used by the send-money and admin-KYC flows
    /// so users never need to know system GUIDs.
    /// </summary>
    [HttpGet("lookup")]
    public async Task<IActionResult> LookupByEmail([FromQuery] string email)
    {
        var result = await _profileService.LookupByEmailAsync(email);
        if (!result.IsSuccess) return NotFound(new { error = result.Error });
        return Ok(result.Data);
    }

    /// <summary>Admin-only: returns all user profiles with pagination.</summary>
    [HttpGet("admin/all")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> GetAllProfiles([FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        var result = await _profileService.GetAllProfilesAsync(page, pageSize);
        return Ok(result.Data);
    }
}