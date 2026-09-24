import { Component, EventEmitter, Input, OnInit, Output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Coordinates } from '../../core/services/location.service';
import { AddToiletPayload, Toilet, UpdateToiletPayload } from '../../core/models/toilet.model';
import { WcInfoApiService } from '../../core/services/wc-info-api.service';
import { PlacesService, PlaceSuggestion } from '../../core/services/places.service';
import { TranslatePipe } from '../../core/pipes/translate.pipe';
import { TranslationService } from '../../core/services/translation.service';
import { PhotoLegalModalComponent } from '../photo-upload/photo-legal-modal.component';
import confetti from 'canvas-confetti';

@Component({
  selector: 'app-create-wizard',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe, PhotoLegalModalComponent],
  template: `
    <div class="fixed inset-0 z-50 flex items-center justify-center p-0 md:p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
      <div
        class="bg-white dark:bg-gray-900 w-full h-full md:h-auto md:max-h-[90vh] md:max-w-xl md:rounded-2xl shadow-2xl flex flex-col overflow-hidden text-gray-800 dark:text-gray-100"
        (click)="$event.stopPropagation()"
      >
        <!-- Top Wizard Header & Step Indicator -->
        <div class="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gray-50/80 dark:bg-gray-800/80">
          <div class="flex flex-col">
            <span class="text-xs font-bold text-purple-700 dark:text-purple-400 uppercase tracking-wider">
              {{ 'create.title' | translate }}
            </span>
            <span class="text-xs text-gray-500 dark:text-gray-400 font-medium">
              {{ 'create.step' | translate: { current: currentStep(), total: totalSteps } }}
            </span>
          </div>

          <button
            type="button"
            (click)="onCancel.emit()"
            class="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
          >
            <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <!-- Progress Bar -->
        <div class="w-full bg-gray-100 dark:bg-gray-800 h-1.5 overflow-hidden">
          <div
            class="bg-gradient-to-r from-purple-600 to-indigo-600 h-full transition-all duration-300 ease-out"
            [style.width.%]="(currentStep() / totalSteps) * 100"
          ></div>
        </div>

        <!-- Wizard Step Body -->
        <div class="flex-1 overflow-y-auto p-6 space-y-6">
          <!-- Step 1: Welcome & Bulk Info -->
          @if (currentStep() === 1) {
            <div class="space-y-4 text-center py-4">
              <div class="w-16 h-16 rounded-full bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 mx-auto flex items-center justify-center">
                <svg class="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                </svg>
              </div>
              <h3 class="text-xl font-black text-gray-900 dark:text-white">{{ 'create.step1.title' | translate }}</h3>
              <p class="text-sm text-gray-600 dark:text-gray-300 leading-relaxed max-w-md mx-auto">
                {{ 'create.step1.text' | translate }}
              </p>
              <div class="p-3 bg-purple-50 dark:bg-purple-950/40 rounded-xl border border-purple-100 dark:border-purple-800/50 text-xs text-purple-900 dark:text-purple-200 text-left">
                <strong>{{ 'common.optional' | translate }}:</strong> {{ 'create.step1.bulkInfo' | translate }}
              </div>
            </div>
          }

          <!-- Step 2: Location Coordinate Picker -->
          @if (currentStep() === 2) {
            <div class="space-y-4">
              <h3 class="text-lg font-bold text-gray-900 dark:text-white">{{ 'create.step2.title' | translate }}</h3>
              <p class="text-xs text-gray-500 dark:text-gray-400">{{ 'create.step2.text' | translate }}</p>

              <div class="p-4 bg-gray-50 dark:bg-gray-800/60 rounded-xl border border-gray-200 dark:border-gray-700 space-y-3">
                <div class="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <label class="block font-semibold text-gray-600 dark:text-gray-400 mb-1">Latitude</label>
                    <input
                      type="number"
                      step="0.000001"
                      [(ngModel)]="lat"
                      class="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label class="block font-semibold text-gray-600 dark:text-gray-400 mb-1">Longitude</label>
                    <input
                      type="number"
                      step="0.000001"
                      [(ngModel)]="lon"
                      class="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white"
                    />
                  </div>
                </div>
              </div>
            </div>
          }

          <!-- Step 3: Establishment Search -->
          @if (currentStep() === 3) {
            <div class="space-y-4">
              <h3 class="text-lg font-bold text-gray-900 dark:text-white">{{ 'create.step3.title' | translate }}</h3>
              <p class="text-xs text-gray-500 dark:text-gray-400">{{ 'create.step3.text' | translate }}</p>

              <div class="space-y-2">
                <input
                  type="text"
                  [(ngModel)]="owner"
                  (ngModelChange)="searchEstablishment($event)"
                  placeholder="z.B. Starbucks, Hauptbahnhof, Stadtbibliothek..."
                  class="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-purple-500"
                />

                @if (establishmentSuggestions().length > 0) {
                  <div class="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden divide-y divide-gray-50 dark:divide-gray-700">
                    @for (s of establishmentSuggestions(); track s.placeId) {
                      <div
                        (click)="selectEstablishment(s)"
                        class="p-3 hover:bg-purple-50 dark:hover:bg-purple-950/40 cursor-pointer text-xs transition-colors"
                      >
                        <div class="font-bold text-gray-900 dark:text-white">{{ s.primaryText }}</div>
                        <div class="text-gray-500 dark:text-gray-400">{{ s.secondaryText }}</div>
                      </div>
                    }
                  </div>
                }
              </div>
            </div>
          }

          <!-- Step 4: Restroom Name -->
          @if (currentStep() === 4) {
            <div class="space-y-4">
              <h3 class="text-lg font-bold text-gray-900 dark:text-white">{{ 'create.step4.title' | translate }}</h3>
              <input
                type="text"
                [(ngModel)]="name"
                [placeholder]="'create.step4.placeholder' | translate"
                class="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-purple-500"
              />
            </div>
          }

          <!-- Step 5: Public Accessibility -->
          @if (currentStep() === 5) {
            <div class="space-y-4">
              <h3 class="text-lg font-bold text-gray-900 dark:text-white">{{ 'create.step5.title' | translate }}</h3>
              <div class="grid grid-cols-1 gap-3">
                <button
                  type="button"
                  (click)="publicAccessible = true; nextStep()"
                  class="p-4 rounded-xl border border-gray-200 dark:border-gray-700 text-left flex items-center justify-between transition-all hover:bg-gray-50 dark:hover:bg-gray-800"
                  [ngClass]="publicAccessible === true ? 'border-purple-600 dark:border-purple-500 bg-purple-50 dark:bg-purple-950/40' : ''"
                >
                  <span class="font-bold text-sm text-gray-900 dark:text-white">{{ 'create.step5.public' | translate }}</span>
                  <span class="text-purple-600 dark:text-purple-400 font-bold">&rarr;</span>
                </button>

                <button
                  type="button"
                  (click)="publicAccessible = false; nextStep()"
                  class="p-4 rounded-xl border border-gray-200 dark:border-gray-700 text-left flex items-center justify-between transition-all hover:bg-gray-50 dark:hover:bg-gray-800"
                  [ngClass]="publicAccessible === false ? 'border-purple-600 dark:border-purple-500 bg-purple-50 dark:bg-purple-950/40' : ''"
                >
                  <span class="font-bold text-sm text-gray-900 dark:text-white">{{ 'create.step5.customer' | translate }}</span>
                  <span class="text-purple-600 dark:text-purple-400 font-bold">&rarr;</span>
                </button>
              </div>
            </div>
          }

          <!-- Step 6: Wheelchair Accessibility (PERSISTENCE STEP) -->
          @if (currentStep() === 6) {
            <div class="space-y-4">
              <h3 class="text-lg font-bold text-gray-900 dark:text-white">{{ 'create.step6.title' | translate }}</h3>
              <div class="grid grid-cols-1 gap-3">
                <button
                  type="button"
                  (click)="hasWheelchairAccess = true; persistBaselineAndNext()"
                  class="p-4 rounded-xl border border-gray-200 dark:border-gray-700 text-left flex items-center justify-between transition-all hover:bg-gray-50 dark:hover:bg-gray-800"
                  [ngClass]="hasWheelchairAccess === true ? 'border-purple-600 dark:border-purple-500 bg-purple-50 dark:bg-purple-950/40' : ''"
                >
                  <span class="font-bold text-sm text-gray-900 dark:text-white">{{ 'create.step6.yes' | translate }}</span>
                  <span class="text-purple-600 dark:text-purple-400 font-bold">&rarr;</span>
                </button>

                <button
                  type="button"
                  (click)="hasWheelchairAccess = false; persistBaselineAndNext()"
                  class="p-4 rounded-xl border border-gray-200 dark:border-gray-700 text-left flex items-center justify-between transition-all hover:bg-gray-50 dark:hover:bg-gray-800"
                  [ngClass]="hasWheelchairAccess === false ? 'border-purple-600 dark:border-purple-500 bg-purple-50 dark:bg-purple-950/40' : ''"
                >
                  <span class="font-bold text-sm text-gray-900 dark:text-white">{{ 'create.step6.no' | translate }}</span>
                  <span class="text-purple-600 dark:text-purple-400 font-bold">&rarr;</span>
                </button>
              </div>
            </div>
          }

          <!-- Step 7: Euro-Key -->
          @if (currentStep() === 7) {
            <div class="space-y-4">
              <h3 class="text-lg font-bold text-gray-900 dark:text-white">{{ 'create.step7.title' | translate }}</h3>
              <div class="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  (click)="euroKey = 'yes'; savePatchAndNext()"
                  class="p-4 rounded-xl border border-gray-200 dark:border-gray-700 text-center font-bold text-sm text-gray-900 dark:text-white transition-all hover:bg-gray-50 dark:hover:bg-gray-800"
                  [ngClass]="euroKey === 'yes' ? 'border-purple-600 dark:border-purple-500 bg-purple-50 dark:bg-purple-950/40' : ''"
                >
                  {{ 'common.yes' | translate }}
                </button>
                <button
                  type="button"
                  (click)="euroKey = 'no'; savePatchAndNext()"
                  class="p-4 rounded-xl border border-gray-200 dark:border-gray-700 text-center font-bold text-sm text-gray-900 dark:text-white transition-all hover:bg-gray-50 dark:hover:bg-gray-800"
                  [ngClass]="euroKey === 'no' ? 'border-purple-600 dark:border-purple-500 bg-purple-50 dark:bg-purple-950/40' : ''"
                >
                  {{ 'common.no' | translate }}
                </button>
              </div>
            </div>
          }

          <!-- Step 8: Changing Table -->
          @if (currentStep() === 8) {
            <div class="space-y-4">
              <h3 class="text-lg font-bold text-gray-900 dark:text-white">{{ 'create.step8.title' | translate }}</h3>
              <div class="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  (click)="hasChangingTable = true; savePatchAndNext()"
                  class="p-4 rounded-xl border border-gray-200 dark:border-gray-700 text-center font-bold text-sm text-gray-900 dark:text-white transition-all hover:bg-gray-50 dark:hover:bg-gray-800"
                  [ngClass]="hasChangingTable === true ? 'border-purple-600 dark:border-purple-500 bg-purple-50 dark:bg-purple-950/40' : ''"
                >
                  {{ 'common.yes' | translate }}
                </button>
                <button
                  type="button"
                  (click)="hasChangingTable = false; savePatchAndNext()"
                  class="p-4 rounded-xl border border-gray-200 dark:border-gray-700 text-center font-bold text-sm text-gray-900 dark:text-white transition-all hover:bg-gray-50 dark:hover:bg-gray-800"
                  [ngClass]="hasChangingTable === false ? 'border-purple-600 dark:border-purple-500 bg-purple-50 dark:bg-purple-950/40' : ''"
                >
                  {{ 'common.no' | translate }}
                </button>
              </div>
            </div>
          }

          <!-- Step 9: Gender Separation / Unisex -->
          @if (currentStep() === 9) {
            <div class="space-y-4">
              <h3 class="text-lg font-bold text-gray-900 dark:text-white">{{ 'create.step9.title' | translate }}</h3>
              <div class="grid grid-cols-1 gap-3">
                <button
                  type="button"
                  (click)="isGenderSeparated = true; isUnisex = false; savePatchAndNext()"
                  class="p-4 rounded-xl border border-gray-200 dark:border-gray-700 text-left font-bold text-sm text-gray-900 dark:text-white transition-all hover:bg-gray-50 dark:hover:bg-gray-800"
                  [ngClass]="isGenderSeparated ? 'border-purple-600 dark:border-purple-500 bg-purple-50 dark:bg-purple-950/40' : ''"
                >
                  {{ 'create.step9.separated' | translate }}
                </button>
                <button
                  type="button"
                  (click)="isGenderSeparated = false; isUnisex = true; savePatchAndNext()"
                  class="p-4 rounded-xl border border-gray-200 dark:border-gray-700 text-left font-bold text-sm text-gray-900 dark:text-white transition-all hover:bg-gray-50 dark:hover:bg-gray-800"
                  [ngClass]="isUnisex ? 'border-purple-600 dark:border-purple-500 bg-purple-50 dark:bg-purple-950/40' : ''"
                >
                  {{ 'create.step9.unisex' | translate }}
                </button>
              </div>
            </div>
          }

          <!-- Step 10: Storage Space -->
          @if (currentStep() === 10) {
            <div class="space-y-4">
              <h3 class="text-lg font-bold text-gray-900 dark:text-white">{{ 'create.step10.title' | translate }}</h3>
              <div class="grid grid-cols-1 gap-3">
                <button
                  type="button"
                  (click)="storageSpace = 'none'; savePatchAndNext()"
                  class="p-3.5 rounded-xl border border-gray-200 dark:border-gray-700 text-left font-bold text-sm text-gray-900 dark:text-white transition-all hover:bg-gray-50 dark:hover:bg-gray-800"
                  [ngClass]="storageSpace === 'none' ? 'border-purple-600 dark:border-purple-500 bg-purple-50 dark:bg-purple-950/40' : ''"
                >
                  {{ 'create.step10.none' | translate }}
                </button>
                <button
                  type="button"
                  (click)="storageSpace = 'little'; savePatchAndNext()"
                  class="p-3.5 rounded-xl border border-gray-200 dark:border-gray-700 text-left font-bold text-sm text-gray-900 dark:text-white transition-all hover:bg-gray-50 dark:hover:bg-gray-800"
                  [ngClass]="storageSpace === 'little' ? 'border-purple-600 dark:border-purple-500 bg-purple-50 dark:bg-purple-950/40' : ''"
                >
                  {{ 'create.step10.little' | translate }}
                </button>
                <button
                  type="button"
                  (click)="storageSpace = 'much'; savePatchAndNext()"
                  class="p-3.5 rounded-xl border border-gray-200 dark:border-gray-700 text-left font-bold text-sm text-gray-900 dark:text-white transition-all hover:bg-gray-50 dark:hover:bg-gray-800"
                  [ngClass]="storageSpace === 'much' ? 'border-purple-600 dark:border-purple-500 bg-purple-50 dark:bg-purple-950/40' : ''"
                >
                  {{ 'create.step10.much' | translate }}
                </button>
              </div>
            </div>
          }

          <!-- Step 11: Opening Hours -->
          @if (currentStep() === 11) {
            <div class="space-y-4">
              <h3 class="text-lg font-bold text-gray-900 dark:text-white">{{ 'create.step11.title' | translate }}</h3>
              <div class="grid grid-cols-1 gap-3">
                <button
                  type="button"
                  (click)="isOpen247 = true; savePatchAndNext()"
                  class="p-4 rounded-xl border border-gray-200 dark:border-gray-700 text-left font-bold text-sm text-gray-900 dark:text-white transition-all hover:bg-gray-50 dark:hover:bg-gray-800"
                  [ngClass]="isOpen247 ? 'border-purple-600 dark:border-purple-500 bg-purple-50 dark:bg-purple-950/40' : ''"
                >
                  {{ 'create.step11.247' | translate }}
                </button>
                <button
                  type="button"
                  (click)="isOpen247 = false; nextStep()"
                  class="p-4 rounded-xl border border-gray-200 dark:border-gray-700 text-left font-bold text-sm text-gray-900 dark:text-white transition-all hover:bg-gray-50 dark:hover:bg-gray-800"
                  [ngClass]="!isOpen247 ? 'border-purple-600 dark:border-purple-500 bg-purple-50 dark:bg-purple-950/40' : ''"
                >
                  {{ 'create.step11.custom' | translate }}
                </button>
              </div>
            </div>
          }

          <!-- Step 12: Outside Access -->
          @if (currentStep() === 12) {
            <div class="space-y-4">
              <h3 class="text-lg font-bold text-gray-900 dark:text-white">{{ 'create.step12.title' | translate }}</h3>
              <p class="text-xs text-gray-500 dark:text-gray-400">{{ 'create.step12.text' | translate }}</p>
              <div class="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  (click)="accessibleOutsideOpeningTimes = true; savePatchAndNext()"
                  class="p-4 rounded-xl border border-gray-200 dark:border-gray-700 text-center font-bold text-sm text-gray-900 dark:text-white transition-all hover:bg-gray-50 dark:hover:bg-gray-800"
                  [ngClass]="accessibleOutsideOpeningTimes === true ? 'border-purple-600 dark:border-purple-500 bg-purple-50 dark:bg-purple-950/40' : ''"
                >
                  {{ 'common.yes' | translate }}
                </button>
                <button
                  type="button"
                  (click)="accessibleOutsideOpeningTimes = false; savePatchAndNext()"
                  class="p-4 rounded-xl border border-gray-200 dark:border-gray-700 text-center font-bold text-sm text-gray-900 dark:text-white transition-all hover:bg-gray-50 dark:hover:bg-gray-800"
                  [ngClass]="accessibleOutsideOpeningTimes === false ? 'border-purple-600 dark:border-purple-500 bg-purple-50 dark:bg-purple-950/40' : ''"
                >
                  {{ 'common.no' | translate }}
                </button>
              </div>
            </div>
          }

          <!-- Step 13: Website -->
          @if (currentStep() === 13) {
            <div class="space-y-4">
              <h3 class="text-lg font-bold text-gray-900 dark:text-white">{{ 'create.step13.title' | translate }}</h3>
              <input
                type="url"
                [(ngModel)]="website"
                [placeholder]="'create.step13.placeholder' | translate"
                class="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-purple-500"
              />
            </div>
          }

          <!-- Step 14: Address Confirmation -->
          @if (currentStep() === 14) {
            <div class="space-y-4">
              <h3 class="text-lg font-bold text-gray-900 dark:text-white">{{ 'create.step14.title' | translate }}</h3>
              <input
                type="text"
                [(ngModel)]="address"
                placeholder="Straße, Hausnummer, PLZ, Ort..."
                class="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-purple-500"
              />
            </div>
          }

          <!-- Step 15: Comments / Directions -->
          @if (currentStep() === 15) {
            <div class="space-y-4">
              <h3 class="text-lg font-bold text-gray-900 dark:text-white">{{ 'create.step15.title' | translate }}</h3>
              <textarea
                rows="4"
                [(ngModel)]="comment"
                [placeholder]="'create.step15.placeholder' | translate"
                class="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-purple-500"
              ></textarea>
            </div>
          }

          <!-- Step 16: Photos & Completion -->
          @if (currentStep() === 16) {
            <div class="space-y-6 text-center py-4">
              <div class="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center">
                <svg class="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </div>

              <h3 class="text-2xl font-black text-gray-900 dark:text-white">{{ 'create.step16.success' | translate }}</h3>
              <p class="text-sm text-gray-600 dark:text-gray-300 max-w-sm mx-auto">
                {{ 'create.step16.thanks' | translate }}
              </p>

              <!-- Add Photo Button -->
              <div class="pt-2">
                <button
                  type="button"
                  (click)="showPhotoModal.set(true)"
                  class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-50 dark:bg-purple-950/50 hover:bg-purple-100 dark:hover:bg-purple-900/50 text-purple-700 dark:text-purple-300 font-semibold text-xs transition-colors border border-purple-100 dark:border-purple-800/40"
                >
                  <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect width="18" height="18" x="3" y="3" rx="2" ry="2"/>
                    <circle cx="9" cy="9" r="2"/>
                    <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
                  </svg>
                  <span>{{ 'photo.upload' | translate }}</span>
                </button>
              </div>
            </div>
          }
        </div>

        <!-- Wizard Footer Controls -->
        <div class="p-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/80 flex items-center justify-between">
          @if (currentStep() > 1 && currentStep() < 16) {
            <button
              type="button"
              (click)="prevStep()"
              class="px-4 py-2 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              {{ 'common.back' | translate }}
            </button>
          } @else {
            <div></div>
          }

          @if (currentStep() < 16) {
            <button
              type="button"
              (click)="nextStep()"
              class="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-md transition-all active:scale-95"
            >
              {{ (currentStep() === 1 ? 'create.step1.btn' : 'common.next') | translate }} &rarr;
            </button>
          } @else {
            <button
              type="button"
              (click)="onComplete()"
              class="px-8 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-md transition-all active:scale-95"
            >
              {{ 'common.done' | translate }}
            </button>
          }
        </div>
      </div>
    </div>

    <!-- Photo Upload Legal Modal -->
    @if (showPhotoModal()) {
      <app-photo-legal-modal
        [toiletId]="createdToiletId"
        (onCancel)="showPhotoModal.set(false)"
        (onUploaded)="onPhotoUploaded($event)"
      />
    }
  `
})
export class CreateWizardComponent implements OnInit {
  private readonly api = inject(WcInfoApiService);
  private readonly placesService = inject(PlacesService);
  private readonly translationService = inject(TranslationService);

