// ITransactionService.cs
using LedgerService.Core.DTOs;
using Shared.Common;

namespace LedgerService.Core.Interfaces;

/// <summary>
/// Defines transaction lifecycle operations for the Ledger service.
/// </summary>
public interface ITransactionService
{
    /// <summary>Initiates a new transaction with double-entry ledger entries and publishes a completion event.</summary>
    Task<Result<TransactionDto>> InitiateAsync(InitiateTransactionDto dto);

    /// <summary>Retrieves a single transaction by its unique identifier.</summary>
    Task<Result<TransactionDto>> GetByIdAsync(Guid transactionId);

    /// <summary>Retrieves paginated transactions where the specified user is the sender or receiver.</summary>
    Task<Result<IEnumerable<TransactionDto>>> GetMyTransactionsAsync(Guid userId, int page = 1, int pageSize = 20);

    /// <summary>Returns aggregate send/receive totals for the user.</summary>
    Task<Result<TransactionSummaryDto>> GetSummaryAsync(Guid userId);
}