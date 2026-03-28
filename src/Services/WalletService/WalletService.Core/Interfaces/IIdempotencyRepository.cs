using WalletService.Core.Entities;

namespace WalletService.Core.Interfaces;

public interface IIdempotencyRepository
{
    Task<IdempotencyKey?> GetAsync(string key);
    Task AddAsync(IdempotencyKey idempotencyKey);
    Task SaveChangesAsync();
}