using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ReceiptsService.Core.Interfaces;

namespace ReceiptsService.API.Controllers;

/// <summary>
/// Exposes receipt retrieval and CSV export endpoints.
/// All endpoints require a valid JWT.
/// </summary>
[ApiController]
[Route("api/receipts")]
[Authorize]
public class ReceiptsController : ControllerBase
{
    private readonly IReceiptService _receiptService;

    /// <summary>
    /// Initializes a new instance of <see cref="ReceiptsController"/>.
    /// </summary>
    /// <param name="receiptService">The receipt domain service.</param>
    public ReceiptsController(IReceiptService receiptService)
    {
        _receiptService = receiptService;
    }

    /// <summary>Gets the unique identifier of the currently authenticated user from JWT claims.</summary>
    private Guid CurrentUserId =>
        Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? User.FindFirstValue("sub")!);

    /// <summary>Retrieves the receipt for the specified transaction.</summary>
    /// <param name="transactionId">The unique identifier of the transaction.</param>
    /// <returns>200 with the receipt; 404 if not found.</returns>
    [HttpGet("transaction/{transactionId}")]
    public async Task<IActionResult> GetByTransactionId(Guid transactionId)
    {
        var result = await _receiptService.GetByTransactionIdAsync(transactionId);
        if (!result.IsSuccess) return NotFound(new { error = result.Error });
        return Ok(result.Data);
    }

    /// <summary>Retrieves all receipts belonging to the currently authenticated user.</summary>
    /// <returns>200 with the list of receipts.</returns>
    [HttpGet("my")]
    public async Task<IActionResult> GetMyReceipts()
    {
        var result = await _receiptService.GetMyReceiptsAsync(CurrentUserId);
        return Ok(result.Data);
    }

    /// <summary>Downloads a formatted PDF receipt for the specified transaction.</summary>
    /// <param name="transactionId">The unique identifier of the transaction.</param>
    /// <returns>A PDF file; 404 if the receipt does not exist.</returns>
    [HttpGet("transaction/{transactionId}/pdf")]
    public async Task<IActionResult> GetPdf(Guid transactionId)
    {
        var result = await _receiptService.GetPdfAsync(transactionId);
        if (!result.IsSuccess) return NotFound(new { error = result.Error });
        return File(result.Data!, "application/pdf", $"receipt-{transactionId}.pdf");
    }

    /// <summary>Exports the currently authenticated user's transaction receipts as a downloadable CSV file.</summary>
    /// <returns>A CSV file attachment named <c>transactions_YYYYMMDD.csv</c>; 400 on failure.</returns>
    [HttpGet("export/csv")]
    public async Task<IActionResult> ExportCsv()
    {
        var result = await _receiptService.ExportCsvAsync(CurrentUserId);
        if (!result.IsSuccess) return BadRequest(new { error = result.Error });

        return File(result.Data!, "text/csv", $"transactions_{DateTime.UtcNow:yyyyMMdd}.csv");
    }
}