using System.Text;
using ReceiptsService.Core.DTOs;
using ReceiptsService.Core.Interfaces;
using Shared.Common;

namespace ReceiptsService.Core.Services;

/// <summary>
/// Implements receipt business logic including retrieval by transaction, retrieval by user,
/// and CSV export of the user's transaction history.
/// </summary>
public class ReceiptDomainService : IReceiptService
{
    private readonly IReceiptRepository _receipts;

    /// <summary>
    /// Initializes a new instance of <see cref="ReceiptDomainService"/>.
    /// </summary>
    /// <param name="receipts">Repository for receipt persistence.</param>
    public ReceiptDomainService(IReceiptRepository receipts)
    {
        _receipts = receipts;
    }

    /// <summary>Retrieves the receipt for the specified transaction.</summary>
    /// <param name="transactionId">The transaction's unique identifier.</param>
    /// <returns>A successful result with the receipt; or a failure if not found.</returns>
    public async Task<Result<ReceiptDto>> GetByTransactionIdAsync(Guid transactionId)
    {
        var receipt = await _receipts.GetByTransactionIdAsync(transactionId);
        if (receipt is null)
            return Result<ReceiptDto>.Failure("Receipt not found.");

        return Result<ReceiptDto>.Success(MapToDto(receipt));
    }

    /// <summary>Retrieves all receipts belonging to the specified user.</summary>
    /// <param name="userId">The user's unique identifier.</param>
    /// <returns>A successful result containing the user's receipts.</returns>
    public async Task<Result<IEnumerable<ReceiptDto>>> GetMyReceiptsAsync(Guid userId)
    {
        var receipts = await _receipts.GetByUserIdAsync(userId);
        return Result<IEnumerable<ReceiptDto>>.Success(receipts.Select(MapToDto));
    }

    /// <summary>
    /// Generates a UTF-8 encoded CSV file containing all receipts for the specified user.
    /// Columns: TransactionId, Amount, Currency, Type, Date.
    /// </summary>
    /// <param name="userId">The user's unique identifier.</param>
    /// <returns>A successful result containing the raw CSV bytes.</returns>
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

    /// <summary>Maps a <see cref="Entities.Receipt"/> entity to a <see cref="ReceiptDto"/> for API responses.</summary>
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