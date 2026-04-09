import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { ChatbotComponent } from '../../shared/chatbot/chatbot.component';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [RouterOutlet, SidebarComponent, ChatbotComponent],
  template: `
    <div class="app-shell">
      <app-sidebar />
      <main class="main-content">
        <router-outlet />
      </main>
    </div>
    <app-chatbot />
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
  `]
})
export class MainLayoutComponent {}
