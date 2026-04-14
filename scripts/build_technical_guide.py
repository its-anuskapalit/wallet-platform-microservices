# -*- coding: utf-8 -*-
"""
Build WalletPlatform_Technical_Guide.html from canonical src/ tree.
Excludes: bin, obj, .vs, .git, .claude, and any path segment .claude
"""

from __future__ import annotations

import html
import os
import re
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "src"
# Primary handoff document (overwrite for full technical guide)
OUT = ROOT / "WalletPlatform_Architecture_Documentation.html"

SKIP_DIR_NAMES = frozenset({"bin", "obj", ".vs", ".git", "node_modules"})
TEXT_EXT = frozenset({".cs", ".csproj", ".json", ".http", ".props", ".targets"})
PYTHON_ROOTS = ("chatbot_service", "investigation_copilot")


def walk_src_files():
    for dp, dns, fns in os.walk(SRC):
        dns[:] = [d for d in sorted(dns) if d not in SKIP_DIR_NAMES and d != ".claude"]
        parts = Path(dp).parts
        if ".claude" in parts:
            continue
        for fn in sorted(fns):
            p = Path(dp) / fn
            if any(x in p.parts for x in ("bin", "obj")):
                continue
            if fn.startswith("."):
                continue
            suf = p.suffix.lower()
            if suf not in TEXT_EXT and fn not in ("Directory.Build.props",):
                continue
            yield p


def walk_python_files():
    """Optional FastAPI assistants at repo root (no .venv)."""
    for dirname in PYTHON_ROOTS:
        base = ROOT / dirname
        if not base.is_dir():
            continue
        for p in sorted(base.rglob("*.py")):
            if ".venv" in p.parts or "__pycache__" in p.parts:
                continue
            yield p


def service_key(relpath: Path) -> str:
    parts = relpath.parts
    if parts[0] == "Shared":
        return "Shared/" + parts[1] if len(parts) > 1 else "Shared"
    if parts[0] == "Gateway":
        return "Gateway/" + parts[1] if len(parts) > 1 else "Gateway"
    if parts[0] == "Services" and len(parts) > 1:
        return parts[1]
    return parts[0]


def service_key_for_path(abs_path: Path) -> str:
    rel = abs_path.relative_to(ROOT)
    if rel.parts and rel.parts[0] in PYTHON_ROOTS:
        return "Python / " + rel.parts[0]
    return service_key(rel.relative_to(SRC))


def extract_api_routes(text: str) -> list[tuple[str, str]]:
    """Return list of (http_method, route) from Controller files."""
    routes: list[tuple[str, str]] = []
    cr = ""
    m = re.search(r'\[Route\(\s*["\']([^"\']*)["\']\s*\)\]', text)
    if m:
        cr = m.group(1).strip().strip("/")
    for m in re.finditer(
        r"\[(HttpGet|HttpPost|HttpPut|HttpDelete|HttpPatch)"
        r'(?:\(\s*["\']([^"\']*)["\']\s*\))?\s*\]',
        text,
    ):
        raw_meth, sub = m.group(1), m.group(2)
        meth = raw_meth.replace("Http", "").upper()
        sub = (sub or "").strip().strip("/")
        if cr and sub:
            full = f"{cr}/{sub}"
        elif cr:
            full = f"{cr}/{sub}" if sub else cr
        else:
            full = sub or "(see Route on controller)"
        routes.append((meth, full))
    return routes


def extract_declarations(text: str) -> list[str]:
    out = []
    for pat, label in [
        (r"^\s*namespace\s+([\w.]+)", "namespace"),
        (r"^\s*(?:public\s+)?(?:partial\s+)?(?:class|interface|struct|enum|record)\s+(\w+)", "type"),
        (r"^\s*public\s+(?:async\s+)?(?:Task|ValueTask|<)[^\s(]+\s+(\w+)\s*\(", "method"),
    ]:
        for m in re.finditer(pat, text, re.MULTILINE):
            out.append(m.group(1))
    return out[:40]


