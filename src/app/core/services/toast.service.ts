import { Injectable, signal } from '@angular/core';

export interface ToastItem {
  id: string;
  message: string;
  title?: string;
  type: 'error' | 'success' | 'warning' | 'info';
  durationMs: number;
}

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  readonly toasts = signal<ToastItem[]>([]);

  show(options: { message: string; title?: string; type?: 'error' | 'success' | 'warning' | 'info'; durationMs?: number }): string {
    const id = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const durationMs = options.durationMs ?? 5000;
    const item: ToastItem = {
      id,
      message: options.message,
      title: options.title,
      type: options.type ?? 'info',
      durationMs
    };

    this.toasts.update((list) => [...list, item]);

    if (durationMs > 0) {
      setTimeout(() => {
        this.remove(id);
      }, durationMs);
    }

    return id;
  }

  error(message: string, title?: string, durationMs?: number): string {
    return this.show({ message, title, type: 'error', durationMs: durationMs ?? 6000 });
  }

  success(message: string, title?: string, durationMs?: number): string {
    return this.show({ message, title, type: 'success', durationMs: durationMs ?? 4000 });
  }

  warning(message: string, title?: string, durationMs?: number): string {
    return this.show({ message, title, type: 'warning', durationMs: durationMs ?? 5000 });
  }

  info(message: string, title?: string, durationMs?: number): string {
    return this.show({ message, title, type: 'info', durationMs: durationMs ?? 4000 });
  }

  remove(id: string): void {
    this.toasts.update((list) => list.filter((t) => t.id !== id));
  }
}
