import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService, ToastItem } from '../../../core/services/toast.service';

@Component({
  selector: 'app-toast-container',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      aria-live="polite"
      aria-atomic="true"
      class="fixed top-4 right-4 z-[9999] flex flex-col gap-2.5 max-w-sm w-[calc(100vw-2rem)] sm:w-96 pointer-events-none"
    >
      @for (toast of toastService.toasts(); track toast.id) {
        <div
          class="pointer-events-auto rounded-2xl p-4 shadow-xl border flex items-start gap-3 transition-all duration-300 animate-slideDown backdrop-blur-md"
          [ngClass]="{
            'bg-rose-600/95 border-rose-500 text-white shadow-rose-900/30': toast.type === 'error',
            'bg-emerald-600/95 border-emerald-500 text-white shadow-emerald-900/30': toast.type === 'success',
            'bg-amber-600/95 border-amber-500 text-white shadow-amber-900/30': toast.type === 'warning',
            'bg-gray-900/95 border-gray-700 text-white shadow-black/40': toast.type === 'info'
          }"
          role="alert"
        >
          <!-- Icon -->
          <div class="shrink-0 mt-0.5">
            @if (toast.type === 'error') {
              <svg class="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
            } @else if (toast.type === 'success') {
              <svg class="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="9 12 11 14 15 10"/>
              </svg>
            } @else if (toast.type === 'warning') {
              <svg class="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
                <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
                <line x1="12" y1="9" x2="12" y2="13"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
            } @else {
              <svg class="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="16" x2="12" y2="12"/>
                <line x1="12" y1="8" x2="12.01" y2="8"/>
              </svg>
            }
          </div>

          <!-- Message Body -->
          <div class="flex-1 min-w-0 pr-1">
            @if (toast.title) {
              <div class="font-bold text-sm leading-tight mb-0.5">{{ toast.title }}</div>
            }
            <div class="text-xs sm:text-sm font-medium leading-snug break-words">
              {{ toast.message }}
            </div>
          </div>

          <!-- Close Button -->
          <button
            type="button"
            (click)="toastService.remove(toast.id)"
            class="shrink-0 text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Schließen"
          >
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      }
    </div>
  `,
  styles: [`
    @keyframes slideDown {
      from {
        opacity: 0;
        transform: translateY(-12px) scale(0.96);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }
    .animate-slideDown {
      animation: slideDown 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }
  `]
})
export class ToastContainerComponent {
  readonly toastService = inject(ToastService);
}
