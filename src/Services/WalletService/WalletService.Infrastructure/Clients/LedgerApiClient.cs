using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Shared.Common;
using WalletService.Core.DTOs;
using WalletService.Core.Interfaces;

namespace WalletService.Infrastructure.Clients;

public sealed class LedgerApiClient : ILedgerClient
{
    private readonly HttpClient _http;
    private readonly ILogger<LedgerApiClient> _log;

    public LedgerApiClient(HttpClient http, ILogger<LedgerApiClient> log)
    {
        _http  = http;
        _log   = log;
    }

    public async Task<Result<Guid>> InitiateTransferAsync(LedgerInitiateTransferDto dto, string authorizationHeader, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(authorizationHeader))
            return Result<Guid>.Failure("Authorization is required to record a transfer.");

        using var req = new HttpRequestMessage(HttpMethod.Post, "api/transactions");
        req.Headers.TryAddWithoutValidation("Authorization", authorizationHeader.Trim());
        req.Content = JsonContent.Create(dto, options: new JsonSerializerOptions(JsonSerializerDefaults.Web));

        HttpResponseMessage resp;
        try
        {
            resp = await _http.SendAsync(req, cancellationToken);
        }
        catch (Exception ex)
        {
            _log.LogError(ex, "Ledger API unreachable");
            return Result<Guid>.Failure("Could not reach the transaction service. Try again shortly.");
        }

        if (!resp.IsSuccessStatusCode)
        {
            var err = await TryReadErrorAsync(resp, cancellationToken);
            return Result<Guid>.Failure(err ?? resp.ReasonPhrase ?? "Transfer failed.");
        }

        await using var stream = await resp.Content.ReadAsStreamAsync(cancellationToken);
        using var doc = await JsonDocument.ParseAsync(stream, cancellationToken: cancellationToken);
        if (!doc.RootElement.TryGetProperty("id", out var idEl))
            return Result<Guid>.Failure("Invalid response from transaction service.");

        return Result<Guid>.Success(idEl.GetGuid());
    }

    private static async Task<string?> TryReadErrorAsync(HttpResponseMessage resp, CancellationToken ct)
    {
        try
        {
            await using var s = await resp.Content.ReadAsStreamAsync(ct);
            using var doc = await JsonDocument.ParseAsync(s, cancellationToken: ct);
            if (doc.RootElement.TryGetProperty("error", out var e))
                return e.GetString();
        }
        catch { /* ignore */ }

        return null;
    }
}
