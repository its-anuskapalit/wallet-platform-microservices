using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using WalletService.Core.DTOs;
using WalletService.Core.Interfaces;

namespace WalletService.API.Controllers;

[ApiController]
[Route("api/wallet/billsplit")]
[Authorize]
public class BillSplitController : ControllerBase
{
    private readonly IBillSplitService _svc;
    public BillSplitController(IBillSplitService svc) => _svc = svc;

    private Guid   CurrentUserId => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub")!);
    private string CurrentEmail  => User.FindFirstValue(ClaimTypes.Email) ?? User.FindFirstValue("email") ?? string.Empty;

    /// <summary>Create a new bill split.</summary>
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateBillSplitDto dto)
    {
        var result = await _svc.CreateAsync(CurrentUserId, CurrentEmail, dto);
        if (!result.IsSuccess) return BadRequest(new { error = result.Error });
        return Ok(result.Data);
    }

    /// <summary>Get all splits I created.</summary>
    [HttpGet("created")]
    public async Task<IActionResult> GetCreated()
    {
        var result = await _svc.GetMyCreatedAsync(CurrentUserId);
        return Ok(result.Data);
    }

    /// <summary>Get all splits where I owe money.</summary>
    [HttpGet("owed")]
    public async Task<IActionResult> GetOwed()
    {
        var result = await _svc.GetMyOwedAsync(CurrentEmail);
        return Ok(result.Data);
    }

    /// <summary>Pay my share for a split.</summary>
    [HttpPost("{id:guid}/pay")]
    public async Task<IActionResult> Pay(Guid id)
    {
        var auth = Request.Headers.Authorization.ToString();
        if (string.IsNullOrWhiteSpace(auth))
            return Unauthorized(new { error = "Authorization header is required." });

        var result = await _svc.PayShareAsync(id, CurrentUserId, CurrentEmail, auth);
        if (!result.IsSuccess) return BadRequest(new { error = result.Error });
        return Ok(result.Data);
    }
}
