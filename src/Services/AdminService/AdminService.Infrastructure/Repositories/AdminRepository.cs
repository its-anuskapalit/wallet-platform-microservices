using AdminService.Core.Entities;
using AdminService.Core.Interfaces;
using AdminService.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace AdminService.Infrastructure.Repositories;

public class AdminRepository : IAdminRepository
{
    private readonly AdminDbContext _db;

    public AdminRepository(AdminDbContext db)
    {
        _db = db;
    }

    public async Task<FraudFlag?> GetFraudFlagByTransactionIdAsync(Guid transactionId) =>
        await _db.FraudFlags.FirstOrDefaultAsync(f => f.TransactionId == transactionId);

    public async Task AddFraudFlagAsync(FraudFlag flag) =>
        await _db.FraudFlags.AddAsync(flag);

    public async Task<IEnumerable<FraudFlag>> GetAllFraudFlagsAsync() =>
        await _db.FraudFlags.OrderByDescending(f => f.CreatedAt).ToListAsync();

    public async Task<int> GetFraudFlagCountAsync() =>
        await _db.FraudFlags.CountAsync();

    public async Task<int> GetUnresolvedFraudFlagCountAsync() =>
        await _db.FraudFlags.CountAsync(f => !f.IsResolved);

    public async Task SaveChangesAsync() =>
        await _db.SaveChangesAsync();
}