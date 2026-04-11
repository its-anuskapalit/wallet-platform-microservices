using System.Text;
using dotenv.net;
using Shared.Common.Middleware;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using Serilog;
using Shared.EventBus;
using Shared.EventBus.Options;
using WalletService.Core.Interfaces;
using WalletService.Core.Services;
using WalletService.Infrastructure.Consumers;
using WalletService.Infrastructure.Data;
using WalletService.Infrastructure.Repositories;
using WalletService.Infrastructure.Clients;
using WalletService.Core.Entities;

DotEnv.Load();

var builder = WebApplication.CreateBuilder(args);
builder.Configuration.AddEnvironmentVariables();

Log.Logger = new LoggerConfiguration()
    .ReadFrom.Configuration(builder.Configuration)
    .WriteTo.Console()
    .WriteTo.File("logs/wallet-.log", rollingInterval: RollingInterval.Day)
    .Enrich.FromLogContext()
    .CreateLogger();
builder.Host.UseSerilog();

var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
builder.Services.AddDbContext<WalletDbContext>(opt =>
    opt.UseSqlServer(connectionString, sql =>
        sql.EnableRetryOnFailure(5, TimeSpan.FromSeconds(10), null)));

var jwtKey = builder.Configuration["Jwt:Key"]!;
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(opt =>
    {
        opt.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey         = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),
            ValidateIssuer           = true,
            ValidIssuer              = builder.Configuration["Jwt:Issuer"],
            ValidateAudience         = true,
            ValidAudience            = builder.Configuration["Jwt:Audience"],
            ValidateLifetime         = true,
            ClockSkew                = TimeSpan.Zero
        };
    });

builder.Services.AddAuthorization();

builder.Services.AddScoped<IWalletRepository, WalletRepository>();
builder.Services.AddScoped<IIdempotencyRepository, IdempotencyRepository>();
builder.Services.AddScoped<IWalletService, WalletDomainService>();
builder.Services.AddScoped<IBillSplitRepository, BillSplitRepository>();
builder.Services.AddScoped<IBillSplitService, BillSplitDomainService>();

builder.Services.AddHttpClient<ILedgerClient, LedgerApiClient>((sp, client) =>
{
    var baseUrl = sp.GetRequiredService<IConfiguration>()["Ledger:BaseUrl"] ?? "http://localhost:5004";
    client.BaseAddress = new Uri(baseUrl.TrimEnd('/') + "/");
    client.Timeout     = TimeSpan.FromSeconds(45);
});

builder.Services.Configure<RabbitMqOptions>(o =>
{
    o.Host     = builder.Configuration["RabbitMq:Host"]!;
    o.Port     = int.Parse(builder.Configuration["RabbitMq:Port"] ?? "5672");
    o.Username = builder.Configuration["RabbitMq:Username"]!;
    o.Password = builder.Configuration["RabbitMq:Password"]!;
});
builder.Services.AddEventBus();
builder.Services.AddHostedService<UserRegisteredConsumer>();
builder.Services.AddHostedService<TransactionCompletedConsumer>();

builder.Services.AddControllers()
    .AddJsonOptions(o => o.JsonSerializerOptions.Converters.Add(new System.Text.Json.Serialization.JsonStringEnumConverter()));
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo { Title = "WalletPlatform - Wallet API", Version = "v1" });
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name         = "Authorization",
        Type         = SecuritySchemeType.Http,
        Scheme       = "Bearer",
        BearerFormat = "JWT",
        In           = ParameterLocation.Header,
        Description  = "Enter your JWT token"
    });
    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id   = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<WalletDbContext>();
    await db.Database.MigrateAsync();
}

app.UseSwagger();
app.UseSwaggerUI(c => c.SwaggerEndpoint("/swagger/v1/swagger.json", "Wallet API v1"));
app.UseMiddleware<GlobalExceptionMiddleware>();
app.UseSerilogRequestLogging();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

await app.RunAsync();