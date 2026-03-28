using dotenv.net;
using Microsoft.EntityFrameworkCore;
using Microsoft.OpenApi.Models;
using NotificationService.Core.Interfaces;
using NotificationService.Core.Services;
using NotificationService.Infrastructure.Consumers;
using NotificationService.Infrastructure.Data;
using NotificationService.Infrastructure.Email;
using NotificationService.Infrastructure.Repositories;
using Serilog;
using Shared.EventBus;
using Shared.EventBus.Options;

DotEnv.Load();

var builder = WebApplication.CreateBuilder(args);
builder.Configuration.AddEnvironmentVariables();

Log.Logger = new LoggerConfiguration()
    .ReadFrom.Configuration(builder.Configuration)
    .WriteTo.Console()
    .WriteTo.File("logs/notification-.log", rollingInterval: RollingInterval.Day)
    .Enrich.FromLogContext()
    .CreateLogger();
builder.Host.UseSerilog();

var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
builder.Services.AddDbContext<NotificationDbContext>(opt =>
    opt.UseSqlServer(connectionString, sql =>
        sql.EnableRetryOnFailure(5, TimeSpan.FromSeconds(10), null)));

// ── Email ─────────────────────────────────────────────────────────
builder.Services.AddScoped<IEmailSender, GmailSmtpEmailSender>();
builder.Services.AddScoped<NotificationDomainService>();
builder.Services.AddScoped<INotificationRepository, NotificationRepository>();

// ── RabbitMQ ──────────────────────────────────────────────────────
builder.Services.Configure<RabbitMqOptions>(o =>
{
    o.Host     = builder.Configuration["RabbitMq:Host"]!;
    o.Port     = int.Parse(builder.Configuration["RabbitMq:Port"] ?? "5672");
    o.Username = builder.Configuration["RabbitMq:Username"]!;
    o.Password = builder.Configuration["RabbitMq:Password"]!;
});
builder.Services.AddEventBus();
builder.Services.AddHostedService<UserRegisteredConsumer>();
builder.Services.AddHostedService<KycStatusUpdatedConsumer>();
builder.Services.AddHostedService<TransactionCompletedConsumer>();
builder.Services.AddHostedService<TransactionFailedConsumer>();
builder.Services.AddHostedService<WalletFrozenConsumer>();

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo { Title = "WalletPlatform - Notification API", Version = "v1" });
});

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<NotificationDbContext>();
    await db.Database.MigrateAsync();
}

app.UseSwagger();
app.UseSwaggerUI(c => c.SwaggerEndpoint("/swagger/v1/swagger.json", "Notification API v1"));
app.UseSerilogRequestLogging();
app.MapControllers();

await app.RunAsync();