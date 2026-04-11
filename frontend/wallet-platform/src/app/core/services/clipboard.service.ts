import { Injectable, inject } from '@angular/core';
import { ToastService } from './toast.service';

@Injectable({ providedIn: 'root' })
export class ClipboardService {
  private readonly toast = inject(ToastService);

  /** Copies text and shows a short success toast on success. */
  async copy(text: string, successMessage = 'Copied to clipboard'): Promise<boolean> {
    if (!text) {
      this.toast.warning('Nothing to copy');
      return false;
    }
    try {
      await navigator.clipboard.writeText(text);
      this.toast.success(successMessage);
      return true;
    } catch {
      this.toast.error('Could not copy — check browser permissions');
      return false;
    }
  }
}