def line_walkthrough(lines: list[str], path: Path | None = None) -> str:
    """Group consecutive lines into summarized rows (not one row per physical line)."""
    if not lines:
        return "<p><em>Empty file.</em></p>"
    rows: list[tuple[str, str]] = []
    i = 0
    n = len(lines)

    def flush(kind: str, buf: list[str], start: int, end: int):
        snippet = html.escape("\n".join(buf)[:220])
        if len("\n".join(buf)) > 220:
            snippet += "…"
        rows.append(
            (
                f"{start + 1}–{end + 1}",
                f"<strong>{kind}</strong>. <code>{snippet}</code>",
            )
        )

    while i < n:
        ln = lines[i]
        stripped = ln.strip()
        if not stripped:
            i += 1
            continue
        py = path and path.suffix.lower() == ".py"
        # Python import block
        if py and (stripped.startswith("import ") or stripped.startswith("from ")):
            start = i
            buf = []
            while i < n and (
                lines[i].strip().startswith("import ")
                or lines[i].strip().startswith("from ")
            ):
                buf.append(lines[i].strip())
                i += 1
            flush("Imports (standard/third-party/local)", buf, start, i - 1)
            continue
        # usings block
        if stripped.startswith("using ") and stripped.endswith(";"):
            start = i
            buf = []
            while i < n and lines[i].strip().startswith("using "):
                buf.append(lines[i].strip())
                i += 1
            flush("Import directives (namespaces / aliases)", buf, start, i - 1)
            continue
        # file-scoped comment block
        if stripped.startswith("///") or stripped.startswith("//") or stripped.startswith("/*"):
            start = i
            buf = []
            while i < n and (
                lines[i].strip().startswith("///")
                or lines[i].strip().startswith("//")
                or lines[i].strip().startswith("*")
                or lines[i].strip().startswith("/*")
            ):
                buf.append(lines[i].rstrip()[:120])
                i += 1
            if buf:
                flush("Documentation or comments", buf, start, i - 1)
            continue
        # namespace line
        if stripped.startswith("namespace "):
            flush("Namespace declaration", [stripped], i, i)
            i += 1
            continue
        # attribute
        if stripped.startswith("["):
            start = i
            buf = [stripped]
            i += 1
            while i < n and lines[i].strip().startswith("["):
                buf.append(lines[i].strip())
                i += 1
            flush("Attributes / metadata", buf, start, i - 1)
            continue
        # default: accumulate until blank or brace level change — chunk ~12 lines
        start = i
        buf = []
        chunk = 0
        while i < n and chunk < 18:
            if lines[i].strip() == "" and buf:
                break
            buf.append(lines[i].rstrip()[:200])
            i += 1
            chunk += 1
            if i < n and lines[i].strip() == "":
                break
        kind = "Implementation block"
        joined = "\n".join(buf)
        if "class " in joined or "interface " in joined:
            kind = "Type or member declaration"
        if "DbContext" in joined:
            kind = "EF Core DbContext / mapping"
        if "IEventPublisher" in joined or "BaseConsumer" in joined:
            kind = "Messaging / event bus"
        flush(kind, buf, start, min(i - 1, n - 1))

    body = ["<table class='walkthrough'><thead><tr><th>Lines</th><th>What this section does</th></tr></thead><tbody>"]
    for a, b in rows[:80]:
        body.append(f"<tr><td class='ln'>{html.escape(a)}</td><td>{b}</td></tr>")
    if len(rows) > 80:
        body.append(
            f"<tr><td colspan='2'><em>… {len(rows) - 80} more grouped sections (file is large). "
            "Read the full source in the block below.</em></td></tr>"
        )
    body.append("</tbody></table>")
    return "\n".join(body)


