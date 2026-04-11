using Shared.Common;
using WalletService.Core.DTOs;

namespace WalletService.Core.Interfaces;

/// <summary>Calls the Ledger service to record a completed transfer (wallet balances updated via RabbitMQ consumer).</summary>
public interface ILedgerClient
{
    Task<Result<Guid>> InitiateTransferAsync(LedgerInitiateTransferDto dto, string authorizationHeader, CancellationToken cancellationToken = default);
}
