import { Component, EventEmitter, Input, Output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToiletPhoto } from '../../../core/models/toilet.model';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import { WcInfoApiService } from '../../../core/services/wc-info-api.service';

@Component({
  selector: 'app-photo-lightbox-modal',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  template: `
    <div
      class="fixed inset-0 z-[100] bg-black/95 flex flex-col items-center justify-center p-4 animate-fadeIn select-none cursor-default"
      (click)="onClose.emit()"
    >
      <!-- Close Button -->
      <button
        type="button"
        (click)="onClose.emit()"
        class="absolute top-4 right-4 text-white bg-white/20 hover:bg-white/30 active:scale-95 p-3 rounded-full transition-all cursor-pointer z-10 flex items-center justify-center shadow-lg pointer-events-auto"
        aria-label="Close photo"
      >
        <i aria-hidden="true" class="fa-solid fa-xmark text-2xl text-white"></i>
      </button>

      <!-- Main Image Container -->
      <div
        class="relative flex flex-col items-center max-w-full max-h-[85vh] pointer-events-auto"
        (click)="$event.stopPropagation()"
      >
        <img
          [src]="photo.url"
          [alt]="title || 'Toilet Photo'"
          class="max-w-full max-h-[75vh] object-contain rounded-xl shadow-2xl"
        />

        <!-- Red 'Remove photo' link below the photo -->
        <div class="mt-4 flex flex-col items-center">
          <button
            type="button"
            (click)="openDeleteModal()"
            class="inline-flex items-center gap-1.5 text-rose-500 hover:text-rose-400 active:text-rose-600 font-semibold text-sm transition-colors cursor-pointer py-1.5 px-3.5 rounded-xl hover:bg-rose-500/10"
          >
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
              <line x1="10" y1="11" x2="10" y2="17"/>
              <line x1="14" y1="11" x2="14" y2="17"/>
            </svg>
            <span>{{ 'photo.removePhoto' | translate }}</span>
          </button>
        </div>
      </div>

      <!-- Confirmation Dialog Modal -->
      @if (showDeleteConfirm()) {
        <div
          class="fixed inset-0 z-[110] bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn"
          (click)="$event.stopPropagation()"
        >
          <div
            class="bg-white dark:bg-gray-900 w-full max-w-md rounded-2xl shadow-2xl p-6 text-gray-800 dark:text-gray-100 flex flex-col gap-4 border border-gray-100 dark:border-gray-800 pointer-events-auto"
          >
            <div class="flex items-center gap-2.5 text-rose-600 dark:text-rose-400 font-bold text-lg">
              <svg class="w-6 h-6 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                <line x1="10" y1="11" x2="10" y2="17"/>
                <line x1="14" y1="11" x2="14" y2="17"/>
              </svg>
              <span>{{ 'photo.deleteTitle' | translate }}</span>
            </div>

            <p class="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
              {{ 'photo.deleteMessage' | translate }}
            </p>

            <div class="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                (click)="cancelDelete()"
                [disabled]="isDeleting()"
                class="px-4 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 text-xs sm:text-sm font-semibold transition-colors cursor-pointer"
              >
                {{ 'photo.deleteCancel' | translate }}
              </button>

              <button
                type="button"
                (click)="confirmDelete()"
                [disabled]="isDeleting()"
                class="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-95 disabled:opacity-50 text-white text-xs sm:text-sm font-bold shadow-md shadow-rose-600/20 transition-all cursor-pointer flex items-center gap-1.5"
              >
                @if (isDeleting()) {
                  <svg class="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="M12 2v4M12 18v4"/>
                  </svg>
                }
                <span>{{ 'photo.deleteConfirmBtn' | translate }}</span>
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `
})
export class PhotoLightboxModalComponent {
  private readonly api = inject(WcInfoApiService);

  @Input({ required: true }) photo!: ToiletPhoto;
  @Input() toiletId?: number;
  @Input() title?: string;

  @Output() onClose = new EventEmitter<void>();
  @Output() onPhotoDeleted = new EventEmitter<{ toiletId?: number; photo: ToiletPhoto }>();

  readonly showDeleteConfirm = signal<boolean>(false);
  readonly isDeleting = signal<boolean>(false);

  openDeleteModal(): void {
    this.showDeleteConfirm.set(true);
  }

  cancelDelete(): void {
    this.showDeleteConfirm.set(false);
  }

  confirmDelete(): void {
    const tid = this.toiletId || this.photo.toiletId;
    const fn = this.photo.filename || (this.photo.url ? this.photo.url.split('/').pop()?.split('?')[0] : '');

    if (!tid || !fn) {
      this.onPhotoDeleted.emit({ toiletId: tid, photo: this.photo });
      this.onClose.emit();
      return;
    }

    this.isDeleting.set(true);

    this.api.deletePhoto(tid, fn).subscribe({
      next: () => {
        this.isDeleting.set(false);
        this.onPhotoDeleted.emit({ toiletId: tid, photo: this.photo });
        this.onClose.emit();
      },
      error: (err) => {
        this.isDeleting.set(false);
        console.error('Delete photo failed:', err);
        this.onPhotoDeleted.emit({ toiletId: tid, photo: this.photo });
        this.onClose.emit();
      }
    });
  }
}