  @Input() initialCoords: Coordinates | null = null;

  @Output() onCancel = new EventEmitter<void>();
  @Output() onCreated = new EventEmitter<Toilet>();

  readonly totalSteps = 16;
  readonly currentStep = signal<number>(1);
  readonly showPhotoModal = signal<boolean>(false);
  readonly establishmentSuggestions = signal<PlaceSuggestion[]>([]);

  // Form Fields
  lat = 52.520008;
  lon = 13.404954;
  owner = '';
  placeId: string | null = null;
  name = '';
  publicAccessible: boolean | null = true;
  hasWheelchairAccess: boolean | null = true;
  euroKey: string | null = null;
  hasChangingTable: boolean | null = null;
  isGenderSeparated = false;
  isUnisex = true;
  storageSpace = 'none';
  isOpen247 = true;
  accessibleOutsideOpeningTimes = false;
  website = '';
  address = '';
  comment = '';

  createdToiletId?: number;

  ngOnInit(): void {
    if (this.initialCoords) {
      this.lat = this.initialCoords.lat;
      this.lon = this.initialCoords.lon;
    }
  }

  nextStep(): void {
    if (this.currentStep() === 6) {
      this.persistBaselineAndNext();
    } else if (this.currentStep() > 6 && this.currentStep() < 16) {
      this.savePatchAndNext();
    } else {
      this.currentStep.update((s) => Math.min(s + 1, this.totalSteps));
    }
  }

