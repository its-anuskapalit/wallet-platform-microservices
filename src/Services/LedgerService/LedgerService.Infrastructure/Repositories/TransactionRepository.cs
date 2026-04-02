using LedgerService.Core.Entities;
using LedgerService.Core.Interfaces;
using LedgerService.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace LedgerService.Infrastructure.Repositories;

/// <summary>
/// Entity Framework Core implementation of <see cref="ITransactionRepository"/> for the Ledger service.
/// </summary>
public class TransactionRepository : ITransactionRepository
{
    private readonly LedgerDbContext _db;

    /// <summary>
    /// Initializes a new instance of <see cref="TransactionRepository"/>.
    /// </summary>
    /// <param name="db">The EF Core database context for the Ledger service.</param>
    public TransactionRepository(LedgerDbContext db)
    {
        _db = db;
    }

    /// <summary>Retrieves a transaction by its unique identifier, including its ledger entries.</summary>
    /// <param name="id">The transaction's unique identifier.</param>
    /// <returns>The matching <see cref="Transaction"/> with ledger entries, or <c>null</c> if not found.</returns>
    public async Task<Transaction?> GetByIdAsync(Guid id) =>
        await _db.Transactions
            .Include(t => t.LedgerEntries)
            .FirstOrDefaultAsync(t => t.Id == id);

    /// <summary>Retrieves a transaction by its idempotency key, used to prevent duplicate submissions.</summary>
    /// <param name="key">The idempotency key string.</param>
    /// <returns>The matching <see cref="Transaction"/>, or <c>null</c> if not found.</returns>
    public async Task<Transaction?> GetByIdempotencyKeyAsync(string key) =>
        await _db.Transactions.FirstOrDefaultAsync(t => t.IdempotencyKey == key);

    /// <summary>
    /// Retrieves all transactions where the specified user is either the sender or receiver,
    /// ordered by creation date descending.
    /// </summary>
    /// <param name="userId">The user's unique identifier.</param>
    /// <returns>An ordered list of transactions involving the user.</returns>
    public async Task<IEnumerable<Transaction>> GetBySenderUserIdAsync(Guid userId) =>
        await _db.Transactions
            .Where(t => t.SenderUserId == userId || t.ReceiverUserId == userId)
            .OrderByDescending(t => t.CreatedAt)
            .ToListAsync();

    /// <summary>Stages a new <see cref="Transaction"/> entity for insertion.</summary>
    /// <param name="transaction">The transaction to add.</param>
    public async Task AddAsync(Transaction transaction) =>
        await _db.Transactions.AddAsync(transaction);

    /// <summary>Persists all pending changes to the database.</summary>
    public async Task SaveChangesAsync() =>
        await _db.SaveChangesAsync();
}