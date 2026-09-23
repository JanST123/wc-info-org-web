import { Component, EventEmitter, Input, Output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '../../core/pipes/translate.pipe';
import { WcInfoApiService } from '../../core/services/wc-info-api.service';
import * as exifr from 'exifr';

@Component({
  selector: 'app-photo-legal-modal',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  template: `
    <div class="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
      <div
        class="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden text-gray-800 flex flex-col"
        (click)="$event.stopPropagation()"
      >
        <!-- Modal Header -->
        <div class="p-5 border-b border-gray-100 flex items-center justify-between">
          <div class="flex items-center gap-2 text-purple-700 font-bold text-lg">
            <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
            <span>{{ 'photo.legalTitle' | translate }}</span>
          </div>

          <button
            type="button"
            (click)="onCancel.emit()"
            class="p-2 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600"
          >
            <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <!-- Modal Content -->
        <div class="p-6 space-y-4 text-sm text-gray-600">
          <p class="whitespace-pre-line leading-relaxed">
            {{ 'photo.legalText' | translate }}
          </p>

          <label class="flex items-start gap-3 p-3.5 rounded-xl bg-purple-50/50 border border-purple-100 cursor-pointer">
            <input
              type="checkbox"
              [checked]="isConfirmed()"
              (change)="isConfirmed.set(!isConfirmed())"
              class="w-4 h-4 mt-0.5 text-purple-600 rounded-sm focus:ring-purple-500 border-gray-300"
            />
            <span class="text-xs font-semibold text-purple-950">
              {{ 'photo.legalConfirm' | translate }}
            </span>
          </label>

          @if (isUploading()) {
            <div class="flex items-center justify-center gap-2 p-4 text-purple-700 font-semibold text-sm">
              <svg class="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
              </svg>
              <span>{{ 'photo.uploading' | translate }}</span>
            </div>
          }

          @if (uploadError()) {
            <p class="p-3 bg-rose-50 text-rose-700 text-xs rounded-xl border border-rose-200">
              {{ uploadError() }}
            </p>
          }
        </div>

        <!-- Hidden file input -->
        <input
          #fileInput
          type="file"
          accept="image/*"
          (change)="onFileSelected($event)"
          class="hidden"
        />

        <!-- Modal Footer -->
        <div class="p-4 border-t border-gray-100 bg-gray-50 flex items-center justify-end gap-2">
          <button
            type="button"
            (click)="onCancel.emit()"
            class="px-4 py-2 rounded-xl bg-white border border-gray-200 text-gray-700 text-xs font-semibold hover:bg-gray-100 transition-colors"
          >
            {{ 'common.cancel' | translate }}
          </button>

          <button
            type="button"
            [disabled]="!isConfirmed() || isUploading()"
            (click)="fileInput.click()"
            class="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-xs font-bold shadow-md transition-all active:scale-95"
          >
            {{ 'photo.legalAccept' | translate }}
          </button>
        </div>
      </div>
    </div>
  `
})
export class PhotoLegalModalComponent {
  private readonly api = inject(WcInfoApiService);

  @Input() toiletId?: number;

  @Output() onCancel = new EventEmitter<void>();
  @Output() onUploaded = new EventEmitter<{ url: string; thumbUrl?: string; filename: string }>();

  readonly isConfirmed = signal<boolean>(false);
  readonly isUploading = signal<boolean>(false);
  readonly uploadError = signal<string | null>(null);

  async onFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    this.isUploading.set(true);
    this.uploadError.set(null);

    let exifDataString: string | undefined;
    let fixedGeo: { lat: number; lon: number } | undefined;

    try {
      // Parse EXIF metadata client-side
      const parsed = await exifr.parse(file, { gps: true });
      if (parsed) {
        exifDataString = JSON.stringify(parsed);
        if (parsed.latitude && parsed.longitude) {
          fixedGeo = { lat: parsed.latitude, lon: parsed.longitude };
        }
      }
    } catch {
      // Ignore exif parse error
    }

    this.api.uploadPhoto(file, this.toiletId, exifDataString, fixedGeo).subscribe({
      next: (res) => {
        this.isUploading.set(false);
        this.onUploaded.emit({
          url: res.imageUrl || '',
          thumbUrl: res.thumbUrl,
          filename: res.filename
        });
      },
      error: (err) => {
        this.isUploading.set(false);
        this.uploadError.set(err?.message || 'Photo upload failed');
      }
    });
  }
}
