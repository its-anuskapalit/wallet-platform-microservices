using System.Text;
using ReceiptsService.Core.DTOs;
using ReceiptsService.Core.Interfaces;
using Shared.Common;

namespace ReceiptsService.Core.Services;

public class ReceiptDomainService : IReceiptService
{
    private readonly IReceiptRepository _receipts;

    public ReceiptDomainService(IReceiptRepository receipts)
    {
        _receipts = receipts;
    }

    public async Task<Result<ReceiptDto>> GetByTransactionIdAsync(Guid transactionId)
    {
        var receipt = await _receipts.GetByTransactionIdAsync(transactionId);
        if (receipt is null)
            return Result<ReceiptDto>.Failure("Receipt not found.");

        return Result<ReceiptDto>.Success(MapToDto(receipt));
    }

    public async Task<Result<IEnumerable<ReceiptDto>>> GetMyReceiptsAsync(Guid userId)
    {
        var receipts = await _receipts.GetByUserIdAsync(userId);
        return Result<IEnumerable<ReceiptDto>>.Success(receipts.Select(MapToDto));
    }

    public async Task<Result<byte[]>> ExportCsvAsync(Guid userId)
    {
        var receipts = await _receipts.GetByUserIdAsync(userId);

        var sb = new StringBuilder();
        sb.AppendLine("TransactionId,Amount,Currency,Type,Date");

        foreach (var r in receipts)
            sb.AppendLine($"{r.TransactionId},{r.Amount},{r.Currency},{r.TransactionType},{r.TransactionDate:yyyy-MM-dd HH:mm:ss}");

        var bytes = Encoding.UTF8.GetBytes(sb.ToString());
        return Result<byte[]>.Success(bytes);
    }

    private static ReceiptDto MapToDto(Entities.Receipt r) => new()
    {
        Id               = r.Id,
        TransactionId    = r.TransactionId,
        SenderUserId     = r.SenderUserId,
        ReceiverUserId   = r.ReceiverUserId,
        SenderWalletId   = r.SenderWalletId,
        ReceiverWalletId = r.ReceiverWalletId,
        Amount           = r.Amount,
        Currency         = r.Currency,
        TransactionType  = r.TransactionType,
        TransactionDate  = r.TransactionDate
    };
}