def file_purpose(path: Path, text: str) -> str:
    rel = path.relative_to(ROOT)
    name = path.name
    low = name.lower()
    bits = [f"<p><strong>Path:</strong> <code>{html.escape(str(rel))}</code></p>"]
    if low == "program.cs":
        bits.append("<p>Application entrypoint: builds the web host, registers services (DI), configures JWT, EF Core, Swagger, middleware pipeline, and starts Kestrel.</p>")
    elif low.endswith("controller.cs"):
        bits.append("<p>ASP.NET Core API controller: maps HTTP routes to actions, parses route/query/body into DTOs, calls application services, returns HTTP results.</p>")
    elif "dbcontext" in low:
        bits.append("<p>Entity Framework Core database context: maps entity classes to tables and configures relationships, indexes, and conventions for this service database.</p>")
    elif "repository" in low and path.suffix == ".cs":
        bits.append("<p>Data access implementation: encapsulates queries and persistence against the DbContext so Core services do not reference EF types directly via interfaces.</p>")
    elif "migrations" in str(path).lower():
        bits.append("<p>EF Core migration: incremental schema changes (Up/Down) applied to the SQL Server database for this bounded context.</p>")
    elif "consumer" in low:
        bits.append("<p>Background RabbitMQ consumer: extends BaseConsumer, binds queue to exchange/routing key, deserializes events, invokes domain logic idempotently.</p>")
    elif "middleware" in low:
        bits.append("<p>ASP.NET Core middleware: participates in the request pipeline (here, global exception handling).</p>")
    elif path.suffix == ".csproj":
        bits.append("<p>MSBuild project file: target framework, package references, project references, and compile settings.</p>")
    elif ".Tests" in str(path).replace("\\", "/"):
        bits.append("<p>Automated test project (typically xUnit + Moq): validates domain services and integration boundaries.</p>")
    elif "appsettings" in low:
        bits.append("<p>JSON configuration: connection strings, JWT settings, RabbitMQ, logging, and feature flags; overridden by environment variables and User Secrets in dev.</p>")
    elif "ocelot" in low:
        bits.append("<p>Ocelot route table: maps upstream gateway paths to downstream microservice URLs for API aggregation.</p>")
    elif low.endswith(".py"):
        bits.append("<p>Python module: FastAPI app, Gemini integration, RAG helpers, or tooling. Run with uvicorn per service README.</p>")
    else:
        decls = extract_declarations(text)
        if decls:
            bits.append("<p><strong>Notable symbols:</strong> " + html.escape(", ".join(decls[:25])) + ("…" if len(decls) > 25 else "") + "</p>")
    routes = extract_api_routes(text) if "Controller" in name else []
    if routes:
        bits.append("<p><strong>HTTP routes in this controller:</strong></p><ul>")
        for m, r in routes[:50]:
            bits.append(f"<li><code>{html.escape(m)}</code> → <code>/{html.escape(r.lstrip('/'))}</code></li>")
        bits.append("</ul>")
    return "\n".join(bits)


