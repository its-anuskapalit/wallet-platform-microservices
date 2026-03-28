using LedgerService.Core.DTOs;
using LedgerService.Core.Entities;
using LedgerService.Core.Enums;
using LedgerService.Core.Interfaces;
using Shared.Common;
using Shared.Contracts;
using Shared.Contracts.Events;
using Shared.EventBus;

namespace LedgerService.Core.Services;

public class TransactionService : ITransactionService
{
    private readonly ITransactionRepository _transactions;
    private readonly ILedgerEntryRepository _ledgerEntries;
    private readonly IEventPublisher _publisher;

    public TransactionService(
        ITransactionRepository transactions,
        ILedgerEntryRepository ledgerEntries,
        IEventPublisher publisher)
    {
        _transactions  = transactions;
        _ledgerEntries = ledgerEntries;
        _publisher     = publisher;
    }

    public async Task<Result<TransactionDto>> InitiateAsync(InitiateTransactionDto dto)
    {
        if (dto.Amount <= 0)
            return Result<TransactionDto>.Failure("Amount must be greater than zero.");

        if (dto.SenderWalletId == dto.ReceiverWalletId)
            return Result<TransactionDto>.Failure("Sender and receiver cannot be the same.");

        // Idempotency check
        var existing = await _transactions.GetByIdempotencyKeyAsync(dto.IdempotencyKey);
        if (existing is not null)
            return Result<TransactionDto>.Success(MapToDto(existing));

        if (!Enum.TryParse<TransactionType>(dto.Type, out var txType))
            return Result<TransactionDto>.Failure("Invalid transaction type.");

        var transaction = new Transaction
        {
            SenderWalletId   = dto.SenderWalletId,
            ReceiverWalletId = dto.ReceiverWalletId,
            SenderUserId     = dto.SenderUserId,
            ReceiverUserId   = dto.ReceiverUserId,
            Amount           = dto.Amount,
            Currency         = dto.Currency,
            Type             = txType,
            Status           = TransactionStatus.Pending,
            IdempotencyKey   = dto.IdempotencyKey
        };

        await _transactions.AddAsync(transaction);

        // Double-entry ledger entries
        var entries = new List<LedgerEntry>
        {
            new()
            {
                TransactionId = transaction.Id,
                WalletId      = dto.SenderWalletId,
                UserId        = dto.SenderUserId,
                EntryType     = EntryType.Debit,
                Amount        = dto.Amount,
                Currency      = dto.Currency,
                Description   = $"{txType} debit to {dto.ReceiverWalletId}"
            },
            new()
            {
                TransactionId = transaction.Id,
                WalletId      = dto.ReceiverWalletId,
                UserId        = dto.ReceiverUserId,
                EntryType     = EntryType.Credit,
                Amount        = dto.Amount,
                Currency      = dto.Currency,
                Description   = $"{txType} credit from {dto.SenderWalletId}"
            }
        };

        await _ledgerEntries.AddRangeAsync(entries);

        // Mark completed
        transaction.Status    = TransactionStatus.Completed;
        transaction.UpdatedAt = DateTime.UtcNow;

        await _transactions.SaveChangesAsync();

        // Publish event
        await _publisher.PublishAsync(
            new TransactionCompletedEvent
            {
                TransactionId    = transaction.Id,
                SenderWalletId   = transaction.SenderWalletId,
                ReceiverWalletId = transaction.ReceiverWalletId,
                SenderUserId     = transaction.SenderUserId,
                ReceiverUserId   = transaction.ReceiverUserId,
                Amount           = transaction.Amount,
                Currency         = transaction.Currency,
                TransactionType  = transaction.Type.ToString(),
                CompletedAt      = DateTime.UtcNow
            },
            EventQueues.TransactionExchange,
            routingKey: "transaction.completed");

        return Result<TransactionDto>.Success(MapToDto(transaction));
    }

    public async Task<Result<TransactionDto>> GetByIdAsync(Guid transactionId)
    {
        var transaction = await _transactions.GetByIdAsync(transactionId);
        if (transaction is null)
            return Result<TransactionDto>.Failure("Transaction not found.");

        return Result<TransactionDto>.Success(MapToDto(transaction));
    }

    public async Task<Result<IEnumerable<TransactionDto>>> GetMyTransactionsAsync(Guid userId)
    {
        var transactions = await _transactions.GetBySenderUserIdAsync(userId);
        return Result<IEnumerable<TransactionDto>>.Success(transactions.Select(MapToDto));
    }

    private static TransactionDto MapToDto(Transaction t) => new()
    {
        Id               = t.Id,
        SenderWalletId   = t.SenderWalletId,
        ReceiverWalletId = t.ReceiverWalletId,
        Amount           = t.Amount,
        Currency         = t.Currency,
        Type             = t.Type.ToString(),
        Status           = t.Status.ToString(),
        FailureReason    = t.FailureReason,
        CreatedAt        = t.CreatedAt
    };
}