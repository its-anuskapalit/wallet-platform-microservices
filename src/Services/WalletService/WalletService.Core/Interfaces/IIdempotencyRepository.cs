using WalletService.Core.Entities;

namespace WalletService.Core.Interfaces;

/// <summary>
/// Defines persistence operations for idempotency keys used to prevent duplicate wallet mutations.
/// </summary>
public interface IIdempotencyRepository
{
    /// <summary>Retrieves an idempotency key entry by its key string, or <c>null</c> if not found.</summary>
    Task<IdempotencyKey?> GetAsync(string key);

    /// <summary>Stages a new idempotency key entry for insertion.</summary>
    Task AddAsync(IdempotencyKey idempotencyKey);

    /// <summary>Persists all pending changes to the database.</summary>
    Task SaveChangesAsync();
}