def main():
    files = sorted(walk_src_files(), key=lambda p: str(p))
    py_files = sorted(walk_python_files(), key=lambda p: str(p))
    all_files = files + py_files
    by_svc: dict[str, list[Path]] = defaultdict(list)
    for p in files:
        rel = p.relative_to(SRC)
        by_svc[service_key(rel)].append(p)
    for p in py_files:
        by_svc[service_key_for_path(p)].append(p)

    # Order services: Shared*, Gateway, dotnet Services, Python last
    def sort_key(name: str):
        if name.startswith("Shared"):
            return (0, name)
        if name.startswith("Gateway"):
            return (1, name)
        if name.startswith("Python"):
            return (3, name)
        return (2, name)

    ordered_services = sorted(by_svc.keys(), key=sort_key)

    parts: list[str] = []
    parts.append("<!DOCTYPE html>")
    parts.append('<html lang="en"><head><meta charset="utf-8"/>')
    parts.append('<meta name="viewport" content="width=device-width, initial-scale=1"/>')
    parts.append("<title>WalletPlatform — Complete Technical Guide (Generated)</title>")
    parts.append(
        "<link rel=\"stylesheet\" href=\"https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/themes/prism-tomorrow.min.css\"/>"
    )
    parts.append(STYLE)
    parts.append("</head><body>")
    parts.append("<header><div class='wrap'>")
    parts.append("<h1>WalletPlatform — Technical Guide</h1>")
    parts.append(
        "<p class='lead'>Auto-generated from <code>src/</code> (excluding <code>bin</code>, <code>obj</code>, <code>.claude</code> worktrees). "
        "Includes full source with Prism.js highlighting and section-by-section walkthroughs. "
        f"<strong>{len(all_files)}</strong> files documented (backend <code>src/</code> plus Python assistants).</p>"
    )
    parts.append("</div></header>")

    # TOC
    parts.append("<nav class='toc' id='toc'><div class='wrap'>")
    parts.append("<strong>Sections:</strong> ")
    parts.append('<a href="#s1">1. Overview</a> · ')
    parts.append('<a href="#s2">2. Architecture</a> · ')
    parts.append('<a href="#s3">3. Folder structure</a> · ')
    parts.append('<a href="#s4">4. Services</a> · ')
    parts.append('<a href="#s5">5. API flow</a> · ')
    parts.append('<a href="#s6">6. Database</a> · ')
    parts.append('<a href="#s7">7. Security</a> · ')
    parts.append('<a href="#s8">8. Configuration</a> · ')
    parts.append('<a href="#s9">9. Conclusion</a>')
    parts.append("</div></nav>")

    parts.append("<main class='wrap'>")

    # --- 1 Overview ---
    parts.append(SECTION1)
    parts.append(SECTION2_DIAGRAM)
    parts.append(SECTION3_FOLDER)

    # --- 4 Service by service ---
    parts.append("<section id='s4'><h2>4. Service-by-service documentation</h2>")
    parts.append(
        "<p>Each subsection lists every file in that module area (all of <code>src/</code>, plus <code>chatbot_service/</code> and <code>investigation_copilot/</code> Python sources). "
        "Per file: purpose summary, grouped walkthrough, then full source with Prism highlighting.</p>"
    )
    parts.append("<p><strong>Jump to area:</strong> ")
    parts.append(" · ".join(f'<a href="#svc-{re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")}">{html.escape(s)}</a>' for s in sorted(by_svc.keys(), key=sort_key)))
    parts.append("</p>")

    for idx, svc in enumerate(ordered_services, start=1):
        svc_files = by_svc[svc]
        sid = re.sub(r"[^a-z0-9]+", "-", svc.lower()).strip("-")
        parts.append(f"<section class='service' id='svc-{sid}'><h3>4.{idx} {html.escape(svc)}</h3>")
        parts.append(f"<p><strong>Purpose:</strong> {service_blurb(svc)}</p>")
        parts.append("<h4>Folder structure (files included below)</h4><ul class='file-list'>")
        for fp in svc_files:
            rel = fp.relative_to(ROOT)
            parts.append(f"<li><a href='#f-{file_anchor(rel)}'>{html.escape(str(rel))}</a></li>")
        parts.append("</ul>")

        for fp in svc_files:
            rel = fp.relative_to(ROOT)
            anchor = file_anchor(rel)
            try:
                text = fp.read_text(encoding="utf-8")
            except Exception as e:
                text = f"/* Could not read file: {e} */\n"
            lines = text.splitlines()
            parts.append(f"<article class='file-block' id='f-{anchor}'>")
            parts.append(f"<h5>{html.escape(str(rel))}</h5>")
            parts.append(file_purpose(fp, text))
            parts.append("<details open><summary>Section-by-section walkthrough (grouped lines)</summary>")
            parts.append(line_walkthrough(lines, fp))
            parts.append("</details>")
            parts.append("<details open><summary>Complete source</summary>")
            suf = fp.suffix.lower()
            if suf == ".json":
                lang = "json"
            elif suf == ".http":
                lang = "http"
            elif suf == ".csproj":
                lang = "markup"
            elif suf == ".py":
                lang = "python"
            else:
                lang = "csharp"
            parts.append(f'<pre><code class="language-{lang}">{html.escape(text)}</code></pre>')
            parts.append("</details>")
            parts.append("</article>")

        parts.append("</section>")

    parts.append("</section>")  # end #s4

    parts.append(SECTION5_FLOW)
    parts.append(SECTION6_DB)
    parts.append(SECTION7_SECURITY)
    parts.append(SECTION8_CONFIG)
    parts.append(SECTION9_CONCLUSION)

    parts.append("</main>")
    parts.append(
        '<script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/prism.min.js"></script>'
        '<script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-csharp.min.js"></script>'
        '<script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-json.min.js"></script>'
        '<script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-python.min.js"></script>'
        '<script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-markup.min.js"></script>'
    )
    parts.append("</body></html>")

    OUT.write_text("\n".join(parts), encoding="utf-8")
    print(f"Wrote {OUT} ({len(all_files)} files)")


