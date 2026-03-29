using System.Text;
using AuthService.Core.Interfaces;
using AuthService.Core.Services;
using AuthService.Infrastructure.Data;
using AuthService.Infrastructure.Repositories;
using dotenv.net;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using Serilog;
using Shared.Common.Middleware;
using Shared.EventBus;
using Shared.EventBus.Options;

// ── Load .env into environment variables ──────────────────────────
DotEnv.Load();

var builder = WebApplication.CreateBuilder(args);

// Pull .env values into configuration
builder.Configuration.AddEnvironmentVariables();

// ── Serilog ───────────────────────────────────────────────────────
Log.Logger = new LoggerConfiguration()
    .ReadFrom.Configuration(builder.Configuration)
    .WriteTo.Console()
    .WriteTo.File("logs/auth-.log", rollingInterval: RollingInterval.Day)
    .Enrich.FromLogContext()
    .CreateLogger();

builder.Host.UseSerilog();

// ── Database ──────────────────────────────────────────────────────
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
builder.Services.AddDbContext<AuthDbContext>(opt =>
    opt.UseSqlServer(connectionString, sql =>
        sql.EnableRetryOnFailure(
            maxRetryCount:     5,
            maxRetryDelay:     TimeSpan.FromSeconds(10),
            errorNumbersToAdd: null)));

// ── JWT ───────────────────────────────────────────────────────────
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

// ── Repositories ──────────────────────────────────────────────────
builder.Services.AddScoped<IUserRepository, UserRepository>();

// ── Services ──────────────────────────────────────────────────────
builder.Services.AddScoped<IAuthService, AuthDomainService>();
builder.Services.AddScoped<ITokenService, TokenService>();

// ── RabbitMQ ──────────────────────────────────────────────────────
builder.Services.Configure<RabbitMqOptions>(o =>
{
    o.Host     = builder.Configuration["RabbitMq:Host"]!;
    o.Port     = int.Parse(builder.Configuration["RabbitMq:Port"] ?? "5672");
    o.Username = builder.Configuration["RabbitMq:Username"]!;
    o.Password = builder.Configuration["RabbitMq:Password"]!;
});
builder.Services.AddEventBus();

// ── Controllers & Swagger ─────────────────────────────────────────
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo { Title = "WalletPlatform - Auth API", Version = "v1" });
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

// ── Auto migrate ──────────────────────────────────────────────────
if (app.Environment.IsDevelopment())
{
    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<AuthDbContext>();
    await db.Database.MigrateAsync();
}

// ── Pipeline ──────────────────────────────────────────────────────
app.UseSwagger();
app.UseSwaggerUI(c => c.SwaggerEndpoint("/swagger/v1/swagger.json", "Auth API v1"));
app.UseMiddleware<GlobalExceptionMiddleware>();
app.UseSerilogRequestLogging();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

await app.RunAsync();