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
    [HttpPost]
    public async Task<IActionResult> Initiate([FromBody] InitiateTransactionDto dto)
    {
        dto.SenderUserId = CurrentUserId;

        if (string.IsNullOrWhiteSpace(dto.IdempotencyKey))
            dto.IdempotencyKey = Guid.NewGuid().ToString();

        if (string.IsNullOrWhiteSpace(dto.Type))     dto.Type     = "Transfer";
        if (string.IsNullOrWhiteSpace(dto.Currency)) dto.Currency = "INR";

        // Validate receiver is not the sender
        if (dto.ReceiverUserId == Guid.Empty)
            return BadRequest(new { error = "Receiver user ID is required." });
        if (dto.ReceiverUserId == CurrentUserId)
            return BadRequest(new { error = "You cannot send money to yourself." });
        if (dto.Amount <= 0)
            return BadRequest(new { error = "Amount must be greater than zero." });
        if (!string.IsNullOrEmpty(dto.Memo) && dto.Memo.Length > 1500)
            return BadRequest(new { error = "Memo must be at most 1500 characters." });

        var result = await _transactionService.InitiateAsync(dto);
        if (!result.IsSuccess) return BadRequest(new { error = result.Error });
        return Ok(result.Data);
    }

    /// <summary>Returns aggregate transaction stats for the authenticated user.</summary>
    [HttpGet("summary")]
    public async Task<IActionResult> GetSummary()
    {
        var result = await _transactionService.GetSummaryAsync(CurrentUserId);
        return Ok(result.Data);
    }

    /// <summary>Retrieves a transaction by its unique identifier.</summary>
    [HttpGet("{transactionId}")]
    public async Task<IActionResult> GetById(Guid transactionId)
    {
        var result = await _transactionService.GetByIdAsync(transactionId);
        if (!result.IsSuccess) return NotFound(new { error = result.Error });
        return Ok(result.Data);
    }

    /// <summary>Retrieves all transactions for the currently authenticated user (sent and received), with optional pagination.</summary>
    [HttpGet("my")]
    public async Task<IActionResult> GetMyTransactions([FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        var result = await _transactionService.GetMyTransactionsAsync(CurrentUserId, page, pageSize);
        return Ok(result.Data);
    }
}