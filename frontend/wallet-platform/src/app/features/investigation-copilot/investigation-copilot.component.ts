import { Component, signal, ViewChild, ElementRef, AfterViewChecked, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../core/services/auth.service';

interface CopilotMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  toolsUsed?: string[];
  ragChunksUsed?: number;
}

interface InvestigateResponse {
  reply: string;
  rag_chunks_used: number;
  tools_used: string[];
}

@Component({
  selector: 'app-investigation-copilot',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe],
  template: `
    <div class="inv-page page-enter">
      <div class="page-header">
        <p class="label-sm text-muted">ADMIN · AI</p>
        <h1 class="headline-lg">Investigation Copilot</h1>
      </div>

      <div class="inv-shell card">
        <div class="inv-toolbar">
          <button type="button" class="btn btn-secondary btn-sm" (click)="clear()" [disabled]="loading()">
            Clear conversation
          </button>
          @if (lastHealth()) {
            <span class="health-pill" [class.ok]="lastHealth()?.ai_configured">
              AI: {{ lastHealth()?.ai_configured ? 'ready' : 'not configured' }}
              · RAG chunks: {{ lastHealth()?.rag_chunks_indexed ?? '—' }}
            </span>
          }
        </div>

        <div class="inv-messages" #scrollBox>
          @if (messages().length === 0) {
            <div class="empty">
              <p class="title-md">Ask by email, transaction GUID, or fraud triage</p>
              <p class="body-md text-muted">Examples:</p>
              <ul class="examples">
                @for (ex of examples; track ex) {
                  <li><button type="button" class="linkish" (click)="useExample(ex)">{{ ex }}</button></li>
                }
              </ul>
            </div>
          }

          @for (msg of messages(); track $index) {
            <div class="msg" [class.user]="msg.role === 'user'" [class.assistant]="msg.role === 'assistant'">
              <div class="msg-meta">{{ msg.role === 'user' ? 'You' : 'Copilot' }} · {{ msg.timestamp | date:'medium' }}</div>
              <div class="msg-body" [innerHTML]="formatMessage(msg.content)"></div>
              @if (msg.role === 'assistant' && (msg.toolsUsed?.length || msg.ragChunksUsed != null)) {
                <div class="msg-foot">
                  @if (msg.ragChunksUsed != null) {
                    <span>KB chunks: {{ msg.ragChunksUsed }}</span>
                  }
                  @if (msg.toolsUsed && msg.toolsUsed.length > 0) {
                    <span>Tools: {{ msg.toolsUsed.join(', ') }}</span>
                  }
                </div>
              }
            </div>
          }

          @if (loading()) {
            <div class="msg assistant">
              <div class="msg-meta">Copilot</div>
              <div class="typing"><span></span><span></span><span></span></div>
            </div>
          }
        </div>

        <div class="inv-input">
          <textarea
            #inputEl
            rows="2"
            class="input"
            [(ngModel)]="inputText"
            placeholder="e.g. Investigate yash@test.com — profile, KYC, wallet, rewards…"
            (keydown.ctrl.enter)="send()"
            (keydown.meta.enter)="send()"
            [disabled]="loading()"
          ></textarea>
          <button type="button" class="btn btn-primary send-btn" (click)="send()" [disabled]="!inputText.trim() || loading()">
            @if (loading()) { <span>Working…</span> } @else { <span>Investigate</span> }
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .inv-page { max-width: 920px; margin: 0 auto; }
    .page-header { margin-bottom: 20px; }
    .inv-shell { padding: 0; overflow: hidden; display: flex; flex-direction: column; min-height: 480px; }
    .inv-toolbar {
      display: flex; align-items: center; justify-content: space-between; gap: 12px;
      padding: 12px 16px; border-bottom: 1px solid var(--outline-variant);
    }
    .health-pill { font-size: 12px; color: var(--on-surface-variant); }
    .health-pill.ok { color: var(--primary); }
    .inv-messages {
      flex: 1; overflow-y: auto; padding: 16px; max-height: min(60vh, 560px);
      display: flex; flex-direction: column; gap: 14px;
    }
    .empty { padding: 24px 8px; text-align: center; }
    .examples { text-align: left; max-width: 560px; margin: 12px auto 0; color: var(--on-surface-variant); font-size: 14px; }
    .linkish {
      background: none; border: none; padding: 0; color: var(--primary); cursor: pointer; text-decoration: underline;
      font: inherit; text-align: left;
    }
    .msg { padding: 12px 14px; border-radius: var(--radius-md); background: var(--surface-container-low); }
    .msg.user { background: var(--primary-fixed); margin-left: 48px; }
    .msg.assistant { margin-right: 48px; border: 1px solid var(--outline-variant); }
    .msg-meta { font-size: 11px; color: var(--on-surface-variant); margin-bottom: 8px; }
    .msg-body { font-size: 14px; line-height: 1.55; color: var(--on-surface); }
    .msg-body :deep(ul) { margin: 8px 0 0 18px; }
    .msg-foot { margin-top: 10px; font-size: 11px; color: var(--on-surface-variant); display: flex; flex-wrap: wrap; gap: 10px; }
    .typing { display: flex; gap: 4px; padding: 8px 0; }
    .typing span {
      width: 6px; height: 6px; border-radius: 50%; background: var(--on-surface-variant);
      animation: bounce 1.2s infinite ease-in-out;
    }
    .typing span:nth-child(2) { animation-delay: 0.15s; }
    .typing span:nth-child(3) { animation-delay: 0.3s; }
    @keyframes bounce { 0%, 80%, 100% { opacity: 0.3; transform: translateY(0); } 40% { opacity: 1; transform: translateY(-4px); } }
    .inv-input {
      display: flex; gap: 12px; align-items: flex-end; padding: 12px 16px;
      border-top: 1px solid var(--outline-variant); background: var(--surface-container-lowest);
    }
    .input {
      flex: 1; resize: vertical; min-height: 48px; max-height: 160px;
      padding: 12px 14px; border-radius: var(--radius-md); border: 1px solid var(--outline-variant);
      background: var(--surface); color: var(--on-surface); font-family: var(--font-body); font-size: 14px;
    }
    .send-btn { flex-shrink: 0; min-width: 120px; }
  `]
})
export class InvestigationCopilotComponent implements AfterViewChecked {
  private http = inject(HttpClient);
  private auth = inject(AuthService);

