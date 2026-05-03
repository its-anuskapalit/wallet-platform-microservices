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
  templateUrl: './chatbot.component.html',
  styleUrls: ['./chatbot.component.scss']
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