  prevStep(): void {
    this.currentStep.update((s) => Math.max(s - 1, 1));
  }

  searchEstablishment(query: string): void {
    if (query.trim().length >= 2) {
      this.placesService.searchPlaces(query).subscribe((results) => {
        this.establishmentSuggestions.set(results);
      });
    } else {
      this.establishmentSuggestions.set([]);
    }
  }

  selectEstablishment(place: PlaceSuggestion): void {
    this.owner = place.primaryText;
    this.placeId = place.placeId;
    this.establishmentSuggestions.set([]);
  }

  persistBaselineAndNext(): void {
    const payload: AddToiletPayload = {
      lat: this.lat,
      lon: this.lon,
      owner: this.owner || null,
      placeId: this.placeId,
      name: this.name || null,
      publicAccessible: this.publicAccessible ?? true,
      hasWheelchairAccess: this.hasWheelchairAccess ?? false,
      isUnisex: this.isUnisex,
      isGenderSeparated: this.isGenderSeparated
    };

    this.api.addToilet(payload).subscribe({
      next: (res) => {
        this.createdToiletId = res.id;
        this.currentStep.set(7);
      },
      error: () => {
        // Proceed even if network error
        this.currentStep.set(7);
      }
    });
  }

  savePatchAndNext(): void {
    if (this.createdToiletId) {
      const payload: UpdateToiletPayload = {
        lat: this.lat,
        lon: this.lon,
        name: this.name || null,
        owner: this.owner || null,
        euroKey: this.euroKey,
        hasChangingTable: this.hasChangingTable ?? false,
        isGenderSeparated: this.isGenderSeparated,
        isUnisex: this.isUnisex,
        storageSpace: this.storageSpace,
        accessibleOutsideOpeningTimes: this.accessibleOutsideOpeningTimes,
        website: this.website || null,
        address: this.address || null,
        comment: this.comment || null
      };

      this.api.updateToilet(this.createdToiletId, payload).subscribe();
    }

    if (this.currentStep() + 1 === 16) {
      this.triggerConfetti();
    }

    this.currentStep.update((s) => Math.min(s + 1, this.totalSteps));
  }

  onPhotoUploaded(data: { url: string; thumbUrl?: string; filename: string }): void {
    this.showPhotoModal.set(false);
  }

  triggerConfetti(): void {
    try {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
    } catch {
      // Ignore
    }
  }

  onComplete(): void {
    const created: Toilet = {
      id: this.createdToiletId || Date.now(),
      name: this.name || 'Öffentliche Toilette',
      owner: this.owner,
      lat: this.lat,
      lon: this.lon,
      publicAccessible: this.publicAccessible ?? true,
      hasWheelchairAccess: this.hasWheelchairAccess ?? false,
      hasChangingTable: this.hasChangingTable ?? false,
      euroKey: this.euroKey,
      isUnisex: this.isUnisex,
      isGenderSeparated: this.isGenderSeparated,
      storageSpace: this.storageSpace,
      address: this.address,
      website: this.website,
      comment: this.comment,
      photos: []
    };

    this.onCreated.emit(created);
  }
}
