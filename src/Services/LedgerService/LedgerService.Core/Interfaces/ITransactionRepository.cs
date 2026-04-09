// ITransactionRepository.cs
using LedgerService.Core.Entities;

namespace LedgerService.Core.Interfaces;

/// <summary>
/// Defines data-access operations for <see cref="Transaction"/> entities in the Ledger service.
/// </summary>
public interface ITransactionRepository
{
    /// <summary>Retrieves a transaction by its unique identifier, including ledger entries.</summary>
    Task<Transaction?> GetByIdAsync(Guid id);

    /// <summary>Retrieves a transaction by its idempotency key, or <c>null</c> if not found.</summary>
    Task<Transaction?> GetByIdempotencyKeyAsync(string key);

    /// <summary>Retrieves paginated transactions where the specified user is sender or receiver, newest-first.</summary>
    Task<IEnumerable<Transaction>> GetBySenderUserIdAsync(Guid userId, int page = 1, int pageSize = 20);

    /// <summary>Returns all transactions for a user (unpaged) for summary calculations.</summary>
    Task<IEnumerable<Transaction>> GetAllByUserIdAsync(Guid userId);

    /// <summary>Stages a new transaction for insertion.</summary>
    Task AddAsync(Transaction transaction);

    /// <summary>Persists all pending changes to the database.</summary>
    Task SaveChangesAsync();
}