def file_anchor(rel: Path) -> str:
    s = str(rel).replace("\\", "-").replace("/", "-")
    s = re.sub(r"[^a-zA-Z0-9._-]+", "-", s)
    return s[:180]


def service_blurb(svc: str) -> str:
    blurbs = {
        "Shared.Common": "Cross-cutting types: Result pattern, base entities, global exception middleware, pagination.",
        "Shared.Contracts": "Event DTOs and RabbitMQ exchange/queue name constants shared by all services.",
        "Shared.EventBus": "RabbitMQ publisher abstraction and BaseConsumer for subscribers.",
        "Gateway/ApiGateway": "Ocelot reverse proxy configuration and host wiring.",
        "Python / chatbot_service": "FastAPI microservice: Gemini chat for end users (WalletBot), CORS for Angular, /api/chat + /health.",
        "Python / investigation_copilot": "FastAPI microservice: RAG over Markdown knowledge, Gemini planner/synthesis, read-only calls to Ocelot with forwarded JWT.",
    }
    if svc in blurbs:
        return blurbs[svc]
    if svc.endswith("Service") or "Service" in svc:
        return f"Microservice vertical for {svc.replace('Service','').replace('_',' ')}: Clean Architecture (API / Core / Infrastructure) with its own SQL Server database."
    return f"Project area: {svc}."


