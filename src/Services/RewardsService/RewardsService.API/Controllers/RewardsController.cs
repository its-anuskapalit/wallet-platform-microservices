using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RewardsService.Core.Interfaces;

namespace RewardsService.API.Controllers;

/// <summary>
/// Exposes rewards account and points history endpoints.
/// All endpoints require a valid JWT.
/// </summary>
[ApiController]
[Route("api/rewards")]
[Authorize]
public class RewardsController : ControllerBase
{
    private readonly IRewardsService _rewardsService;

    /// <summary>
    /// Initializes a new instance of <see cref="RewardsController"/>.
    /// </summary>
    /// <param name="rewardsService">The rewards domain service.</param>
    public RewardsController(IRewardsService rewardsService)
    {
        _rewardsService = rewardsService;
    }

    /// <summary>Gets the unique identifier of the currently authenticated user from JWT claims.</summary>
    private Guid CurrentUserId =>
        Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? User.FindFirstValue("sub")!);

    /// <summary>Retrieves the rewards account summary for the currently authenticated user.</summary>
    /// <returns>200 with rewards data; 404 if no account exists.</returns>
    [HttpGet]
    public async Task<IActionResult> GetRewards()
    {
        var result = await _rewardsService.GetRewardsAsync(CurrentUserId);
        if (!result.IsSuccess) return NotFound(new { error = result.Error });
        return Ok(result.Data);
    }

    /// <summary>Retrieves the points transaction history for the currently authenticated user, ordered newest-first.</summary>
    /// <returns>200 with the points history list; 404 if no account exists.</returns>
    [HttpGet("history")]
    public async Task<IActionResult> GetHistory()
    {
        var result = await _rewardsService.GetPointsHistoryAsync(CurrentUserId);
        if (!result.IsSuccess) return NotFound(new { error = result.Error });
        return Ok(result.Data);
    }
}