  readonly copilotUrl = environment.investigationCopilotUrl;

  messages = signal<CopilotMessage[]>([]);
  loading = signal(false);
  inputText = '';
  lastHealth = signal<{ ai_configured: boolean; rag_chunks_indexed: number } | null>(null);

  readonly examples = [
    'Investigate yash@test.com — show profile/KYC, wallet status, and rewards tier.',
    'Summarize unresolved fraud flags and suggest prioritization.',
    'What does the investigation playbook say about escalation?',
  ];

  @ViewChild('scrollBox') private scrollBox!: ElementRef<HTMLDivElement>;
  @ViewChild('inputEl') private inputEl!: ElementRef<HTMLTextAreaElement>;

  private shouldScroll = false;

  constructor() {
    this.pingHealth();
  }

  ngAfterViewChecked(): void {
    if (this.shouldScroll && this.scrollBox) {
      const el = this.scrollBox.nativeElement;
      el.scrollTop = el.scrollHeight;
      this.shouldScroll = false;
    }
  }

  pingHealth(): void {
    this.http
      .get<{ ai_configured: boolean; rag_chunks_indexed: number }>(`${this.copilotUrl}/health`)
      .subscribe({
        next: h => this.lastHealth.set(h),
        error: () => this.lastHealth.set(null)
      });
  }

  useExample(text: string): void {
    this.inputText = text;
    setTimeout(() => this.inputEl?.nativeElement?.focus(), 0);
  }

  clear(): void {
    this.messages.set([]);
  }

  send(): void {
    const text = this.inputText.trim();
    if (!text || this.loading()) return;

    const userMsg: CopilotMessage = { role: 'user', content: text, timestamp: new Date() };
    this.messages.update(m => [...m, userMsg]);
    this.inputText = '';
    this.loading.set(true);
    this.shouldScroll = true;

    const history = this.messages().slice(0, -1).map(m => ({
      role: m.role,
      content: m.content
    }));

    const token = this.auth.getAccessToken();
    let headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }

    this.http
      .post<InvestigateResponse>(`${this.copilotUrl}/api/investigate`, { message: text, history }, { headers })
      .subscribe({
        next: res => {
          const bot: CopilotMessage = {
            role: 'assistant',
            content: res.reply,
            timestamp: new Date(),
            toolsUsed: res.tools_used,
            ragChunksUsed: res.rag_chunks_used
          };
          this.messages.update(m => [...m, bot]);
          this.loading.set(false);
          this.shouldScroll = true;
        },
        error: err => {
          const detail = err?.error?.detail ?? err?.message ?? 'Request failed';
          const bot: CopilotMessage = {
            role: 'assistant',
            content: typeof detail === 'string' ? `❌ ${detail}` : `❌ ${JSON.stringify(detail)}`,
            timestamp: new Date()
          };
          this.messages.update(m => [...m, bot]);
          this.loading.set(false);
          this.shouldScroll = true;
        }
      });
  }

  formatMessage(text: string): string {
    const esc = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    return esc
      .replace(/\n/g, '<br/>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>');
  }
}
