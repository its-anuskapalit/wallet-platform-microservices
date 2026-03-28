using Ocelot.DependencyInjection;
using Ocelot.Middleware;
using Serilog;

var builder = WebApplication.CreateBuilder(args);

builder.Configuration
    .AddJsonFile("appsettings.json", optional: false)
    .AddJsonFile("ocelot.json", optional: false, reloadOnChange: true)
    .AddEnvironmentVariables();

Log.Logger = new LoggerConfiguration()
    .ReadFrom.Configuration(builder.Configuration)
    .WriteTo.Console()
    .Enrich.FromLogContext()
    .CreateLogger();

builder.Host.UseSerilog();

builder.Services.AddOcelot();

var app = builder.Build();

app.UseSerilogRequestLogging();

await app.UseOcelot();

await app.RunAsync();