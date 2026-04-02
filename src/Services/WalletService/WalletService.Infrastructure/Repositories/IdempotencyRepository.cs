using Microsoft.EntityFrameworkCore;
using WalletService.Core.Entities;
using WalletService.Core.Interfaces;
using WalletService.Infrastructure.Data;

namespace WalletService.Infrastructure.Repositories;

/// <summary>
/// Entity Framework Core implementation of <see cref="IIdempotencyRepository"/> for the Wallet service.
/// Stores and retrieves idempotency keys to prevent duplicate processing of mutating operations.
/// </summary>
public class IdempotencyRepository : IIdempotencyRepository
{
    private readonly WalletDbContext _db;

    /// <summary>
    /// Initializes a new instance of <see cref="IdempotencyRepository"/>.
    /// </summary>
    /// <param name="db">The EF Core database context for the Wallet service.</param>
    public IdempotencyRepository(WalletDbContext db)
    {
        _db = db;
    }

    /// <summary>Retrieves a cached idempotency key entry by its key string.</summary>
    /// <param name="key">The idempotency key to look up.</param>
    /// <returns>The matching <see cref="IdempotencyKey"/> record, or <c>null</c> if not found.</returns>
    public async Task<IdempotencyKey?> GetAsync(string key) =>
        await _db.IdempotencyKeys.FirstOrDefaultAsync(i => i.Key == key);

    /// <summary>Stages a new <see cref="IdempotencyKey"/> entry for insertion.</summary>
    /// <param name="idempotencyKey">The idempotency key record to persist.</param>
    public async Task AddAsync(IdempotencyKey idempotencyKey) =>
        await _db.IdempotencyKeys.AddAsync(idempotencyKey);

    /// <summary>Persists all pending changes to the database.</summary>
    public async Task SaveChangesAsync() =>
        await _db.SaveChangesAsync();
}