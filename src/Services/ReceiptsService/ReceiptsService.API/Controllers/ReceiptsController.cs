using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ReceiptsService.Core.Interfaces;

namespace ReceiptsService.API.Controllers;

[ApiController]
[Route("api/receipts")]
[Authorize]
public class ReceiptsController : ControllerBase
{
    private readonly IReceiptService _receiptService;

    public ReceiptsController(IReceiptService receiptService)
    {
        _receiptService = receiptService;
    }

    private Guid CurrentUserId =>
        Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? User.FindFirstValue("sub")!);

    [HttpGet("transaction/{transactionId}")]
    public async Task<IActionResult> GetByTransactionId(Guid transactionId)
    {
        var result = await _receiptService.GetByTransactionIdAsync(transactionId);
        if (!result.IsSuccess) return NotFound(new { error = result.Error });
        return Ok(result.Data);
    }

    [HttpGet("my")]
    public async Task<IActionResult> GetMyReceipts()
    {
        var result = await _receiptService.GetMyReceiptsAsync(CurrentUserId);
        return Ok(result.Data);
    }

    [HttpGet("export/csv")]
    public async Task<IActionResult> ExportCsv()
    {
        var result = await _receiptService.ExportCsvAsync(CurrentUserId);
        if (!result.IsSuccess) return BadRequest(new { error = result.Error });

        return File(result.Data!, "text/csv", $"transactions_{DateTime.UtcNow:yyyyMMdd}.csv");
    }
}