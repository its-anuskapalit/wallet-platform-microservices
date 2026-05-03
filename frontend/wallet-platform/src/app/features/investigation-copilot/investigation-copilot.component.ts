import { Component, signal, ViewChild, ElementRef, AfterViewChecked, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../core/services/auth.service';

interface CopilotMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  toolsUsed?: string[];
  ragChunksUsed?: number;
  /** True when Gemini quota failed but server returned live JSON instead */
  llmDegraded?: boolean;
}

interface InvestigateResponse {
  reply: string;
  rag_chunks_used: number;
  tools_used: string[];
  llm_degraded?: boolean;
}

@Component({
  selector: 'app-investigation-copilot',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe],
  templateUrl: './investigation-copilot.component.html',
  styleUrls: ['./investigation-copilot.component.scss']
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
            ragChunksUsed: res.rag_chunks_used,
            llmDegraded: !!res.llm_degraded
          };
          this.messages.update(m => [...m, bot]);
          this.loading.set(false);
          this.shouldScroll = true;
        },
        error: (err: HttpErrorResponse) => {
          const bot: CopilotMessage = {
            role: 'assistant',
            content: this.copilotErrorMessage(err),
            timestamp: new Date()
          };
          this.messages.update(m => [...m, bot]);
          this.loading.set(false);
          this.shouldScroll = true;
        }
      });
  }

  /** Maps HTTP errors to short user-facing text (no raw API payloads). */
  private copilotErrorMessage(err: HttpErrorResponse): string {
    const status = err.status;
    if (status === 0) {
      return (
        'Could not reach the Investigation Copilot. Check that the service is running ' +
        '(see start-all / port 8001) and that your browser can reach this origin.'
      );
    }
    if (status === 429) {
      return 'AI service is temporarily busy. Please try again in a minute.';
    }
    if (status === 503) {
      const d = err.error?.detail;
      if (typeof d === 'string' && d.includes('not configured')) {
        return d;
      }
      return 'Service temporarily unavailable. Please try again.';
    }
    if (status === 504) {
      return (
        'This investigation took too long. Try a shorter question, or ask an admin to set ' +
        'INVESTIGATION_FAST=1 or a higher INVESTIGATION_REQUEST_TIMEOUT_SEC on the server.'
      );
    }
    if (status === 502) {
      const d = err.error?.detail;
      if (typeof d === 'string' && d.length > 0 && d.length < 400) {
        return d;
      }
      return 'The assistant could not complete this step. Please try again.';
    }
    if (status >= 400 && status < 500) {
      return 'Request could not be completed. Please sign in as Admin if live data is required, then try again.';
    }
    return 'Something went wrong. Please try again.';
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
