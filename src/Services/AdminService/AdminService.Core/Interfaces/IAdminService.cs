using AdminService.Core.DTOs;
using Shared.Common;

namespace AdminService.Core.Interfaces;

/// <summary>
/// Defines admin domain operations for dashboard metrics and fraud investigation.
/// </summary>
public interface IAdminService
{
    /// <summary>Retrieves a dashboard summary of fraud-flag statistics.</summary>
    Task<Result<DashboardDto>> GetDashboardAsync();

    /// <summary>Flags the specified transaction as potentially fraudulent.</summary>
    Task<Result<FraudFlagResponseDto>> FlagTransactionAsync(Guid transactionId, FraudFlagDto dto, Guid flaggedBy);

    /// <summary>Retrieves all fraud flags, ordered by creation date descending.</summary>
    Task<Result<IEnumerable<FraudFlagResponseDto>>> GetFraudFlagsAsync();
}