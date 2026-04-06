using System.Security.Claims;
using LedgerService.Core.DTOs;
using LedgerService.Core.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace LedgerService.API.Controllers;

/// <summary>
/// Exposes transaction lifecycle endpoints including initiating transfers and retrieving transaction history.
/// All endpoints require a valid JWT.
/// </summary>
[ApiController]
[Route("api/transactions")]
[Authorize]
public class TransactionController : ControllerBase
{
    private readonly ITransactionService _transactionService;

    /// <summary>
    /// Initializes a new instance of <see cref="TransactionController"/>.
    /// </summary>
    /// <param name="transactionService">The transaction domain service.</param>
    public TransactionController(ITransactionService transactionService)
    {
        _transactionService = transactionService;
    }

    /// <summary>Gets the unique identifier of the currently authenticated user from JWT claims.</summary>
    private Guid CurrentUserId =>Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)?? User.FindFirstValue("sub")!);

    /// <summary>Initiates a new financial transaction between two wallets.</summary>
    /// <param name="dto">Transaction initiation payload including sender/receiver wallets and amount.</param>
    /// <returns>200 with the created transaction; 400 on validation failure.</returns>
    [HttpPost]
    public async Task<IActionResult> Initiate([FromBody] InitiateTransactionDto dto)
    {
        var result = await _transactionService.InitiateAsync(dto);
        if (!result.IsSuccess) return BadRequest(new { error = result.Error });
        return Ok(result.Data);
    }

    /// <summary>Retrieves a transaction by its unique identifier.</summary>
    /// <param name="transactionId">The transaction's unique identifier.</param>
    /// <returns>200 with the transaction; 404 if not found.</returns>
    [HttpGet("{transactionId}")]
    public async Task<IActionResult> GetById(Guid transactionId)
    {
        var result = await _transactionService.GetByIdAsync(transactionId);
        if (!result.IsSuccess) return NotFound(new { error = result.Error });
        return Ok(result.Data);
    }

    /// <summary>Retrieves all transactions initiated by the currently authenticated user.</summary>
    /// <returns>200 with the list of outbound transactions.</returns>
    [HttpGet("my")]
    public async Task<IActionResult> GetMyTransactions()
    {
        var result = await _transactionService.GetMyTransactionsAsync(CurrentUserId);
        return Ok(result.Data);
    }
}