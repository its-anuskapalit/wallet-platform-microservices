import { Component, HostListener, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { ChatbotComponent } from '../../shared/chatbot/chatbot.component';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, SidebarComponent, ChatbotComponent],
  template: `
    <div class="app-shell">
      <app-sidebar />
      <main class="main-content" #mainContent>
        <router-outlet />
      </main>
    </div>
    <app-chatbot />

    <!-- Scroll to top -->
    @if (showScrollTop()) {
      <button class="scroll-top-btn" (click)="scrollToTop()" aria-label="Scroll to top">
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M9 14V4M4 9l5-5 5 5"/>
        </svg>
      </button>
    }
  `,
  styles: [`
    .app-shell {
      display: flex;
      min-height: 100vh;
      background: var(--background);
    }

    .main-content {
      flex: 1;
      margin-left: 240px;
      transition: margin-left 0.25s ease;
      padding: 32px;
      max-width: calc(100vw - 240px);
      overflow-x: hidden;
    }

    @media (max-width: 768px) {
      .main-content {
        margin-left: 72px;
        max-width: calc(100vw - 72px);
        padding: 20px;
      }
    }

    .scroll-top-btn {
      position: fixed;
      bottom: 32px;
      right: 32px;
      width: 44px;
      height: 44px;
      border-radius: 50%;
      background: var(--primary);
      color: white;
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 16px rgba(148, 74, 0, 0.35);
      z-index: 200;
      animation: fadeInUp 0.25s ease;
      transition: transform 0.15s ease, box-shadow 0.15s ease;

      &:hover {
        transform: translateY(-3px);
        box-shadow: 0 8px 24px rgba(148, 74, 0, 0.45);
      }
    }

    @keyframes fadeInUp {
      from { opacity: 0; transform: translateY(12px); }
      to   { opacity: 1; transform: translateY(0); }
    }
  `]
})
export class MainLayoutComponent {
  showScrollTop = signal(false);

  @HostListener('window:scroll')
  onScroll(): void {
    this.showScrollTop.set(window.scrollY > 300);
  }

  scrollToTop(): void {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}
