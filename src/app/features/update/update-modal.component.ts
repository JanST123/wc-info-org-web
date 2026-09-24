import { Component, EventEmitter, Input, OnInit, Output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Toilet, UpdateToiletPayload } from '../../core/models/toilet.model';
import { WcInfoApiService } from '../../core/services/wc-info-api.service';
import { TranslatePipe } from '../../core/pipes/translate.pipe';

@Component({
  selector: 'app-update-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  template: `
    <div class="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
      <div
        class="bg-white dark:bg-gray-900 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden text-gray-800 dark:text-gray-100 flex flex-col max-h-[90vh]"
        (click)="$event.stopPropagation()"
      >
        <!-- Modal Header -->
        <div class="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <div class="flex items-center gap-2 text-purple-700 dark:text-purple-400 font-bold text-base">
            <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 20h9"/>
              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
            </svg>
            <span>{{ 'update.title' | translate }}</span>
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

        <!-- Scrollable Body -->
        <div class="p-6 space-y-4 text-sm overflow-y-auto">
          @if (isSuccess()) {
            <div class="p-4 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 rounded-xl border border-emerald-200 dark:border-emerald-800/60 text-center space-y-2">
              <svg class="w-8 h-8 text-emerald-600 dark:text-emerald-400 mx-auto" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              <p class="font-bold">{{ 'update.sent' | translate }}</p>
            </div>
          } @else {
            <div>
              <label class="block font-semibold text-gray-700 dark:text-gray-300 mb-1 text-xs uppercase tracking-wider">
                Name / Bezeichnung
              </label>
              <input
                type="text"
                [(ngModel)]="name"
                class="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label class="block font-semibold text-gray-700 dark:text-gray-300 mb-1 text-xs uppercase tracking-wider">
                Betreiber / Einrichtung
              </label>
              <input
                type="text"
                [(ngModel)]="owner"
                class="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white"
              />
            </div>

            <div class="grid grid-cols-2 gap-3 pt-2">
              <label class="flex items-center gap-2 text-xs font-semibold text-gray-800 dark:text-gray-200 cursor-pointer">
                <input
                  type="checkbox"
                  [(ngModel)]="hasWheelchairAccess"
                  class="w-4 h-4 text-purple-600 rounded-sm"
                />
                <span>{{ 'attr.wheelchair' | translate }}</span>
              </label>

              <label class="flex items-center gap-2 text-xs font-semibold text-gray-800 dark:text-gray-200 cursor-pointer">
                <input
                  type="checkbox"
                  [(ngModel)]="hasChangingTable"
                  class="w-4 h-4 text-purple-600 rounded-sm"
                />
                <span>{{ 'attr.changingTable' | translate }}</span>
              </label>

              <label class="flex items-center gap-2 text-xs font-semibold text-gray-800 dark:text-gray-200 cursor-pointer">
                <input
                  type="checkbox"
                  [checked]="euroKey === 'yes'"
                  (change)="euroKey = euroKey === 'yes' ? 'no' : 'yes'"
                  class="w-4 h-4 text-purple-600 rounded-sm"
                />
                <span>{{ 'attr.euroKey' | translate }}</span>
              </label>

              <label class="flex items-center gap-2 text-xs font-semibold text-gray-800 dark:text-gray-200 cursor-pointer">
                <input
                  type="checkbox"
                  [(ngModel)]="publicAccessible"
                  class="w-4 h-4 text-purple-600 rounded-sm"
                />
                <span>{{ 'attr.public' | translate }}</span>
              </label>
            </div>

            <div class="pt-2">
              <label class="block font-semibold text-gray-700 dark:text-gray-300 mb-1 text-xs uppercase tracking-wider">
                {{ 'detail.address' | translate }}
              </label>
              <input
                type="text"
                [(ngModel)]="address"
                class="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label class="block font-semibold text-gray-700 dark:text-gray-300 mb-1 text-xs uppercase tracking-wider">
                {{ 'detail.comments' | translate }}
              </label>
              <textarea
                rows="3"
                [(ngModel)]="comment"
                class="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white"
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
              [disabled]="isSubmitting()"
              (click)="submitUpdate()"
              class="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-xs font-bold shadow-md transition-all active:scale-95"
            >
              {{ 'update.send' | translate }}
            </button>
          }
        </div>
      </div>
    </div>
  `
})
export class UpdateModalComponent implements OnInit {
  private readonly api = inject(WcInfoApiService);

  @Input({ required: true }) toilet!: Toilet;
  @Output() onCancel = new EventEmitter<void>();
  @Output() onUpdated = new EventEmitter<Toilet>();

  name = '';
  owner = '';
  hasWheelchairAccess = false;
  hasChangingTable = false;
  euroKey: string | null = null;
  publicAccessible = true;
  address = '';
  comment = '';

  readonly isSubmitting = signal<boolean>(false);
  readonly isSuccess = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);

  ngOnInit(): void {
    this.name = this.toilet.name || '';
    this.owner = this.toilet.owner || '';
    this.hasWheelchairAccess = this.toilet.hasWheelchairAccess ?? false;
    this.hasChangingTable = this.toilet.hasChangingTable ?? false;
    this.euroKey = this.toilet.euroKey ?? null;
    this.publicAccessible = this.toilet.publicAccessible !== false;
    this.address = this.toilet.address || '';
    this.comment = this.toilet.comment || '';
  }

  submitUpdate(): void {
    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    const payload: UpdateToiletPayload = {
      lat: this.toilet.lat,
      lon: this.toilet.lon,
      name: this.name || null,
      owner: this.owner || null,
      hasWheelchairAccess: this.hasWheelchairAccess,
      hasChangingTable: this.hasChangingTable,
      euroKey: this.euroKey,
      publicAccessible: this.publicAccessible,
      address: this.address || null,
      comment: this.comment || null
    };

    this.api.updateToilet(this.toilet.id, payload).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.isSuccess.set(true);
        const updated: Toilet = {
          ...this.toilet,
          ...payload,
          name: this.name.trim() || this.toilet.name
        };
        this.onUpdated.emit(updated);
        setTimeout(() => this.onCancel.emit(), 1200);
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.errorMessage.set(err?.message || 'Update failed');
      }
    });
  }
}
