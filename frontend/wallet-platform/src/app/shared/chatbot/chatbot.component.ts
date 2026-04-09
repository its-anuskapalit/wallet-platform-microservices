import { Component, signal, ViewChild, ElementRef, AfterViewChecked, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

@Component({
  selector: 'app-chatbot',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <!-- Floating button -->
    <button class="chat-fab" (click)="toggleOpen()" [class.open]="isOpen()" title="WalletBot">
      @if (isOpen()) {
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
      } @else {
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
        @if (unread() > 0) {
          <span class="fab-badge">{{ unread() }}</span>
        }
      }
    </button>

    <!-- Chat panel -->
    @if (isOpen()) {
      <div class="chat-panel">
        <!-- Header -->
        <div class="chat-header">
          <div class="chat-header-left">
            <div class="bot-avatar">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="10" rx="2"/><path d="M12 3v4M8 11V7a4 4 0 018 0v4"/><circle cx="9" cy="16" r="1" fill="currentColor"/><circle cx="15" cy="16" r="1" fill="currentColor"/></svg>
            </div>
            <div>
              <div class="bot-name">WalletBot</div>
              <div class="bot-status">
                <span class="status-dot"></span> Online
              </div>
            </div>
          </div>
          <button class="icon-btn" (click)="clearChat()" title="Clear chat">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6M10 11v6M14 11v6M9 6V4h6v2"/></svg>
          </button>
        </div>

        <!-- Messages -->
        <div class="chat-messages" #messagesContainer>
          @if (messages().length === 0) {
            <div class="welcome-block">
              <div class="welcome-icon">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="10" rx="2"/><path d="M12 3v4M8 11V7a4 4 0 018 0v4"/><circle cx="9" cy="16" r="1" fill="currentColor"/><circle cx="15" cy="16" r="1" fill="currentColor"/></svg>
              </div>
              <p class="welcome-title">Hi! I'm WalletBot 👋</p>
              <p class="welcome-sub">Ask me anything about your wallet, rewards, transactions, or KYC.</p>
              <div class="suggestion-chips">
                @for (s of suggestions; track s) {
                  <button class="chip" (click)="sendSuggestion(s)">{{ s }}</button>
                }
              </div>
            </div>
          }

          @for (msg of messages(); track msg.timestamp) {
            <div class="msg-row" [class.user]="msg.role === 'user'" [class.bot]="msg.role === 'assistant'">
              @if (msg.role === 'assistant') {
                <div class="msg-avatar">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="10" rx="2"/><path d="M12 3v4M8 11V7a4 4 0 018 0v4"/></svg>
                </div>
              }
              <div class="msg-bubble">
                <div class="msg-text" [innerHTML]="formatMessage(msg.content)"></div>
                <div class="msg-time">{{ msg.timestamp | date:'h:mm a' }}</div>
              </div>
            </div>
          }

          @if (loading()) {
            <div class="msg-row bot">
              <div class="msg-avatar">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="10" rx="2"/><path d="M12 3v4M8 11V7a4 4 0 018 0v4"/></svg>
              </div>
              <div class="msg-bubble typing-bubble">
                <span></span><span></span><span></span>
              </div>
            </div>
          }
        </div>

        <!-- Input -->
        <div class="chat-input-bar">
          <input
            #inputEl
            class="chat-input"
            [(ngModel)]="inputText"
            placeholder="Ask WalletBot…"
            (keydown.enter)="send()"
            [disabled]="loading()"
            maxlength="500"
          />
          <button class="send-btn" (click)="send()" [disabled]="!inputText.trim() || loading()">
            @if (loading()) {
              <svg class="spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 2a10 10 0 0110 10"/></svg>
            } @else {
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
            }
          </button>
        </div>
      </div>
    }
  `,
  styles: [`
    /* ── FAB ────────────────────────────────────────────── */
    .chat-fab {
      position: fixed;
      bottom: 28px;
      right: 28px;
      width: 56px;
      height: 56px;
      border-radius: 50%;
      background: var(--primary);
      color: white;
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 6px 24px rgba(0,0,0,0.22);
      transition: transform 0.2s, box-shadow 0.2s, background 0.2s;
      z-index: 1100;

      &:hover { transform: scale(1.08); box-shadow: 0 10px 32px rgba(0,0,0,0.28); }
      &.open { background: var(--on-surface-variant); }
    }

    .fab-badge {
      position: absolute;
      top: 6px;
      right: 6px;
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background: #e53935;
      color: white;
      font-size: 10px;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 2px solid white;
    }

    /* ── Panel ──────────────────────────────────────────── */
    .chat-panel {
      position: fixed;
      bottom: 96px;
      right: 28px;
      width: 380px;
      max-height: 600px;
      display: flex;
      flex-direction: column;
      background: var(--surface);
      border-radius: 24px;
      box-shadow: 0 20px 80px rgba(0,0,0,0.22);
      z-index: 1099;
      overflow: hidden;
      animation: popUp 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);

      @media (max-width: 480px) {
        width: calc(100vw - 20px);
        right: 10px;
        bottom: 80px;
      }
    }

    @keyframes popUp {
      from { transform: scale(0.85) translateY(20px); opacity: 0; }
      to   { transform: scale(1) translateY(0); opacity: 1; }
    }

    /* ── Header ─────────────────────────────────────────── */
    .chat-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 18px;
      background: var(--primary);
      color: white;
    }

    .chat-header-left {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .bot-avatar {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: rgba(255,255,255,0.2);
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .bot-name { font-weight: 700; font-size: 15px; }

    .bot-status {
      display: flex;
      align-items: center;
      gap: 5px;
      font-size: 12px;
      color: rgba(255,255,255,0.8);
    }

    .status-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #69f0ae;
      box-shadow: 0 0 6px #69f0ae;
    }

    .icon-btn {
      background: rgba(255,255,255,0.15);
      border: none;
      color: white;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.15s;
      &:hover { background: rgba(255,255,255,0.3); }
    }

    /* ── Messages ───────────────────────────────────────── */
    .chat-messages {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 10px;
      min-height: 300px;
      max-height: 420px;
      scroll-behavior: smooth;
    }

    .welcome-block {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      padding: 24px 16px;
      text-align: center;
    }

    .welcome-icon {
      width: 60px;
      height: 60px;
      border-radius: 20px;
      background: var(--primary-container);
      color: var(--primary);
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 4px;
    }

    .welcome-title { font-weight: 700; font-size: 16px; }
    .welcome-sub { font-size: 13px; color: var(--on-surface-variant); line-height: 1.5; }

    .suggestion-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      justify-content: center;
      margin-top: 8px;
    }

    .chip {
      padding: 6px 14px;
      border-radius: 20px;
      border: 1.5px solid var(--outline-variant);
      background: none;
      font-size: 12px;
      color: var(--primary);
      cursor: pointer;
      transition: all 0.15s;
      font-weight: 500;
      &:hover { background: var(--primary-container); border-color: var(--primary); }
    }

    .msg-row {
      display: flex;
      align-items: flex-end;
      gap: 8px;

      &.user { flex-direction: row-reverse; }
    }

    .msg-avatar {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: var(--primary-container);
      color: var(--primary);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .msg-bubble {
      max-width: 75%;
      padding: 10px 13px;
      border-radius: 18px;
      font-size: 13.5px;
      line-height: 1.5;
      word-break: break-word;

      .user & {
        background: var(--primary);
        color: white;
        border-bottom-right-radius: 4px;
      }

      .bot & {
        background: var(--surface-container-lowest);
        color: var(--on-surface);
        border-bottom-left-radius: 4px;
        box-shadow: 0 1px 4px rgba(0,0,0,0.06);
      }
    }

    .msg-text {
      white-space: pre-wrap;
      ::ng-deep strong { font-weight: 700; }
      ::ng-deep em { font-style: italic; }
      ::ng-deep ul { padding-left: 16px; margin: 4px 0; }
      ::ng-deep li { margin: 2px 0; }
    }

    .msg-time {
      font-size: 10px;
      margin-top: 4px;
      opacity: 0.55;
      text-align: right;
    }

    /* Typing indicator */
    .typing-bubble {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 12px 16px;

      span {
        width: 7px;
        height: 7px;
        border-radius: 50%;
        background: var(--on-surface-variant);
        animation: bounce 1.2s infinite;

        &:nth-child(2) { animation-delay: 0.2s; }
        &:nth-child(3) { animation-delay: 0.4s; }
      }
    }

    @keyframes bounce {
      0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
      30% { transform: translateY(-6px); opacity: 1; }
    }

    /* ── Input bar ──────────────────────────────────────── */
    .chat-input-bar {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px 14px;
      border-top: 1px solid var(--outline-variant);
      background: var(--surface);
    }

    .chat-input {
      flex: 1;
      border: 1.5px solid var(--outline-variant);
      border-radius: 22px;
      padding: 9px 16px;
      font-size: 13.5px;
      outline: none;
      background: var(--surface-container-lowest);
      color: var(--on-surface);
      transition: border-color 0.15s;

      &:focus { border-color: var(--primary); }
      &::placeholder { color: var(--on-surface-variant); opacity: 0.7; }
    }

    .send-btn {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: var(--primary);
      color: white;
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      transition: opacity 0.15s, transform 0.15s;

      &:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }
      &:not(:disabled):hover { transform: scale(1.08); }
    }

    .spin { animation: rotate 0.8s linear infinite; }
    @keyframes rotate { to { transform: rotate(360deg); } }
  `]
})
export class ChatbotComponent implements AfterViewChecked {
  private http = inject(HttpClient);

  @ViewChild('messagesContainer') private msgContainer!: ElementRef<HTMLDivElement>;
  @ViewChild('inputEl') private inputEl!: ElementRef<HTMLInputElement>;

  isOpen   = signal(false);
  loading  = signal(false);
  unread   = signal(0);
  messages = signal<ChatMessage[]>([]);
  inputText = '';

  private shouldScroll = false;

  readonly suggestions = [
    'How do I top up my wallet?',
    'How do I earn points?',
    'What is KYC?',
    'How to redeem a voucher?',
  ];

  toggleOpen(): void {
    this.isOpen.update(v => !v);
    if (this.isOpen()) {
      this.unread.set(0);
      setTimeout(() => this.inputEl?.nativeElement.focus(), 100);
    }
  }

  clearChat(): void {
    this.messages.set([]);
  }

  sendSuggestion(text: string): void {
    this.inputText = text;
    this.send();
  }

  send(): void {
    const text = this.inputText.trim();
    if (!text || this.loading()) return;

    const userMsg: ChatMessage = { role: 'user', content: text, timestamp: new Date() };
    this.messages.update(m => [...m, userMsg]);
    this.inputText = '';
    this.loading.set(true);
    this.shouldScroll = true;

    const history = this.messages().slice(0, -1).map(m => ({
      role: m.role,
      content: m.content
    }));

    this.http.post<{ reply: string }>('http://localhost:8000/api/chat', {
      message: text,
      history
    }).subscribe({
      next: res => {
        const botMsg: ChatMessage = {
          role: 'assistant',
          content: res.reply,
          timestamp: new Date()
        };
        this.messages.update(m => [...m, botMsg]);
        this.loading.set(false);
        this.shouldScroll = true;
        if (!this.isOpen()) this.unread.update(n => n + 1);
      },
      error: err => {
        const detail = err?.error?.detail ?? 'Something went wrong. Please try again.';
        const errMsg: ChatMessage = {
          role: 'assistant',
          content: detail.includes('GEMINI_API_KEY')
            ? '⚙️ The chatbot API key is not configured yet. Please set GEMINI_API_KEY in chatbot_service/.env'
            : `❌ ${detail}`,
          timestamp: new Date()
        };
        this.messages.update(m => [...m, errMsg]);
        this.loading.set(false);
        this.shouldScroll = true;
      }
    });
  }

  formatMessage(text: string): string {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/^- (.+)$/gm, '<li>$1</li>')
      .replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>');
  }

  ngAfterViewChecked(): void {
    if (this.shouldScroll && this.msgContainer) {
      const el = this.msgContainer.nativeElement;
      el.scrollTop = el.scrollHeight;
      this.shouldScroll = false;
    }
  }
}
