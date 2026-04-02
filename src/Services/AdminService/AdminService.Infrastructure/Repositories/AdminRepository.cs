using AdminService.Core.Entities;
using AdminService.Core.Interfaces;
using AdminService.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace AdminService.Infrastructure.Repositories;

/// <summary>
/// Entity Framework Core implementation of <see cref="IAdminRepository"/> for the Admin service.
/// Provides data access for <see cref="FraudFlag"/> entities.
/// </summary>
public class AdminRepository : IAdminRepository
{
    private readonly AdminDbContext _db;

    /// <summary>
    /// Initializes a new instance of <see cref="AdminRepository"/>.
    /// </summary>
    /// <param name="db">The EF Core database context for the Admin service.</param>
    public AdminRepository(AdminDbContext db)
    {
        _db = db;
    }

    /// <summary>Retrieves the fraud flag associated with a specific transaction, if one exists.</summary>
    /// <param name="transactionId">The transaction's unique identifier.</param>
    /// <returns>The matching <see cref="FraudFlag"/>, or <c>null</c> if not found.</returns>
    public async Task<FraudFlag?> GetFraudFlagByTransactionIdAsync(Guid transactionId) =>
        await _db.FraudFlags.FirstOrDefaultAsync(f => f.TransactionId == transactionId);

    /// <summary>Stages a new <see cref="FraudFlag"/> entity for insertion.</summary>
    /// <param name="flag">The fraud flag to add.</param>
    public async Task AddFraudFlagAsync(FraudFlag flag) =>
        await _db.FraudFlags.AddAsync(flag);

    /// <summary>Retrieves all fraud flags ordered by creation date descending.</summary>
    /// <returns>An ordered list of all <see cref="FraudFlag"/> records.</returns>
    public async Task<IEnumerable<FraudFlag>> GetAllFraudFlagsAsync() =>
        await _db.FraudFlags.OrderByDescending(f => f.CreatedAt).ToListAsync();

    /// <summary>Returns the total count of fraud flags.</summary>
    public async Task<int> GetFraudFlagCountAsync() =>
        await _db.FraudFlags.CountAsync();

    /// <summary>Returns the count of fraud flags that have not yet been resolved.</summary>
    public async Task<int> GetUnresolvedFraudFlagCountAsync() =>
        await _db.FraudFlags.CountAsync(f => !f.IsResolved);

    /// <summary>Persists all pending changes to the database.</summary>
    public async Task SaveChangesAsync() =>
        await _db.SaveChangesAsync();
}