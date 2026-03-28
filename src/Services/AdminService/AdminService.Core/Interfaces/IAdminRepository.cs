using AdminService.Core.Entities;

namespace AdminService.Core.Interfaces;

public interface IAdminRepository
{
    Task<FraudFlag?> GetFraudFlagByTransactionIdAsync(Guid transactionId);
    Task AddFraudFlagAsync(FraudFlag flag);
    Task<IEnumerable<FraudFlag>> GetAllFraudFlagsAsync();
    Task<int> GetFraudFlagCountAsync();
    Task<int> GetUnresolvedFraudFlagCountAsync();
    Task SaveChangesAsync();
}