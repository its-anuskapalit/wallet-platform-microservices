using AdminService.Core.Entities;

namespace AdminService.Core.Interfaces;

/// <summary>
/// Defines data-access operations for <see cref="FraudFlag"/> entities in the Admin service.
/// </summary>
public interface IAdminRepository
{
    /// <summary>Retrieves the fraud flag associated with a specific transaction, if one exists.</summary>
    Task<FraudFlag?> GetFraudFlagByTransactionIdAsync(Guid transactionId);

    /// <summary>Stages a new fraud flag for insertion.</summary>
    Task AddFraudFlagAsync(FraudFlag flag);

    /// <summary>Retrieves all fraud flags ordered by creation date descending.</summary>
    Task<IEnumerable<FraudFlag>> GetAllFraudFlagsAsync();

    /// <summary>Returns the total count of fraud flags.</summary>
    Task<int> GetFraudFlagCountAsync();

    /// <summary>Returns the count of fraud flags that have not yet been resolved.</summary>
    Task<int> GetUnresolvedFraudFlagCountAsync();

    /// <summary>Persists all pending changes to the database.</summary>
    Task SaveChangesAsync();
}