import { Component, EventEmitter, Input, Output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Toilet } from '../../core/models/toilet.model';
import { WcInfoApiService } from '../../core/services/wc-info-api.service';
import { TranslatePipe } from '../../core/pipes/translate.pipe';

@Component({
  selector: 'app-feedback-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  template: `
    <div class="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
      <div
        class="bg-white dark:bg-gray-900 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden text-gray-800 dark:text-gray-100 flex flex-col"
        (click)="$event.stopPropagation()"
      >
        <!-- Modal Header -->
        <div class="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <div class="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-bold text-base">
            <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
              <line x1="12" y1="9" x2="12" y2="13"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
            <span>{{ 'feedback.title' | translate }}</span>
          </div>

          <button
            type="button"
            (click)="onCancel.emit()"
            class="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
          >
            <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <!-- Body -->
        <div class="p-6 space-y-4 text-sm">
          @if (isSuccess()) {
            <div class="p-4 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 rounded-xl border border-emerald-200 dark:border-emerald-800/60 text-center space-y-2">
              <svg class="w-8 h-8 text-emerald-600 dark:text-emerald-400 mx-auto" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              <p class="font-bold">{{ 'feedback.sent' | translate }}</p>
            </div>
          } @else {
            <div>
              <label class="block font-semibold text-gray-700 dark:text-gray-300 mb-1 text-xs uppercase tracking-wider">
                {{ 'feedback.subject' | translate }}
              </label>
              <input
                type="text"
                [(ngModel)]="subject"
                [placeholder]="'feedback.subjectPlaceholder' | translate"
                class="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:bg-white dark:focus:bg-gray-800 focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div>
              <label class="block font-semibold text-gray-700 dark:text-gray-300 mb-1 text-xs uppercase tracking-wider">
                {{ 'feedback.message' | translate }}
              </label>
              <textarea
                rows="4"
                [(ngModel)]="message"
                [placeholder]="'feedback.messagePlaceholder' | translate"
                class="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:bg-white dark:focus:bg-gray-800 focus:ring-2 focus:ring-rose-500"
              ></textarea>
            </div>

            @if (errorMessage()) {
              <p class="text-xs text-rose-600 dark:text-rose-400 p-2 bg-rose-50 dark:bg-rose-950/50 rounded-lg border border-rose-200 dark:border-rose-900/50">
                {{ errorMessage() }}
              </p>
            }
          }
        </div>

        <!-- Footer -->
        <div class="p-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/80 flex items-center justify-end gap-2">
          <button
            type="button"
            (click)="onCancel.emit()"
            class="px-4 py-2 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            {{ 'common.close' | translate }}
          </button>

          @if (!isSuccess()) {
            <button
              type="button"
              [disabled]="!subject.trim() || isSubmitting()"
              (click)="submitFeedback()"
              class="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-bold shadow-md transition-all active:scale-95"
            >
              {{ 'feedback.send' | translate }}
            </button>
          }
        </div>
      </div>
    </div>
  `
})
export class FeedbackModalComponent {
  private readonly api = inject(WcInfoApiService);

  @Input({ required: true }) toilet!: Toilet;
  @Output() onCancel = new EventEmitter<void>();

  subject = '';
  message = '';
  readonly isSubmitting = signal<boolean>(false);
  readonly isSuccess = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);

  submitFeedback(): void {
    if (!this.subject.trim()) return;

    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    this.api.sendToiletFeedback(this.toilet.id, {
      subject: this.subject.trim(),
      message: this.message.trim() || null
    }).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.isSuccess.set(true);
        setTimeout(() => this.onCancel.emit(), 1500);
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.errorMessage.set(err?.message || 'Feedback submission failed');
      }
    });
  }
}
