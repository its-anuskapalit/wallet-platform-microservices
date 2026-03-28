using System.Security.Claims;
using CatalogService.Core.DTOs;
using CatalogService.Core.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CatalogService.API.Controllers;

[ApiController]
[Route("api/redemptions")]
[Authorize]
public class RedemptionController : ControllerBase
{
    private readonly IRedemptionService _redemptionService;

    public RedemptionController(IRedemptionService redemptionService)
    {
        _redemptionService = redemptionService;
    }

    private Guid CurrentUserId =>
        Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? User.FindFirstValue("sub")!);

    [HttpPost]
    public async Task<IActionResult> Redeem([FromBody] CreateRedemptionDto dto)
    {
        var result = await _redemptionService.RedeemAsync(CurrentUserId, dto);
        if (!result.IsSuccess) return BadRequest(new { error = result.Error });
        return Ok(result.Data);
    }

    [HttpGet("my")]
    public async Task<IActionResult> GetMyRedemptions()
    {
        var result = await _redemptionService.GetMyRedemptionsAsync(CurrentUserId);
        return Ok(result.Data);
    }
}