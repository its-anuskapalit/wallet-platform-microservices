using System.Net;
using System.Text.Json;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;

namespace Shared.Common.Middleware;

public class GlobalExceptionMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<GlobalExceptionMiddleware> _logger;

    public GlobalExceptionMiddleware(RequestDelegate next, ILogger<GlobalExceptionMiddleware> logger)
    {
        _next   = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unhandled exception on {Method} {Path}",
                context.Request.Method,
                context.Request.Path);

            await HandleExceptionAsync(context, ex);
        }
    }

    private static Task HandleExceptionAsync(HttpContext context, Exception ex)
    {
        var statusCode = ex switch
        {
            KeyNotFoundException      => HttpStatusCode.NotFound,
            UnauthorizedAccessException => HttpStatusCode.Unauthorized,
            ArgumentException         => HttpStatusCode.BadRequest,
            InvalidOperationException => HttpStatusCode.BadRequest,
            _                         => HttpStatusCode.InternalServerError
        };

        var message = statusCode == HttpStatusCode.InternalServerError
            ? "An unexpected error occurred."
            : ex.Message;

        var response = JsonSerializer.Serialize(new { error = message });

        context.Response.ContentType = "application/json";
        context.Response.StatusCode  = (int)statusCode;

        return context.Response.WriteAsync(response);
    }
}