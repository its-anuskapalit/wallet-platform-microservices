using ReceiptsService.Core.DTOs;
using Shared.Common;

namespace ReceiptsService.Core.Interfaces;

/// <summary>
/// Defines receipt retrieval and export operations for the Receipts service.
/// </summary>
public interface IReceiptService
{
    /// <summary>Retrieves the receipt for the specified transaction.</summary>
    Task<Result<ReceiptDto>> GetByTransactionIdAsync(Guid transactionId);

    /// <summary>Retrieves all receipts belonging to the specified user.</summary>
    Task<Result<IEnumerable<ReceiptDto>>> GetMyReceiptsAsync(Guid userId);

    /// <summary>Generates a UTF-8 CSV file of the user's transaction receipts and returns it as raw bytes.</summary>
    Task<Result<byte[]>> ExportCsvAsync(Guid userId);

    /// <summary>Generates a PDF receipt for the specified transaction and returns raw bytes.</summary>
    Task<Result<byte[]>> GetPdfAsync(Guid transactionId);
}