STYLE = """
<style>
:root { --bg:#0d1117; --card:#161b22; --text:#e6edf3; --muted:#8b949e; --acc:#58a6ff; --border:#30363d; }
* { box-sizing: border-box; }
body { margin:0; font-family: 'Segoe UI',system-ui,sans-serif; background:var(--bg); color:var(--text); line-height:1.55; font-size:14px; }
.wrap { max-width:960px; margin:0 auto; padding:0 1.25rem 3rem; }
header { background:linear-gradient(160deg,#161b22,#0d1117); border-bottom:1px solid var(--border); padding:2rem 0; }
h1 { margin:0 0 .5rem; font-size:1.6rem; }
.lead { color:var(--muted); margin:0; max-width:55rem; }
h2 { font-size:1.25rem; margin-top:2.2rem; padding-bottom:.35rem; border-bottom:1px solid var(--border); scroll-margin-top:4rem; }
h3 { font-size:1.1rem; color:#c9d1d9; margin-top:1.5rem; }
h4 { font-size:1rem; color:var(--muted); }
h5 { font-family:ui-monospace,monospace; font-size:.85rem; color:var(--acc); margin:1.5rem 0 .5rem; }
a { color:var(--acc); text-decoration:none; } a:hover { text-decoration:underline; }
nav.toc { position:sticky; top:0; z-index:50; background:rgba(13,17,23,.92); backdrop-filter:blur(10px); border-bottom:1px solid var(--border); padding:.65rem 1rem; font-size:.88rem; }
pre { margin:.75rem 0; padding:1rem; overflow:auto; border:1px solid var(--border); border-radius:6px; background:#0d1117 !important; font-size:12px; line-height:1.45; }
code { font-family:Consolas,'Cascadia Code',monospace; font-size:12px; }
article.file-block { border:1px solid var(--border); border-radius:8px; padding:0 1rem 1rem; margin:1.25rem 0; background:var(--card); }
details { margin:.5rem 0; }
summary { cursor:pointer; color:var(--acc); font-weight:600; }
table.walkthrough { width:100%; border-collapse:collapse; font-size:12px; margin:.5rem 0; }
table.walkthrough th, table.walkthrough td { border:1px solid var(--border); padding:.35rem .5rem; vertical-align:top; }
td.ln { white-space:nowrap; color:var(--muted); width:5.5rem; }
ul.file-list { columns:2; font-size:12px; }
.diagram { background:#0d1117; border:1px solid var(--border); padding:1rem; border-radius:6px; overflow:auto; font-family:monospace; font-size:11px; white-space:pre; line-height:1.35; }
.note { border-left:3px solid var(--acc); padding:.6rem .9rem; background:#161b22; margin:1rem 0; font-size:13px; }
.service { margin-bottom:2rem; }
</style>
"""

SECTION1 = """
<section id='s1'><h2>1. Project overview</h2>
<p>WalletPlatform (Aurelian) is a multi-service fintech backend: <strong>ASP.NET Core microservices</strong>, <strong>Ocelot</strong> gateway,
<strong>RabbitMQ</strong> integration events, <strong>SQL Server</strong> (one database per service), and optional <strong>Python</strong> AI assistants.</p>
<p>This document is generated from the repository so it stays aligned with code. Read sections 5–8 for conceptual flow; section 4 is the full source catalog.</p>
</section>
"""

SECTION2_DIAGRAM = """
<section id='s2'><h2>2. Architecture diagram</h2>
<div class='diagram'>
Browser/SPA (Angular) ──HTTP JSON──▶ ApiGateway (Ocelot) :5000 ──proxy──▶ Microservices :5001–5009
                                                                              │
         ┌────────────────────────────────────────────────────────────────────┘
         │  Each service: Controllers ──DTO──▶ Domain Service ──▶ Repository ──▶ EF Core ──▶ SQL DB
         │
         └──── async domain events ────▶ RabbitMQ ────▶ Consumers (other services)
</div>
<p class='note'>JWT validation happens <em>inside each microservice</em> that protects endpoints; the gateway primarily routes traffic and forwards the <code>Authorization</code> header.</p>
</section>
"""

SECTION3_FOLDER = """
<section id='s3'><h2>3. Folder structure (<code>src/</code>)</h2>
<ul>
<li><code>src/Shared/</code> — Shared.Common, Shared.Contracts, Shared.EventBus (reusable libraries).</li>
<li><code>src/Gateway/ApiGateway/</code> — Ocelot host + <code>ocelot.json</code>.</li>
<li><code>src/Services/*/</code> — Each service: <code>*Service.API</code>, <code>*Service.Core</code>, <code>*Service.Infrastructure</code>, <code>*Service.Tests</code>.</li>
</ul>
</section>
"""

