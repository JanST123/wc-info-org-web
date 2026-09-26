import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';

@Component({
  selector: 'app-euro-key-modal',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  template: `
    <div class="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
      <div
        class="bg-white dark:bg-gray-900 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden text-gray-800 dark:text-gray-100 flex flex-col max-h-[90vh]"
        (click)="$event.stopPropagation()"
      >
        <!-- Modal Header -->
        <div class="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gray-50/80 dark:bg-gray-800/80">
          <div class="flex items-center gap-2.5 text-purple-700 dark:text-purple-400 font-bold text-base">
            <div class="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-950/60 flex items-center justify-center">
              <i class="fa-solid fa-key text-purple-600 dark:text-purple-400 text-sm"></i>
            </div>
            <span>{{ 'euroKeyModal.title' | translate }}</span>
          </div>

          <button
            type="button"
            (click)="onClose.emit()"
            class="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
            title="Schließen"
          >
            <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <!-- Modal Body (Scrollable) -->
        <div class="p-6 space-y-4 text-xs sm:text-sm overflow-y-auto leading-relaxed text-gray-700 dark:text-gray-300">
          <p>
            {{ 'euroKeyModal.p1' | translate }}
          </p>

          <p class="font-medium text-gray-900 dark:text-gray-100">
            {{ 'euroKeyModal.p2' | translate }}
          </p>

          <div class="space-y-2 p-3.5 bg-purple-50/60 dark:bg-purple-950/30 rounded-xl border border-purple-100 dark:border-purple-900/50">
            <p class="font-semibold text-gray-900 dark:text-gray-100">
              {{ 'euroKeyModal.p3' | translate }}
            </p>
            <ul class="list-disc list-inside space-y-1 text-gray-800 dark:text-gray-200 pl-1">
              <li>{{ 'euroKeyModal.bullet1' | translate }}</li>
              <li>{{ 'euroKeyModal.bullet2' | translate }}</li>
            </ul>
          </div>

          <div class="pt-1 text-xs text-gray-500 dark:text-gray-400">
            <span>Quelle: </span>
            <a
              [href]="sourceUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="text-purple-600 dark:text-purple-400 hover:underline break-all inline-flex items-center gap-1"
            >
              <span>{{ sourceUrl }}</span>
              <svg class="w-3 h-3 inline-block shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                <polyline points="15 3 21 3 21 9"/>
                <line x1="10" y1="14" x2="21" y2="3"/>
              </svg>
            </a>
          </div>
        </div>

        <!-- Modal Footer -->
        <div class="p-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/80 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2">
          <button
            type="button"
            (click)="onClose.emit()"
            class="px-4 py-2.5 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-center"
          >
            {{ 'common.close' | translate }}
          </button>

          <a
            [href]="sourceUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-md transition-all active:scale-95 inline-flex items-center justify-center gap-2 text-center"
          >
            <span>{{ 'euroKeyModal.orderButton' | translate }}</span>
            <svg class="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
              <polyline points="15 3 21 3 21 9"/>
              <line x1="10" y1="14" x2="21" y2="3"/>
            </svg>
          </a>
        </div>
      </div>
    </div>
  `
})
export class EuroKeyModalComponent {
  readonly sourceUrl = 'https://www.cbf-da.de/leistungen/euroschluessel';
  @Output() onClose = new EventEmitter<void>();
}
