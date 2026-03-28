using ReceiptsService.Core.DTOs;
using Shared.Common;

namespace ReceiptsService.Core.Interfaces;

public interface IReceiptService
{
    Task<Result<ReceiptDto>> GetByTransactionIdAsync(Guid transactionId);
    Task<Result<IEnumerable<ReceiptDto>>> GetMyReceiptsAsync(Guid userId);
    Task<Result<byte[]>> ExportCsvAsync(Guid userId);
}