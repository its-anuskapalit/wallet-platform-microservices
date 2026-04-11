import { Component, inject, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule],
  encapsulation: ViewEncapsulation.None,
  template: `
    <div class="toast-container" aria-live="polite" aria-relevant="additions">
      @for (toast of toastSvc.toasts(); track toast.id) {
        <div class="toast toast--{{ toast.type }}" role="alert">
          <span class="toast-icon" aria-hidden="true">
            @switch (toast.type) {
              @case ('success') { ✓ }
              @case ('error')   { ✕ }
              @case ('warning') { ⚠ }
              @default          { ℹ }
            }
          </span>
          <span class="toast-msg">{{ toast.message }}</span>
          <button type="button" class="toast-close" (click)="toastSvc.dismiss(toast.id)" aria-label="Dismiss">×</button>
        </div>
      }
    </div>
  `,
  styles: [`
    .toast-container {
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 10000;
      display: flex;
      flex-direction: column;
      gap: 10px;
      max-width: min(380px, calc(100vw - 32px));
      pointer-events: none;
    }

    .toast-container .toast {
      pointer-events: auto;
    }

    .toast {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 14px 16px;
      border-radius: 12px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.15);
      animation: toast-slide-in 0.28s ease;
      font-size: 14px;
      font-weight: 500;
      background: var(--surface-container-lowest);
      color: var(--on-surface);
      border: 1px solid var(--outline-variant);
    }

    .toast--success { border-left: 4px solid var(--success); background: var(--success-container); color: var(--success); }
    .toast--error   { border-left: 4px solid var(--error); background: var(--error-container); color: var(--error); }
    .toast--warning { border-left: 4px solid var(--warning); background: var(--warning-container); color: var(--warning); }
    .toast--info    { border-left: 4px solid #2196f3; background: #e3f2fd; color: #0d47a1; }

    .toast-icon { font-size: 16px; flex-shrink: 0; font-weight: 700; }
    .toast-msg  { flex: 1; min-width: 0; }

    .toast-close {
      background: none;
      border: none;
      cursor: pointer;
      font-size: 18px;
      line-height: 1;
      opacity: 0.6;
      padding: 0;
      color: inherit;
    }
    .toast-close:hover { opacity: 1; }

    @keyframes toast-slide-in {
      from { transform: translateX(36px); opacity: 0; }
      to   { transform: translateX(0);    opacity: 1; }
    }

    /* Dark / Dim theme */
    html[data-theme="dark"] .toast {
      border: 1px solid #38444d;
      box-shadow: 0 8px 32px rgba(0,0,0,0.45);
    }

    html[data-theme="dark"] .toast--success {
      background: #063d2c;
      color: #6ee7b7;
      border-left-color: #34d399;
    }
    html[data-theme="dark"] .toast--error {
      background: #3d1518;
      color: #fca5a5;
      border-left-color: #f87171;
    }
    html[data-theme="dark"] .toast--warning {
      background: #3d3200;
      color: #fde047;
      border-left-color: #eab308;
    }
    html[data-theme="dark"] .toast--info {
      background: #1e3a5f;
      color: #93c5fd;
      border-left-color: #3b82f6;
    }
  `]
})
export class ToastComponent {
  readonly toastSvc = inject(ToastService);
}