SECTION5_FLOW = """
<section id='s5'><h2>5. Backend API flow and data lifecycle</h2>
<h3>5.1 Synchronous request path</h3>
<div class='diagram'>
Client Request
     │
     ▼
┌─────────────┐    Route + model binding    ┌──────────────┐
│ Controller  │ ───────────────────────────▶ │ Input DTOs   │
└──────┬──────┘                               └──────────────┘
       │ calls I*Service methods
       ▼
┌─────────────┐   business rules, Result&lt;T&gt;   ┌──────────────┐
│  Service    │ ────────────────────────────▶ │ Entities     │
└──────┬──────┘                               └──────────────┘
       │ uses abstraction
       ▼
┌─────────────┐   EF Core queries / commands  ┌──────────────┐
│ Repository  │ ───────────────────────────▶ │  DbContext   │ ──▶ SQL Server
└─────────────┘                               └──────────────┘
       │
       ▼
 Response DTO ← map from entities / Result — JSON returned to client
</div>
<h3>5.2 Event-driven path</h3>
<p>After a service commits its transaction, it may publish to RabbitMQ. Another service’s hosted <code>BaseConsumer&lt;T&gt;</code> receives the message,
deserializes the payload, runs application logic in a DI scope, and ACKs/NACKs. This path is <strong>eventually consistent</strong> with the HTTP request.</p>
</section>
"""

SECTION6_DB = """
<section id='s6'><h2>6. Database design (per service)</h2>
<p>Each microservice owns its database (bounded context). EF Core <code>DbContext</code> classes live in Infrastructure; schema evolution is tracked under <code>Migrations/</code>.
Look for <code>*DbContext.cs</code> and migration timestamps in section 4 for exact tables and columns.</p>
<table>
<thead><tr><th>Service DB (typical name)</th><th>Purpose</th></tr></thead>
<tbody>
<tr><td>WalletPlatform_Auth</td><td>Users, refresh tokens, OTP</td></tr>
<tr><td>WalletPlatform_UserProfile</td><td>Profiles, KYC records</td></tr>
<tr><td>WalletPlatform_Wallet</td><td>Wallets, idempotency keys</td></tr>
<tr><td>WalletPlatform_Ledger</td><td>Transactions, ledger entries</td></tr>
<tr><td>WalletPlatform_Rewards</td><td>Points accounts, history</td></tr>
<tr><td>WalletPlatform_Catalog</td><td>Catalog items, redemptions</td></tr>
<tr><td>WalletPlatform_Notification</td><td>Notification log (if persisted)</td></tr>
<tr><td>WalletPlatform_Receipts</td><td>Receipt metadata / storage</td></tr>
<tr><td>WalletPlatform_Admin</td><td>Admin/fraud entities</td></tr>
</tbody>
</table>
</section>
"""

SECTION7_SECURITY = """
<section id='s7'><h2>7. Middleware and security</h2>
<ul>
<li><strong>Authentication:</strong> JWT bearer — tokens issued by AuthService; all APIs share signing key, issuer, audience in configuration.</li>
<li><strong>Authorization:</strong> Role claims (User/Admin) on endpoints via <code>[Authorize]</code>.</li>
<li><strong>GlobalExceptionMiddleware</strong> (Shared.Common): maps unhandled exceptions to JSON Problems-style responses.</li>
<li><strong>CORS:</strong> Gateway allows Angular dev origin; tune for production.</li>
</ul>
</section>
"""

SECTION8_CONFIG = """
<section id='s8'><h2>8. Configuration files</h2>
<p>Each API uses <code>appsettings.json</code> + environment variables (<code>ASPNETCORE_*</code>, <code>ConnectionStrings__*</code>, <code>Jwt__*</code>, <code>RabbitMq__*</code>) and often <code>dotenv</code> loading in <code>Program.cs</code>.
Gateway uses <code>ocelot.json</code> for routing. Search section 4 for filenames.</p>
</section>
"""

SECTION9_CONCLUSION = """
<section id='s9'><h2>9. Conclusion</h2>
<p>This guide embeds the canonical backend source under <code>src/</code> with grouped explanations suitable for onboarding and audits.
Regenerate after large refactors by running <code>python scripts/build_technical_guide.py</code> from the repository root.</p>
</section>
"""


if __name__ == "__main__":
    main()

