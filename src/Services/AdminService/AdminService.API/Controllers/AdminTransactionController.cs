using System.Security.Claims;
using AdminService.Core.DTOs;
using AdminService.Core.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AdminService.API.Controllers;

[ApiController]
[Route("api/admin/transactions")]
[Authorize(Roles = "Admin")]
public class AdminTransactionController : ControllerBase
{
    private readonly IAdminService _adminService;

    public AdminTransactionController(IAdminService adminService)
    {
        _adminService = adminService;
    }

    private Guid CurrentUserId => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub")!);

    [HttpPost("{transactionId}/flag")]
    public async Task<IActionResult> FlagTransaction(Guid transactionId, [FromBody] FraudFlagDto dto)
    {
        var result = await _adminService.FlagTransactionAsync(transactionId, dto, CurrentUserId);
        if (!result.IsSuccess)
        {
            return BadRequest(new { error = result.Error });
        }
        return Ok(result.Data);
    }

    [HttpGet("fraud-flags")]
    public async Task<IActionResult> GetFraudFlags()
    {
        var result = await _adminService.GetFraudFlagsAsync();
        return Ok(result.Data);
    }
}