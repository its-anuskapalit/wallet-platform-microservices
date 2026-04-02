using System.Security.Claims;
using CatalogService.Core.DTOs;
using CatalogService.Core.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CatalogService.API.Controllers;

/// <summary>
/// Exposes redemption endpoints allowing authenticated users to redeem catalog items
/// using their loyalty points and to retrieve their redemption history.
/// </summary>
[ApiController]
[Route("api/redemptions")]
[Authorize]
public class RedemptionController : ControllerBase
{
    private readonly IRedemptionService _redemptionService;

    /// <summary>
    /// Initializes a new instance of <see cref="RedemptionController"/>.
    /// </summary>
    /// <param name="redemptionService">The redemption domain service.</param>
    public RedemptionController(IRedemptionService redemptionService)
    {
        _redemptionService = redemptionService;
    }

    /// <summary>Gets the unique identifier of the currently authenticated user from JWT claims.</summary>
    private Guid CurrentUserId =>
        Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? User.FindFirstValue("sub")!);

    /// <summary>Redeems a catalog item for the currently authenticated user.</summary>
    /// <param name="dto">Redemption request containing the catalog item identifier.</param>
    /// <returns>200 with the redemption record; 400 if the item is unavailable or out of stock.</returns>
    [HttpPost]
    public async Task<IActionResult> Redeem([FromBody] CreateRedemptionDto dto)
    {
        var result = await _redemptionService.RedeemAsync(CurrentUserId, dto);
        if (!result.IsSuccess) return BadRequest(new { error = result.Error });
        return Ok(result.Data);
    }

    /// <summary>Retrieves the redemption history of the currently authenticated user.</summary>
    /// <returns>200 with the list of the user's past redemptions.</returns>
    [HttpGet("my")]
    public async Task<IActionResult> GetMyRedemptions()
    {
        var result = await _redemptionService.GetMyRedemptionsAsync(CurrentUserId);
        return Ok(result.Data);
    }
}