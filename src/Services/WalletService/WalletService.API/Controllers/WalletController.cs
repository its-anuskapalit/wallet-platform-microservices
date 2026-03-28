using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using WalletService.Core.DTOs;
using WalletService.Core.Interfaces;

namespace WalletService.API.Controllers;

[ApiController]
[Route("api/wallet")]
[Authorize]
public class WalletController : ControllerBase
{
    private readonly IWalletService _walletService;

    public WalletController(IWalletService walletService)
    {
        _walletService = walletService;
    }

    private Guid CurrentUserId =>
        Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? User.FindFirstValue("sub")!);

    [HttpGet]
    public async Task<IActionResult> GetWallet()
    {
        var result = await _walletService.GetWalletAsync(CurrentUserId);
        if (!result.IsSuccess) return NotFound(new { error = result.Error });
        return Ok(result.Data);
    }

    [HttpPost("topup")]
    public async Task<IActionResult> TopUp([FromBody] TopUpDto dto)
    {
        var result = await _walletService.TopUpAsync(CurrentUserId, dto);
        if (!result.IsSuccess) return BadRequest(new { error = result.Error });
        return Ok(result.Data);
    }

    [HttpPost("deduct")]
    public async Task<IActionResult> Deduct([FromBody] DeductDto dto)
    {
        var result = await _walletService.DeductAsync(CurrentUserId, dto);
        if (!result.IsSuccess) return BadRequest(new { error = result.Error });
        return Ok(result.Data);
    }

    [HttpPost("freeze")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Freeze([FromBody] FreezeDto dto)
    {
        var result = await _walletService.FreezeAsync(CurrentUserId, dto);
        if (!result.IsSuccess) return BadRequest(new { error = result.Error });
        return Ok(result.Data);
    }

    [HttpPost("unfreeze")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Unfreeze()
    {
        var result = await _walletService.UnfreezeAsync(CurrentUserId);
        if (!result.IsSuccess) return BadRequest(new { error = result.Error });
        return Ok(result.Data);
    }
}