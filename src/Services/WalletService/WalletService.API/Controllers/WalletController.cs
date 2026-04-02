using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using WalletService.Core.DTOs;
using WalletService.Core.Interfaces;

namespace WalletService.API.Controllers;

/// <summary>
/// Exposes wallet management endpoints including balance retrieval, top-up, deduction, and freeze/unfreeze.
/// All endpoints require a valid JWT; freeze and unfreeze additionally require the Admin role.
/// </summary>
[ApiController]
[Route("api/wallet")]
[Authorize]
public class WalletController : ControllerBase
{
    private readonly IWalletService _walletService;

    /// <summary>
    /// Initializes a new instance of <see cref="WalletController"/>.
    /// </summary>
    /// <param name="walletService">The wallet domain service.</param>
    public WalletController(IWalletService walletService)
    {
        _walletService = walletService;
    }

    /// <summary>Gets the unique identifier of the currently authenticated user from JWT claims.</summary>
    private Guid CurrentUserId =>
        Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? User.FindFirstValue("sub")!);

    /// <summary>Retrieves the wallet of the currently authenticated user.</summary>
    /// <returns>200 with wallet details; 404 if no wallet exists for the user.</returns>
    [HttpGet]
    public async Task<IActionResult> GetWallet()
    {
        var result = await _walletService.GetWalletAsync(CurrentUserId);
        if (!result.IsSuccess) return NotFound(new { error = result.Error });
        return Ok(result.Data);
    }

    /// <summary>Credits funds to the authenticated user's wallet.</summary>
    /// <param name="dto">Top-up amount and idempotency key.</param>
    /// <returns>200 with updated wallet; 400 on validation failure or frozen wallet.</returns>
    [HttpPost("topup")]
    public async Task<IActionResult> TopUp([FromBody] TopUpDto dto)
    {
        var result = await _walletService.TopUpAsync(CurrentUserId, dto);
        if (!result.IsSuccess) return BadRequest(new { error = result.Error });
        return Ok(result.Data);
    }

    /// <summary>Debits funds from the authenticated user's wallet.</summary>
    /// <param name="dto">Deduction amount and idempotency key.</param>
    /// <returns>200 with updated wallet; 400 on validation failure, frozen wallet, or insufficient balance.</returns>
    [HttpPost("deduct")]
    public async Task<IActionResult> Deduct([FromBody] DeductDto dto)
    {
        var result = await _walletService.DeductAsync(CurrentUserId, dto);
        if (!result.IsSuccess) return BadRequest(new { error = result.Error });
        return Ok(result.Data);
    }

    /// <summary>Freezes the authenticated user's wallet. Requires the Admin role.</summary>
    /// <param name="dto">Freeze reason payload.</param>
    /// <returns>200 with updated wallet; 400 if already frozen or wallet not found.</returns>
    [HttpPost("freeze")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Freeze([FromBody] FreezeDto dto)
    {
        var result = await _walletService.FreezeAsync(CurrentUserId, dto);
        if (!result.IsSuccess) return BadRequest(new { error = result.Error });
        return Ok(result.Data);
    }

    /// <summary>Unfreezes the authenticated user's wallet. Requires the Admin role.</summary>
    /// <returns>200 with updated wallet; 400 if not frozen or wallet not found.</returns>
    [HttpPost("unfreeze")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Unfreeze()
    {
        var result = await _walletService.UnfreezeAsync(CurrentUserId);
        if (!result.IsSuccess) return BadRequest(new { error = result.Error });
        return Ok(result.Data);
    }
}