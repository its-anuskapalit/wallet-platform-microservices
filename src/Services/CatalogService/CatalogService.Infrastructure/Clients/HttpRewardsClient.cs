using System.Net.Http.Json;
using CatalogService.Core.Interfaces;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace CatalogService.Infrastructure.Clients;

/// <summary>
/// Calls RewardsService HTTP API to check available points and deduct after redemption.
/// </summary>
public class HttpRewardsClient : IRewardsClient
{
    private readonly HttpClient _http;
    private readonly ILogger<HttpRewardsClient> _log;

    public HttpRewardsClient(HttpClient http, ILogger<HttpRewardsClient> log)
    {
        _http = http;
        _log  = log;
    }

    public async Task<int> GetAvailablePointsAsync(Guid userId)
    {
        try
        {
            var resp = await _http.GetFromJsonAsync<RewardsDto>($"/api/rewards/account/{userId}");
            return resp?.AvailablePoints ?? 0;
        }
        catch (Exception ex)
        {
            _log.LogWarning("GetAvailablePoints failed for {UserId}: {Error}", userId, ex.Message);
            return 0;
        }
    }

    public async Task<bool> DeductPointsAsync(Guid userId, int points, string description, Guid redemptionId)
    {
        try
        {
            var resp = await _http.PostAsJsonAsync("/api/rewards/deduct", new
            {
                userId,
                points,
                description,
                redemptionId
            });
            return resp.IsSuccessStatusCode;
        }
        catch (Exception ex)
        {
            _log.LogWarning("DeductPoints failed for {UserId}: {Error}", userId, ex.Message);
            return false;
        }
    }

    private sealed record RewardsDto(int AvailablePoints);
}
