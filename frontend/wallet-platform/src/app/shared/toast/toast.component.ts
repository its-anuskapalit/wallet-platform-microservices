import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="toast-container">
      @for (toast of toastSvc.toasts(); track toast.id) {
        <div class="toast toast--{{ toast.type }}" role="alert">
          <span class="toast-icon">
            @switch (toast.type) {
              @case ('success') { ✓ }
              @case ('error')   { ✕ }
              @case ('warning') { ⚠ }
              @default          { ℹ }
            }
          </span>
          <span class="toast-msg">{{ toast.message }}</span>
          <button class="toast-close" (click)="toastSvc.dismiss(toast.id)">×</button>
        </div>
      }
    </div>
  `,
  styles: [`
    .toast-container {
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 9999;
      display: flex;
      flex-direction: column;
      gap: 10px;
      max-width: 380px;
    }

    .toast {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 14px 16px;
      border-radius: 12px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.15);
      animation: slideIn 0.25s ease;
      font-size: 14px;
      font-weight: 500;
      background: var(--surface-container);
      color: var(--on-surface);

      &--success { background: #e8f5e9; color: #1b5e20; border-left: 4px solid #4caf50; }
      &--error   { background: #fce4ec; color: #880e4f; border-left: 4px solid #e91e63; }
      &--warning { background: #fff8e1; color: #e65100; border-left: 4px solid #ff9800; }
      &--info    { background: #e3f2fd; color: #0d47a1; border-left: 4px solid #2196f3; }
    }

    .toast-icon { font-size: 16px; flex-shrink: 0; }
    .toast-msg  { flex: 1; }

    .toast-close {
      background: none;
      border: none;
      cursor: pointer;
      font-size: 18px;
      line-height: 1;
      opacity: 0.6;
      padding: 0;
      &:hover { opacity: 1; }
    }

    @keyframes slideIn {
      from { transform: translateX(40px); opacity: 0; }
      to   { transform: translateX(0);    opacity: 1; }
    }
  `]
})
export class ToastComponent {
  readonly toastSvc = inject(ToastService);
}
