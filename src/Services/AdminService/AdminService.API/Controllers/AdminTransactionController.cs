using System.Security.Claims;
using AdminService.Core.DTOs;
using AdminService.Core.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AdminService.API.Controllers;

/// <summary>
/// Provides admin-only endpoints for fraud investigation, including flagging transactions and listing fraud flags.
/// </summary>
[ApiController]
[Route("api/admin/transactions")]
[Authorize(Roles = "Admin")]
public class AdminTransactionController : ControllerBase
{
    private readonly IAdminService _adminService;

    /// <summary>
    /// Initializes a new instance of <see cref="AdminTransactionController"/>.
    /// </summary>
    /// <param name="adminService">The admin domain service.</param>
    public AdminTransactionController(IAdminService adminService)
    {
        _adminService = adminService;
    }

    /// <summary>Gets the unique identifier of the currently authenticated admin from JWT claims.</summary>
    private Guid CurrentUserId => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub")!);

    /// <summary>Flags a transaction as potentially fraudulent.</summary>
    /// <param name="transactionId">The unique identifier of the transaction to flag.</param>
    /// <param name="dto">Fraud flag payload containing the reason.</param>
    /// <returns>200 with the created flag; 400 if already flagged.</returns>
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

    /// <summary>Returns all fraud flags ordered by creation date descending.</summary>
    /// <returns>200 with the list of fraud flags.</returns>
    [HttpGet("fraud-flags")]
    public async Task<IActionResult> GetFraudFlags()
    {
        var result = await _adminService.GetFraudFlagsAsync();
        return Ok(result.Data);
    }
}