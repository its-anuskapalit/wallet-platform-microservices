// ITransactionService.cs
using LedgerService.Core.DTOs;
using Shared.Common;

namespace LedgerService.Core.Interfaces;

public interface ITransactionService
{
    Task<Result<TransactionDto>> InitiateAsync(InitiateTransactionDto dto);
    Task<Result<TransactionDto>> GetByIdAsync(Guid transactionId);
    Task<Result<IEnumerable<TransactionDto>>> GetMyTransactionsAsync(Guid userId);
}