using AdminService.Core.DTOs;
using Shared.Common;

namespace AdminService.Core.Interfaces;

public interface IAdminService
{
    Task<Result<DashboardDto>> GetDashboardAsync();
    Task<Result<FraudFlagResponseDto>> FlagTransactionAsync(Guid transactionId, FraudFlagDto dto, Guid flaggedBy);
    Task<Result<IEnumerable<FraudFlagResponseDto>>> GetFraudFlagsAsync();
}