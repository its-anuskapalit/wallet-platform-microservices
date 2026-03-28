using Microsoft.EntityFrameworkCore;
using WalletService.Core.Entities;
using WalletService.Core.Interfaces;
using WalletService.Infrastructure.Data;

namespace WalletService.Infrastructure.Repositories;

public class IdempotencyRepository : IIdempotencyRepository
{
    private readonly WalletDbContext _db;

    public IdempotencyRepository(WalletDbContext db)
    {
        _db = db;
    }

    public async Task<IdempotencyKey?> GetAsync(string key) =>
        await _db.IdempotencyKeys.FirstOrDefaultAsync(i => i.Key == key);

    public async Task AddAsync(IdempotencyKey idempotencyKey) =>
        await _db.IdempotencyKeys.AddAsync(idempotencyKey);

    public async Task SaveChangesAsync() =>
        await _db.SaveChangesAsync();
}