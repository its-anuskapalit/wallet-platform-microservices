using System.Security.Claims;
using LedgerService.Core.DTOs;
using LedgerService.Core.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace LedgerService.API.Controllers;

[ApiController]
[Route("api/transactions")]
[Authorize]
public class TransactionController : ControllerBase
{
    private readonly ITransactionService _transactionService;

    public TransactionController(ITransactionService transactionService)
    {
        _transactionService = transactionService;
    }

    private Guid CurrentUserId =>
        Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? User.FindFirstValue("sub")!);

    [HttpPost]
    public async Task<IActionResult> Initiate([FromBody] InitiateTransactionDto dto)
    {
        var result = await _transactionService.InitiateAsync(dto);
        if (!result.IsSuccess) return BadRequest(new { error = result.Error });
        return Ok(result.Data);
    }

    [HttpGet("{transactionId}")]
    public async Task<IActionResult> GetById(Guid transactionId)
    {
        var result = await _transactionService.GetByIdAsync(transactionId);
        if (!result.IsSuccess) return NotFound(new { error = result.Error });
        return Ok(result.Data);
    }

    [HttpGet("my")]
    public async Task<IActionResult> GetMyTransactions()
    {
        var result = await _transactionService.GetMyTransactionsAsync(CurrentUserId);
        return Ok(result.Data);
    }
}