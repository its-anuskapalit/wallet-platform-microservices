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

    /// <summary>Retrieves all transactions where the specified user is the sender or receiver.</summary>
    Task<Result<IEnumerable<TransactionDto>>> GetMyTransactionsAsync(Guid userId);
}