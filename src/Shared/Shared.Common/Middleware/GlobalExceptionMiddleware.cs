using System.Net;
using System.Text.Json;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
namespace Shared.Common.Middleware;

/// <summary>
/// ASP.NET Core middleware that catches unhandled exceptions from the pipeline,
/// logs them, and writes a structured JSON error response to the client.
/// </summary>
public class GlobalExceptionMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<GlobalExceptionMiddleware> _logger;

    /// <summary>
    /// Initializes a new instance of <see cref="GlobalExceptionMiddleware"/>.
    /// </summary>
    /// <param name="next">The next middleware delegate in the pipeline.</param>
    /// <param name="logger">The logger used to record unhandled exceptions.</param>
    public GlobalExceptionMiddleware(RequestDelegate next, ILogger<GlobalExceptionMiddleware> logger)
    {
        _next   = next;
        _logger = logger;
    }

    /// <summary>
    /// Processes the HTTP request, forwarding it to the next middleware and catching any unhandled exceptions.
    /// </summary>
    /// <param name="context">The current HTTP context.</param>
    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unhandled exception on {Method} {Path}",context.Request.Method,context.Request.Path);
            await HandleExceptionAsync(context, ex);
        }
    }

    /// <summary>
    /// Maps an exception to an appropriate HTTP status code and writes a JSON error payload to the response.
    /// </summary>
    /// <param name="context">The current HTTP context.</param>
    /// <param name="ex">The unhandled exception to convert into an HTTP response.</param>
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

        var message = statusCode == HttpStatusCode.InternalServerError ? "An unexpected error occurred." : ex.Message;
        var response = JsonSerializer.Serialize(new { error = message });
        context.Response.ContentType = "application/json";
        context.Response.StatusCode  = (int)statusCode;
        return context.Response.WriteAsync(response);
    }
}