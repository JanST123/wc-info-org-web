import {
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnInit,
  Output,
  ViewChild,
  computed,
  inject,
  signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Coordinates, LocationService } from '../../core/services/location.service';
import {
  AddToiletPayload,
  GooglePlacesPeriod,
  Toilet,
  UpdateToiletPayload
} from '../../core/models/toilet.model';
import { WcInfoApiService } from '../../core/services/wc-info-api.service';
import { GoogleMapsLoaderService } from '../../core/services/google-maps-loader.service';
import { TranslatePipe } from '../../core/pipes/translate.pipe';
import { TranslationService } from '../../core/services/translation.service';
import { PhotoLegalModalComponent } from '../photo-upload/photo-legal-modal.component';
import confetti from 'canvas-confetti';

export type WizardStepId =
  | 'place_id'
  | 'name'
  | 'sensor_location'
  | 'map_location'
  | 'gender_separated'
  | 'wheelchair'
  | 'euro_key'
  | 'address'
  | 'opening_hours'
  | 'public_accessible'
  | 'accessible_outside'
  | 'storage_space'
  | 'photo'
  | 'comment'
  | 'success';

export interface NearbyPlaceOption {
  placeId: string;
  name: string;
  vicinity?: string;
  distanceMeters?: number;
  lat?: number;
  lon?: number;
  formattedAddress?: string;
  openingHours?: GooglePlacesPeriod[];
}

@Component({
  selector: 'app-create-wizard',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe, PhotoLegalModalComponent],
  template: `
    <div class="fixed inset-0 z-50 flex items-center justify-center p-0 md:p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
      <div
        class="bg-white dark:bg-gray-900 w-full h-full md:h-auto md:max-h-[92vh] md:max-w-xl md:rounded-2xl shadow-2xl flex flex-col overflow-hidden text-gray-800 dark:text-gray-100"
        (click)="$event.stopPropagation()"
      >
        <!-- Top Wizard Header & Step Indicator -->
        <div class="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gray-50/80 dark:bg-gray-800/80">
          <div class="flex flex-col">
            <div class="flex items-center gap-2">
              <span class="text-xs font-bold text-purple-700 dark:text-purple-400 uppercase tracking-wider">
                {{ 'create.title' | translate }}
              </span>
              @if (isSaved()) {
                <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                  {{ 'create.savedBadge' | translate }}
                </span>
              }
            </div>
            @if (currentStepId() !== 'success') {
              <span class="text-xs text-gray-500 dark:text-gray-400 font-medium mt-0.5">
                {{ 'create.step' | translate: { current: currentStepNumber(), total: totalQuestions() } }}
              </span>
            }
          </div>

          <button
            type="button"
            (click)="handleClose()"
            class="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
            title="Schließen"
          >
            <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <!-- Progress Bar -->
        @if (currentStepId() !== 'success') {
          <div class="w-full bg-gray-100 dark:bg-gray-800 h-1.5 overflow-hidden">
            <div
              class="bg-gradient-to-r from-purple-600 to-indigo-600 h-full transition-all duration-300 ease-out"
              [style.width.%]="(currentStepNumber() / totalQuestions()) * 100"
            ></div>
          </div>
        }

        <!-- Wizard Step Body -->
        <div class="flex-1 overflow-y-auto p-6 space-y-6">

          <!-- 1. STEP: place_id -->
          @if (currentStepId() === 'place_id') {
            <div class="space-y-4">
              <div class="space-y-1">
                <h3 class="text-lg font-bold text-gray-900 dark:text-white leading-tight">
                  {{ 'create.placeNearbyTitle' | translate }}
                </h3>
                <p class="text-xs text-gray-500 dark:text-gray-400">
                  {{ 'create.placeNearbySub' | translate }}
                </p>
              </div>

              @if (loadingNearbyPlaces()) {
                <div class="py-8 flex flex-col items-center justify-center space-y-3 text-gray-400">
                  <div class="w-7 h-7 border-2 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
                  <span class="text-xs">{{ 'create.locatingPlaces' | translate }}</span>
                </div>
              } @else {
                <div class="space-y-2.5">
                  @for (place of nearbyPlaces(); track place.placeId) {
                    <button
                      type="button"
                      (click)="selectPlace(place)"
                      class="w-full p-3.5 rounded-xl border text-left flex items-center justify-between transition-all"
                      [ngClass]="selectedPlace()?.placeId === place.placeId
                        ? 'border-purple-600 dark:border-purple-500 bg-purple-50 dark:bg-purple-950/40 text-purple-900 dark:text-purple-100 shadow-xs'
                        : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/60 text-gray-800 dark:text-gray-200'"
                    >
                      <div class="flex items-start gap-3 min-w-0 pr-2">
                        <div class="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 shrink-0 mt-0.5">
                          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                            <circle cx="12" cy="10" r="3"/>
                          </svg>
                        </div>
                        <div class="min-w-0">
                          <div class="font-bold text-sm truncate">{{ place.name }}</div>
                          @if (place.vicinity) {
                            <div class="text-xs text-gray-500 dark:text-gray-400 truncate">{{ place.vicinity }}</div>
                          }
                          @if (place.distanceMeters !== undefined) {
                            <div class="text-[11px] font-semibold text-purple-600 dark:text-purple-400 mt-0.5">
                              ca. {{ place.distanceMeters }} m entfernt
                            </div>
                          }
                        </div>
                      </div>
                      <span class="text-purple-600 dark:text-purple-400 font-bold">&rarr;</span>
                    </button>
                  }

                  <!-- Option 4: None of these places -->
                  <button
                    type="button"
                    (click)="selectNoPlace()"
                    class="w-full p-3.5 rounded-xl border text-left flex items-center justify-between transition-all"
                    [ngClass]="selectedPlaceNoChoice()
                      ? 'border-purple-600 dark:border-purple-500 bg-purple-50 dark:bg-purple-950/40 text-purple-900 dark:text-purple-100 shadow-xs'
                      : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/60 text-gray-800 dark:text-gray-200'"
                  >
                    <div class="flex items-center gap-3">
                      <div class="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 shrink-0">
                        <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <circle cx="12" cy="12" r="10"/>
                          <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
                        </svg>
                      </div>
                      <span class="font-bold text-sm">{{ 'create.noneOfThesePlaces' | translate }}</span>
                    </div>
                    <span class="text-purple-600 dark:text-purple-400 font-bold">&rarr;</span>
                  </button>
                </div>
              }
            </div>
          }

          <!-- 2. STEP: name -->
          @if (currentStepId() === 'name') {
            <div class="space-y-4">
              <div class="space-y-1">
                <h3 class="text-lg font-bold text-gray-900 dark:text-white leading-tight">
                  {{ 'create.nameTitle' | translate }}
                </h3>
                <p class="text-xs text-gray-500 dark:text-gray-400">
                  {{ 'create.nameSub' | translate }}
                </p>
              </div>

              <div class="space-y-2">
                <input
                  type="text"
                  [(ngModel)]="name"
                  [placeholder]="'create.namePlaceholder' | translate"
                  class="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-purple-500 outline-hidden transition-all"
                  autofocus
                />
                @if (selectedPlace()) {
                  <div class="p-2.5 bg-gray-50 dark:bg-gray-800/60 rounded-lg text-xs text-gray-600 dark:text-gray-300 flex items-center gap-2">
                    <span class="font-bold text-purple-600 dark:text-purple-400">Ort:</span>
                    <span>{{ selectedPlace()?.name }}</span>
                  </div>
                }
              </div>
            </div>
          }

          <!-- 3. STEP: sensor_location -->
          @if (currentStepId() === 'sensor_location') {
            <div class="space-y-4">
              <div class="space-y-1">
                <h3 class="text-lg font-bold text-gray-900 dark:text-white leading-tight">
                  {{ 'create.sensorTitle' | translate }}
                </h3>
                <p class="text-xs text-gray-500 dark:text-gray-400">
                  {{ 'create.sensorSub' | translate }}
                </p>
              </div>

              <div class="grid grid-cols-1 gap-3">
                <button
                  type="button"
                  (click)="handleSensorChoice(true)"
                  class="p-4 rounded-xl border border-gray-200 dark:border-gray-700 text-left flex items-center justify-between transition-all hover:bg-gray-50 dark:hover:bg-gray-800/60"
                  [ngClass]="usedSensorLocation() === true ? 'border-purple-600 dark:border-purple-500 bg-purple-50 dark:bg-purple-950/40 text-purple-950 dark:text-purple-100' : ''"
                >
                  <div class="flex items-center gap-3">
                    <div class="p-2 rounded-lg bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 shrink-0">
                      <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="3"/>
                        <path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>
                      </svg>
                    </div>
                    <span class="font-bold text-sm text-gray-900 dark:text-white">{{ 'create.sensorYes' | translate }}</span>
                  </div>
                  <span class="text-purple-600 dark:text-purple-400 font-bold">&rarr;</span>
                </button>

                <button
                  type="button"
                  (click)="handleSensorChoice(false)"
                  class="p-4 rounded-xl border border-gray-200 dark:border-gray-700 text-left flex items-center justify-between transition-all hover:bg-gray-50 dark:hover:bg-gray-800/60"
                  [ngClass]="usedSensorLocation() === false ? 'border-purple-600 dark:border-purple-500 bg-purple-50 dark:bg-purple-950/40 text-purple-950 dark:text-purple-100' : ''"
                >
                  <span class="font-bold text-sm text-gray-900 dark:text-white">{{ 'create.sensorNo' | translate }}</span>
                  <span class="text-purple-600 dark:text-purple-400 font-bold">&rarr;</span>
                </button>
              </div>
            </div>
          }

          <!-- 4. CONDITIONAL STEP: map_location (Only if no place selected and sensor = no) -->
          @if (currentStepId() === 'map_location') {
            <div class="space-y-4">
              <div class="space-y-1">
                <h3 class="text-lg font-bold text-gray-900 dark:text-white leading-tight">
                  {{ 'create.mapTitle' | translate }}
                </h3>
                <p class="text-xs text-gray-500 dark:text-gray-400">
                  {{ 'create.mapSub' | translate }}
                </p>
              </div>

              <!-- Map Container -->
              <div class="relative w-full h-64 md:h-72 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 shadow-inner">
                <div #mapContainer class="w-full h-full"></div>
                <div class="absolute bottom-2 left-2 right-2 bg-white/90 dark:bg-gray-900/90 backdrop-blur-xs px-3 py-1.5 rounded-lg text-[11px] text-gray-600 dark:text-gray-300 text-center font-mono border border-gray-200 dark:border-gray-700 shadow-xs">
                  {{ lat().toFixed(6) }}, {{ lon().toFixed(6) }}
                </div>
              </div>

              <button
                type="button"
                (click)="advanceAfterMap()"
                class="w-full py-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-sm font-bold shadow-md transition-all active:scale-98"
              >
                {{ 'create.mapChooseBtn' | translate }}
              </button>
            </div>
          }

          <!-- 5. STEP: gender_separated -->
          @if (currentStepId() === 'gender_separated') {
            <div class="space-y-4">
              <h3 class="text-lg font-bold text-gray-900 dark:text-white leading-tight">
                {{ 'create.genderTitle' | translate }}
              </h3>

              <div class="grid grid-cols-1 gap-3">
                <button
                  type="button"
                  (click)="setGender(true)"
                  class="p-4 rounded-xl border text-left flex items-center justify-between transition-all"
                  [ngClass]="isGenderSeparated() === true
                    ? 'border-purple-600 dark:border-purple-500 bg-purple-50 dark:bg-purple-950/40 text-purple-950 dark:text-purple-100 shadow-xs'
                    : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/60 text-gray-900 dark:text-white'"
                >
                  <span class="font-bold text-sm">{{ 'create.genderYes' | translate }}</span>
                  <span class="text-purple-600 dark:text-purple-400 font-bold">&rarr;</span>
                </button>

                <button
                  type="button"
                  (click)="setGender(false)"
                  class="p-4 rounded-xl border text-left flex items-center justify-between transition-all"
                  [ngClass]="isGenderSeparated() === false
                    ? 'border-purple-600 dark:border-purple-500 bg-purple-50 dark:bg-purple-950/40 text-purple-950 dark:text-purple-100 shadow-xs'
                    : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/60 text-gray-900 dark:text-white'"
                >
                  <span class="font-bold text-sm">{{ 'create.genderNo' | translate }}</span>
                  <span class="text-purple-600 dark:text-purple-400 font-bold">&rarr;</span>
                </button>
              </div>
            </div>
          }

          <!-- 6. STEP: wheelchair (barrier-free) -->
          @if (currentStepId() === 'wheelchair') {
            <div class="space-y-4">
              <h3 class="text-lg font-bold text-gray-900 dark:text-white leading-tight">
                {{ 'create.wheelchairTitle' | translate }}
              </h3>

              <div class="grid grid-cols-1 gap-3">
                <button
                  type="button"
                  (click)="setWheelchair(true)"
                  class="p-4 rounded-xl border text-left flex items-center justify-between transition-all"
                  [ngClass]="hasWheelchairAccess() === true
                    ? 'border-purple-600 dark:border-purple-500 bg-purple-50 dark:bg-purple-950/40 text-purple-950 dark:text-purple-100 shadow-xs'
                    : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/60 text-gray-900 dark:text-white'"
                >
                  <span class="font-bold text-sm">{{ 'create.wheelchairYes' | translate }}</span>
                  <span class="text-purple-600 dark:text-purple-400 font-bold">&rarr;</span>
                </button>

                <button
                  type="button"
                  (click)="setWheelchair(false)"
                  class="p-4 rounded-xl border text-left flex items-center justify-between transition-all"
                  [ngClass]="hasWheelchairAccess() === false
                    ? 'border-purple-600 dark:border-purple-500 bg-purple-50 dark:bg-purple-950/40 text-purple-950 dark:text-purple-100 shadow-xs'
                    : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/60 text-gray-900 dark:text-white'"
                >
                  <span class="font-bold text-sm">{{ 'create.wheelchairNo' | translate }}</span>
                  <span class="text-purple-600 dark:text-purple-400 font-bold">&rarr;</span>
                </button>
              </div>
            </div>
          }

          <!-- 7. CONDITIONAL STEP: euro_key (Only if wheelchair = true) -->
          @if (currentStepId() === 'euro_key') {
            <div class="space-y-4">
              <h3 class="text-lg font-bold text-gray-900 dark:text-white leading-tight">
                {{ 'create.euroKeyTitle' | translate }}
              </h3>

              <div class="grid grid-cols-1 gap-3">
                <button
                  type="button"
                  (click)="setEuroKey('yes')"
                  class="p-4 rounded-xl border text-left flex items-center justify-between transition-all"
                  [ngClass]="euroKey() === 'yes'
                    ? 'border-purple-600 dark:border-purple-500 bg-purple-50 dark:bg-purple-950/40 text-purple-950 dark:text-purple-100 shadow-xs'
                    : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/60 text-gray-900 dark:text-white'"
                >
                  <span class="font-bold text-sm">{{ 'create.euroKeyYes' | translate }}</span>
                  <span class="text-purple-600 dark:text-purple-400 font-bold">&rarr;</span>
                </button>

                <button
                  type="button"
                  (click)="setEuroKey('unknown')"
                  class="p-4 rounded-xl border text-left flex items-center justify-between transition-all"
                  [ngClass]="euroKey() === 'unknown'
                    ? 'border-purple-600 dark:border-purple-500 bg-purple-50 dark:bg-purple-950/40 text-purple-950 dark:text-purple-100 shadow-xs'
                    : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/60 text-gray-900 dark:text-white'"
                >
                  <span class="font-bold text-sm">{{ 'create.euroKeyUnsure' | translate }}</span>
                  <span class="text-purple-600 dark:text-purple-400 font-bold">&rarr;</span>
                </button>

                <button
                  type="button"
                  (click)="setEuroKey('no')"
                  class="p-4 rounded-xl border text-left flex items-center justify-between transition-all"
                  [ngClass]="euroKey() === 'no'
                    ? 'border-purple-600 dark:border-purple-500 bg-purple-50 dark:bg-purple-950/40 text-purple-950 dark:text-purple-100 shadow-xs'
                    : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/60 text-gray-900 dark:text-white'"
                >
                  <span class="font-bold text-sm">{{ 'create.euroKeyNo' | translate }}</span>
                  <span class="text-purple-600 dark:text-purple-400 font-bold">&rarr;</span>
                </button>
              </div>
            </div>
          }

          <!-- 8. CONDITIONAL STEP: address (Only if no place selected) -->
          @if (currentStepId() === 'address') {
            <div class="space-y-4">
              <div class="space-y-1">
                <h3 class="text-lg font-bold text-gray-900 dark:text-white leading-tight">
                  {{ 'create.addressTitle' | translate }}
                </h3>
                <p class="text-xs text-gray-500 dark:text-gray-400">
                  {{ 'create.addressSub' | translate }}
                </p>
              </div>

              <div class="space-y-4">
                <input
                  type="text"
                  [(ngModel)]="address"
                  [placeholder]="'create.addressPlaceholder' | translate"
                  class="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-purple-500 outline-hidden transition-all"
                />

                <div class="flex items-center gap-3">
                  <button
                    type="button"
                    (click)="saveAddressAndNext()"
                    class="flex-1 py-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-sm font-bold shadow-md transition-all active:scale-98"
                  >
                    {{ 'create.saveAddress' | translate }}
                  </button>
                  <button
                    type="button"
                    (click)="skipAddressAndNext()"
                    class="px-4 py-3 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-semibold transition-all"
                  >
                    {{ 'create.skipAddress' | translate }}
                  </button>
                </div>
              </div>
            </div>
          }

          <!-- 9. CONDITIONAL STEP: opening_hours (Only if no place or place has no hours) -->
          @if (currentStepId() === 'opening_hours') {
            <div class="space-y-4">
              @if (knowsOpeningHours() === null) {
                <div class="space-y-1">
                  <h3 class="text-lg font-bold text-gray-900 dark:text-white leading-tight">
                    {{ 'create.hoursPromptTitle' | translate }}
                  </h3>
                  <p class="text-xs text-gray-500 dark:text-gray-400">
                    {{ 'create.hoursPromptSub' | translate }}
                  </p>
                </div>

                <div class="grid grid-cols-1 gap-3">
                  <button
                    type="button"
                    (click)="knowsOpeningHours.set(true)"
                    class="p-4 rounded-xl border border-gray-200 dark:border-gray-700 text-left flex items-center justify-between transition-all hover:bg-gray-50 dark:hover:bg-gray-800/60"
                  >
                    <span class="font-bold text-sm text-gray-900 dark:text-white">{{ 'create.hoursPromptYes' | translate }}</span>
                    <span class="text-purple-600 dark:text-purple-400 font-bold">&rarr;</span>
                  </button>

                  <button
                    type="button"
                    (click)="skipOpeningHours()"
                    class="p-4 rounded-xl border border-gray-200 dark:border-gray-700 text-left flex items-center justify-between transition-all hover:bg-gray-50 dark:hover:bg-gray-800/60"
                  >
                    <span class="font-bold text-sm text-gray-900 dark:text-white">{{ 'create.hoursPromptNo' | translate }}</span>
                    <span class="text-purple-600 dark:text-purple-400 font-bold">&rarr;</span>
                  </button>
                </div>
              } @else {
                <!-- Schedule Editor -->
                <div class="space-y-4">
                  <div class="flex items-center justify-between">
                    <h3 class="text-lg font-bold text-gray-900 dark:text-white">
                      {{ 'create.hoursEditorTitle' | translate }}
                    </h3>
                    <button
                      type="button"
                      (click)="knowsOpeningHours.set(null)"
                      class="text-xs text-purple-600 dark:text-purple-400 hover:underline"
                    >
                      {{ 'common.back' | translate }}
                    </button>
                  </div>

                  <!-- 24 Hours Toggle -->
                  <div class="p-3 bg-gray-50 dark:bg-gray-800/60 rounded-xl border border-gray-200 dark:border-gray-700 flex items-center justify-between">
                    <span class="text-sm font-semibold text-gray-900 dark:text-white">{{ 'create.hours247' | translate }}</span>
                    <input
                      type="checkbox"
                      [checked]="hours247()"
                      (change)="hours247.set(!hours247())"
                      class="w-5 h-5 accent-purple-600 rounded"
                    />
                  </div>

                  <!-- Days of Week Selector -->
                  <div class="space-y-1.5">
                    <label class="text-xs font-semibold text-gray-500 dark:text-gray-400">Gültige Tage</label>
                    <div class="grid grid-cols-7 gap-1.5">
                      @for (d of dayOptions; track d.day) {
                        <button
                          type="button"
                          (click)="toggleDay(d.day)"
                          class="py-2 rounded-lg text-xs font-bold transition-colors text-center"
                          [ngClass]="selectedDays().includes(d.day)
                            ? 'bg-purple-600 text-white shadow-xs'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'"
                        >
                          {{ d.label }}
                        </button>
                      }
                    </div>
                  </div>

                  @if (!hours247()) {
                    <!-- Period 1 -->
                    <div class="p-3.5 bg-gray-50 dark:bg-gray-800/60 rounded-xl border border-gray-200 dark:border-gray-700 space-y-2">
                      <div class="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                        {{ 'create.period1' | translate }}
                      </div>
                      <div class="grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <label class="block font-medium text-gray-500 dark:text-gray-400 mb-1">{{ 'create.opensAt' | translate }}</label>
                          <input
                            type="time"
                            [(ngModel)]="period1Open"
                            class="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white"
                          />
                        </div>
                        <div>
                          <label class="block font-medium text-gray-500 dark:text-gray-400 mb-1">{{ 'create.closesAt' | translate }}</label>
                          <input
                            type="time"
                            [(ngModel)]="period1Close"
                            class="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white"
                          />
                        </div>
                      </div>
                    </div>

                    <!-- Period 2 Toggle -->
                    @if (!hasPeriod2()) {
                      <button
                        type="button"
                        (click)="hasPeriod2.set(true)"
                        class="w-full py-2.5 rounded-xl border border-dashed border-purple-300 dark:border-purple-800 text-purple-600 dark:text-purple-400 text-xs font-bold hover:bg-purple-50 dark:hover:bg-purple-950/30 transition-colors"
                      >
                        {{ 'create.addPeriod2' | translate }}
                      </button>
                    } @else {
                      <div class="p-3.5 bg-gray-50 dark:bg-gray-800/60 rounded-xl border border-gray-200 dark:border-gray-700 space-y-2">
                        <div class="flex items-center justify-between">
                          <div class="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                            {{ 'create.period2' | translate }}
                          </div>
                          <button
                            type="button"
                            (click)="hasPeriod2.set(false)"
                            class="text-[11px] text-red-500 hover:underline"
                          >
                            {{ 'create.removePeriod2' | translate }}
                          </button>
                        </div>
                        <div class="grid grid-cols-2 gap-3 text-xs">
                          <div>
                            <label class="block font-medium text-gray-500 dark:text-gray-400 mb-1">{{ 'create.opensAt' | translate }}</label>
                            <input
                              type="time"
                              [(ngModel)]="period2Open"
                              class="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white"
                            />
                          </div>
                          <div>
                            <label class="block font-medium text-gray-500 dark:text-gray-400 mb-1">{{ 'create.closesAt' | translate }}</label>
                            <input
                              type="time"
                              [(ngModel)]="period2Close"
                              class="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white"
                            />
                          </div>
                        </div>
                      </div>
                    }
                  }

                  <button
                    type="button"
                    (click)="saveOpeningHoursAndNext()"
                    class="w-full py-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-sm font-bold shadow-md transition-all active:scale-98"
                  >
                    {{ 'create.saveHours' | translate }}
                  </button>
                </div>
              }
            </div>
          }

          <!-- 10. STEP: public_accessible -->
          @if (currentStepId() === 'public_accessible') {
            <div class="space-y-4">
              <h3 class="text-lg font-bold text-gray-900 dark:text-white leading-tight">
                {{ 'create.publicTitle' | translate }}
              </h3>

              <div class="grid grid-cols-1 gap-3">
                <button
                  type="button"
                  (click)="setPublicAccessible(true)"
                  class="p-4 rounded-xl border text-left flex items-center justify-between transition-all"
                  [ngClass]="publicAccessible() === true
                    ? 'border-purple-600 dark:border-purple-500 bg-purple-50 dark:bg-purple-950/40 text-purple-950 dark:text-purple-100 shadow-xs'
                    : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/60 text-gray-900 dark:text-white'"
                >
                  <span class="font-bold text-sm">{{ 'create.publicYes' | translate }}</span>
                  <span class="text-purple-600 dark:text-purple-400 font-bold">&rarr;</span>
                </button>

                <button
                  type="button"
                  (click)="setPublicAccessible(false)"
                  class="p-4 rounded-xl border text-left flex items-center justify-between transition-all"
                  [ngClass]="publicAccessible() === false
                    ? 'border-purple-600 dark:border-purple-500 bg-purple-50 dark:bg-purple-950/40 text-purple-950 dark:text-purple-100 shadow-xs'
                    : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/60 text-gray-900 dark:text-white'"
                >
                  <span class="font-bold text-sm">{{ 'create.publicNo' | translate }}</span>
                  <span class="text-purple-600 dark:text-purple-400 font-bold">&rarr;</span>
                </button>
              </div>
            </div>
          }

          <!-- 11. STEP: accessible_outside -->
          @if (currentStepId() === 'accessible_outside') {
            <div class="space-y-4">
              <div class="space-y-1">
                <h3 class="text-lg font-bold text-gray-900 dark:text-white leading-tight">
                  {{ 'create.outsideAccessTitle' | translate }}
                </h3>
                <p class="text-xs text-gray-500 dark:text-gray-400">
                  {{ 'create.outsideAccessSub' | translate }}
                </p>
              </div>

              <div class="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  (click)="setOutsideAccess(true)"
                  class="p-4 rounded-xl border text-center font-bold text-sm transition-all"
                  [ngClass]="accessibleOutsideOpeningTimes() === true
                    ? 'border-purple-600 dark:border-purple-500 bg-purple-50 dark:bg-purple-950/40 text-purple-950 dark:text-purple-100 shadow-xs'
                    : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/60 text-gray-900 dark:text-white'"
                >
                  {{ 'common.yes' | translate }}
                </button>

                <button
                  type="button"
                  (click)="setOutsideAccess(false)"
                  class="p-4 rounded-xl border text-center font-bold text-sm transition-all"
                  [ngClass]="accessibleOutsideOpeningTimes() === false
                    ? 'border-purple-600 dark:border-purple-500 bg-purple-50 dark:bg-purple-950/40 text-purple-950 dark:text-purple-100 shadow-xs'
                    : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/60 text-gray-900 dark:text-white'"
                >
                  {{ 'common.no' | translate }}
                </button>
              </div>
            </div>
          }

          <!-- 12. STEP: storage_space -->
          @if (currentStepId() === 'storage_space') {
            <div class="space-y-4">
              <h3 class="text-lg font-bold text-gray-900 dark:text-white leading-tight">
                {{ 'create.storageTitle' | translate }}
              </h3>

              <div class="grid grid-cols-1 gap-2.5">
                <button
                  type="button"
                  (click)="setStorageSpace('none')"
                  class="p-3.5 rounded-xl border text-left font-bold text-sm transition-all"
                  [ngClass]="storageSpace() === 'none'
                    ? 'border-purple-600 dark:border-purple-500 bg-purple-50 dark:bg-purple-950/40 text-purple-950 dark:text-purple-100 shadow-xs'
                    : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/60 text-gray-900 dark:text-white'"
                >
                  {{ 'create.storageNone' | translate }}
                </button>

                <button
                  type="button"
                  (click)="setStorageSpace('little')"
                  class="p-3.5 rounded-xl border text-left font-bold text-sm transition-all"
                  [ngClass]="storageSpace() === 'little'
                    ? 'border-purple-600 dark:border-purple-500 bg-purple-50 dark:bg-purple-950/40 text-purple-950 dark:text-purple-100 shadow-xs'
                    : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/60 text-gray-900 dark:text-white'"
                >
                  {{ 'create.storageLittle' | translate }}
                </button>

                <button
                  type="button"
                  (click)="setStorageSpace('much')"
                  class="p-3.5 rounded-xl border text-left font-bold text-sm transition-all"
                  [ngClass]="storageSpace() === 'much'
                    ? 'border-purple-600 dark:border-purple-500 bg-purple-50 dark:bg-purple-950/40 text-purple-950 dark:text-purple-100 shadow-xs'
                    : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/60 text-gray-900 dark:text-white'"
                >
                  {{ 'create.storageMuch' | translate }}
                </button>

                <button
                  type="button"
                  (click)="setStorageSpace(null)"
                  class="p-3.5 rounded-xl border text-left font-bold text-sm transition-all"
                  [ngClass]="storageSpace() === null
                    ? 'border-purple-600 dark:border-purple-500 bg-purple-50 dark:bg-purple-950/40 text-purple-950 dark:text-purple-100 shadow-xs'
                    : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/60 text-gray-900 dark:text-white'"
                >
                  {{ 'create.storageUnspecified' | translate }}
                </button>
              </div>
            </div>
          }

          <!-- 13. STEP: photo -->
          @if (currentStepId() === 'photo') {
            <div class="space-y-4">
              <div class="space-y-1">
                <h3 class="text-lg font-bold text-gray-900 dark:text-white leading-tight">
                  {{ 'create.photoTitle' | translate }}
                </h3>
                <p class="text-xs text-gray-500 dark:text-gray-400">
                  {{ 'create.photoSub' | translate }}
                </p>
              </div>

              <div class="p-6 bg-purple-50 dark:bg-purple-950/30 rounded-2xl border border-purple-100 dark:border-purple-800/40 text-center space-y-4">
                <div class="w-14 h-14 rounded-full bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-300 mx-auto flex items-center justify-center shadow-xs">
                  <svg class="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect width="18" height="18" x="3" y="3" rx="2" ry="2"/>
                    <circle cx="9" cy="9" r="2"/>
                    <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
                  </svg>
                </div>

                @if (uploadedPhotosCount() > 0) {
                  <div class="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                    {{ 'create.photoAdded' | translate: { count: uploadedPhotosCount() } }}
                  </div>
                }

                <button
                  type="button"
                  (click)="showPhotoModal.set(true)"
                  class="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-md transition-all active:scale-95 inline-flex items-center gap-2"
                >
                  <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="12" y1="5" x2="12" y2="19"/>
                    <line x1="5" y1="12" x2="19" y2="12"/>
                  </svg>
                  <span>{{ 'create.photoUploadBtn' | translate }}</span>
                </button>
              </div>
            </div>
          }

          <!-- 14. STEP: comment -->
          @if (currentStepId() === 'comment') {
            <div class="space-y-4">
              <div class="space-y-1">
                <h3 class="text-lg font-bold text-gray-900 dark:text-white leading-tight">
                  {{ 'create.commentTitle' | translate }}
                </h3>
                <p class="text-xs text-gray-500 dark:text-gray-400">
                  {{ 'create.commentSub' | translate }}
                </p>
              </div>

              <textarea
                rows="4"
                [(ngModel)]="comment"
                [placeholder]="'create.commentPlaceholder' | translate"
                class="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-purple-500 outline-hidden transition-all"
              ></textarea>
            </div>
          }

          <!-- 15. STEP: success (Celebration) -->
          @if (currentStepId() === 'success') {
            <div class="space-y-6 text-center py-6">
              <div class="w-20 h-20 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center shadow-lg animate-bounce">
                <svg class="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </div>

              <div class="space-y-2 max-w-sm mx-auto">
                <h3 class="text-2xl font-black text-gray-900 dark:text-white leading-tight">
                  {{ 'create.successTitle' | translate }}
                </h3>
                <p class="text-sm text-gray-600 dark:text-gray-300">
                  {{ 'create.successSub' | translate }}
                </p>
              </div>
            </div>
          }
        </div>

        <!-- Wizard Footer Controls -->
        <div class="p-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/80 flex items-center justify-between">
          @if (canGoBack()) {
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

          <div class="flex items-center gap-2">
            @if (isSaved() && currentStepId() !== 'success') {
              <button
                type="button"
                (click)="finishDirectly()"
                class="px-4 py-2.5 rounded-xl border border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/40 text-xs font-bold transition-all"
              >
                {{ 'common.done' | translate }}
              </button>
            }

            @if (currentStepId() === 'name' || currentStepId() === 'photo' || currentStepId() === 'comment') {
              <button
                type="button"
                (click)="nextStep()"
                class="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-md transition-all active:scale-95"
              >
                {{ (currentStepId() === 'comment' ? 'create.finish' : 'common.next') | translate }} &rarr;
              </button>
            } @else if (currentStepId() === 'success') {
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
    </div>

    <!-- Photo Upload Legal Modal -->
    @if (showPhotoModal() && createdToiletId()) {
      <app-photo-legal-modal
        [toiletId]="createdToiletId()!"
        (onCancel)="showPhotoModal.set(false)"
        (onUploaded)="onPhotoUploaded($event)"
      />
    }
  `
})
export class CreateWizardComponent implements OnInit {
  private readonly api = inject(WcInfoApiService);
  private readonly locationService = inject(LocationService);
  private readonly mapsLoader = inject(GoogleMapsLoaderService);
  private readonly translationService = inject(TranslationService);

  @Input() initialCoords: Coordinates | null = null;

  @Output() onCancel = new EventEmitter<void>();
  @Output() onCreated = new EventEmitter<Toilet>();

  @ViewChild('mapContainer') mapContainerRef?: ElementRef<HTMLDivElement>;

  // Dynamic step identifier
  readonly currentStepId = signal<WizardStepId>('place_id');

  // Toilet creation persistence state
  readonly createdToiletId = signal<number | null>(null);
  readonly isSaved = computed(() => this.createdToiletId() !== null);

  // Places Search state (Step 1)
  readonly loadingNearbyPlaces = signal<boolean>(false);
  readonly nearbyPlaces = signal<NearbyPlaceOption[]>([]);
  readonly selectedPlace = signal<NearbyPlaceOption | null>(null);
  readonly selectedPlaceNoChoice = signal<boolean>(false);

  // Name (Step 2)
  name = '';

  // Sensor location (Step 3)
  readonly usedSensorLocation = signal<boolean | null>(null);

  // Map location (Step 4)
  readonly lat = signal<number>(52.520008);
  readonly lon = signal<number>(13.404954);
  private pickerMap?: google.maps.Map;
  private pickerMarker?: google.maps.Marker;

  // Gender separated (Step 5)
  readonly isGenderSeparated = signal<boolean | null>(null);
  readonly isUnisex = signal<boolean | null>(null);

  // Wheelchair (Step 6)
  readonly hasWheelchairAccess = signal<boolean | null>(null);

  // Euro Key (Step 7)
  readonly euroKey = signal<string | null>(null);

  // Address (Step 8)
  address = '';

  // Opening Hours (Step 9)
  readonly knowsOpeningHours = signal<boolean | null>(null);
  readonly hours247 = signal<boolean>(false);
  readonly selectedDays = signal<number[]>([1, 2, 3, 4, 5, 6, 0]); // Mon..Sat, Sun
  period1Open = '08:00';
  period1Close = '20:00';
  readonly hasPeriod2 = signal<boolean>(false);
  period2Open = '14:00';
  period2Close = '22:00';
  readonly configuredOpeningHours = signal<GooglePlacesPeriod[] | null>(null);

  readonly dayOptions = [
    { day: 1, label: 'Mo' },
    { day: 2, label: 'Di' },
    { day: 3, label: 'Mi' },
    { day: 4, label: 'Do' },
    { day: 5, label: 'Fr' },
    { day: 6, label: 'Sa' },
    { day: 0, label: 'So' }
  ];

  // Public Accessibility (Step 10)
  readonly publicAccessible = signal<boolean | null>(null);

  // Outside Access (Step 11)
  readonly accessibleOutsideOpeningTimes = signal<boolean | null>(null);

  // Storage Space (Step 12)
  readonly storageSpace = signal<string | null>(null);

  // Photos (Step 13)
  readonly showPhotoModal = signal<boolean>(false);
  readonly uploadedPhotosCount = signal<number>(0);

  // Comment (Step 14)
  comment = '';

  // Dynamic step engine
  readonly activeSteps = computed<WizardStepId[]>(() => {
    const steps: WizardStepId[] = ['place_id', 'name', 'sensor_location'];

    // Map picker step: ONLY if NO place was selected in step 1 AND sensor was denied in step 3
    if (this.selectedPlace() === null && this.usedSensorLocation() === false) {
      steps.push('map_location');
    }

    steps.push('gender_separated', 'wheelchair');

    // Euro key step: ONLY if wheelchair access is YES
    if (this.hasWheelchairAccess() === true) {
      steps.push('euro_key');
    }

    // Address step: ONLY if NO place was selected in step 1
    if (this.selectedPlace() === null) {
      steps.push('address');
    }

    // Opening hours step: ONLY if NO place was selected OR selected place has no opening hours
    const placeHasHours = !!this.selectedPlace()?.openingHours && this.selectedPlace()!.openingHours!.length > 0;
    if (this.selectedPlace() === null || !placeHasHours) {
      steps.push('opening_hours');
    }

    steps.push(
      'public_accessible',
      'accessible_outside',
      'storage_space',
      'photo',
      'comment',
      'success'
    );

    return steps;
  });

  readonly totalQuestions = computed<number>(() => {
    return this.activeSteps().filter((s) => s !== 'success').length;
  });

  readonly currentStepNumber = computed<number>(() => {
    const index = this.activeSteps().indexOf(this.currentStepId());
    return index >= 0 ? index + 1 : 1;
  });

  readonly canGoBack = computed<boolean>(() => {
    return this.currentStepId() !== 'place_id' && this.currentStepId() !== 'success';
  });

  ngOnInit(): void {
    if (this.initialCoords) {
      this.lat.set(this.initialCoords.lat);
      this.lon.set(this.initialCoords.lon);
    }
    this.fetchNearbyPlaces();
  }

  // --- Step 1: Nearby Places Search ---
  private async fetchNearbyPlaces(): Promise<void> {
    this.loadingNearbyPlaces.set(true);

    try {
      await this.mapsLoader.load();

      if (typeof window !== 'undefined' && (window as any).google?.maps?.places) {
        const dummyDiv = document.createElement('div');
        const service = new (window as any).google.maps.places.PlacesService(dummyDiv);
        const center = new (window as any).google.maps.LatLng(this.lat(), this.lon());

        service.nearbySearch(
          {
            location: center,
            radius: 100
          },
          (results: any[], status: any) => {
            this.loadingNearbyPlaces.set(false);
            if (status === 'OK' && results && results.length > 0) {
              const mapped: NearbyPlaceOption[] = results
                .slice(0, 3)
                .map((r: any) => {
                  const placeLat = r.geometry?.location?.lat?.() ?? this.lat();
                  const placeLng = r.geometry?.location?.lng?.() ?? this.lon();
                  const dist = Math.round(
                    this.locationService.calculateDistance(this.lat(), this.lon(), placeLat, placeLng)
                  );

                  return {
                    placeId: r.place_id,
                    name: r.name,
                    vicinity: r.vicinity || r.formatted_address,
                    distanceMeters: dist,
                    lat: placeLat,
                    lon: placeLng
                  };
                });
              this.nearbyPlaces.set(mapped);
            } else {
              this.nearbyPlaces.set([]);
            }
          }
        );
        return;
      }
    } catch {
      // Fallback
    }

    this.loadingNearbyPlaces.set(false);
    this.nearbyPlaces.set([]);
  }

  selectPlace(place: NearbyPlaceOption): void {
    this.selectedPlace.set(place);
    this.selectedPlaceNoChoice.set(false);

    if (place.lat !== undefined && place.lon !== undefined) {
      this.lat.set(place.lat);
      this.lon.set(place.lon);
    }

    // Fetch place details for address & opening hours if Google Places is available
    if (typeof window !== 'undefined' && (window as any).google?.maps?.places && place.placeId) {
      try {
        const dummyDiv = document.createElement('div');
        const service = new (window as any).google.maps.places.PlacesService(dummyDiv);
        service.getDetails(
          {
            placeId: place.placeId,
            fields: ['name', 'formatted_address', 'opening_hours', 'geometry']
          },
          (detail: any, status: any) => {
            if (status === 'OK' && detail) {
              const periods: GooglePlacesPeriod[] | undefined = detail.opening_hours?.periods?.map((p: any) => ({
                open: {
                  day: p.open?.day ?? 0,
                  hour: p.open?.hours ?? p.open?.hour ?? 0,
                  minute: p.open?.minutes ?? p.open?.minute ?? 0
                },
                close: p.close
                  ? {
                      day: p.close?.day ?? 0,
                      hour: p.close?.hours ?? p.close?.hour ?? 0,
                      minute: p.close?.minutes ?? p.close?.minute ?? 0
                    }
                  : null
              }));

              this.selectedPlace.set({
                ...place,
                formattedAddress: detail.formatted_address || place.vicinity,
                openingHours: periods,
                lat: detail.geometry?.location?.lat?.() ?? place.lat,
                lon: detail.geometry?.location?.lng?.() ?? place.lon
              });

              if (detail.formatted_address) {
                this.address = detail.formatted_address;
              }
            }
          }
        );
      } catch {
        // Ignore details fetch errors
      }
    }

    this.advanceToNextStep();
  }

  selectNoPlace(): void {
    this.selectedPlace.set(null);
    this.selectedPlaceNoChoice.set(true);
    this.advanceToNextStep();
  }

  // --- Step 3: Sensor Choice ---
  async handleSensorChoice(useSensor: boolean): Promise<void> {
    this.usedSensorLocation.set(useSensor);

    if (useSensor) {
      try {
        const pos = await this.locationService.getCurrentPosition();
        this.lat.set(pos.lat);
        this.lon.set(pos.lon);
      } catch {
        // Use initial coords fallback
      }
      this.advanceToNextStep();
    } else {
      this.advanceToNextStep();
      if (this.currentStepId() === 'map_location') {
        setTimeout(() => this.initPickerMap(), 150);
      }
    }
  }

  // --- Step 4: Map Location Picker ---
  private async initPickerMap(): Promise<void> {
    if (!this.mapContainerRef?.nativeElement) return;

    try {
      const g = await this.mapsLoader.load();
      const pos = { lat: this.lat(), lng: this.lon() };

      this.pickerMap = new g.maps.Map(this.mapContainerRef.nativeElement, {
        center: pos,
        zoom: 17,
        disableDefaultUI: true,
        zoomControl: true,
        gestureHandling: 'greedy'
      });

      this.pickerMarker = new g.maps.Marker({
        position: pos,
        map: this.pickerMap,
        draggable: true,
        animation: g.maps.Animation.DROP
      });

      this.pickerMarker.addListener('dragend', (evt: any) => {
        if (evt.latLng) {
          this.lat.set(evt.latLng.lat());
          this.lon.set(evt.latLng.lng());
        }
      });

      this.pickerMap.addListener('click', (evt: any) => {
        if (evt.latLng) {
          this.lat.set(evt.latLng.lat());
          this.lon.set(evt.latLng.lng());
          this.pickerMarker?.setPosition(evt.latLng);
        }
      });
    } catch {
      // Map error fallback
    }
  }

  advanceAfterMap(): void {
    this.advanceToNextStep();
  }

  // --- Step 5: Gender Separation ---
  setGender(separated: boolean): void {
    this.isGenderSeparated.set(separated);
    this.isUnisex.set(!separated);
    this.advanceToNextStep();
  }

  // --- Step 6: Wheelchair Access ---
  setWheelchair(hasAccess: boolean): void {
    this.hasWheelchairAccess.set(hasAccess);

    if (hasAccess) {
      // Moves to Step 7 (euro_key)
      this.advanceToNextStep();
    } else {
      // Persist baseline creation right away!
      this.persistBaselineAndAdvance();
    }
  }

  // --- Step 7: Euro Key ---
  setEuroKey(value: string): void {
    this.euroKey.set(value);
    this.persistBaselineAndAdvance();
  }

  // --- Milestone: Persistence (POST baseline creation) ---
  private persistBaselineAndAdvance(): void {
    if (this.createdToiletId()) {
      this.savePatchAndAdvance();
      return;
    }

    const payload: AddToiletPayload = {
      lat: this.lat(),
      lon: this.lon(),
      owner: this.selectedPlace()?.name || null,
      placeId: this.selectedPlace()?.placeId || null,
      name: this.name.trim() || null,
      publicAccessible: this.publicAccessible() ?? true,
      hasWheelchairAccess: this.hasWheelchairAccess() ?? false,
      isGenderSeparated: this.isGenderSeparated() ?? false,
      isUnisex: this.isUnisex() ?? true,
      euroKey: this.euroKey() || null,
      address: this.selectedPlace()?.formattedAddress || null,
      placeOpeningHours: this.selectedPlace()?.openingHours || null
    };

    this.api.addToilet(payload).subscribe({
      next: (res) => {
        this.createdToiletId.set(res.id);
        this.advanceToNextStep();
        this.checkAndPreloadAddress();
      },
      error: () => {
        // Fallback fake ID so user can still continue wizard offline
        this.createdToiletId.set(Date.now());
        this.advanceToNextStep();
        this.checkAndPreloadAddress();
      }
    });
  }

  private checkAndPreloadAddress(): void {
    if (!this.address && this.selectedPlace() === null) {
      this.reverseGeocode();
    }
  }

  private reverseGeocode(): void {
    if (typeof window !== 'undefined' && (window as any).google?.maps?.Geocoder) {
      const geocoder = new (window as any).google.maps.Geocoder();
      geocoder.geocode(
        { location: { lat: this.lat(), lng: this.lon() } },
        (results: any[], status: any) => {
          if (status === 'OK' && results && results[0]?.formatted_address) {
            this.address = results[0].formatted_address;
          }
        }
      );
    }
  }

  // --- Step 8: Address Confirmation ---
  saveAddressAndNext(): void {
    this.savePatchAndAdvance();
  }

  skipAddressAndNext(): void {
    this.address = '';
    this.advanceToNextStep();
  }

  // --- Step 9: Opening Hours ---
  toggleDay(day: number): void {
    const current = [...this.selectedDays()];
    const index = current.indexOf(day);
    if (index >= 0) {
      if (current.length > 1) {
        current.splice(index, 1);
      }
    } else {
      current.push(day);
    }
    this.selectedDays.set(current);
  }

  skipOpeningHours(): void {
    this.configuredOpeningHours.set(null);
    this.advanceToNextStep();
  }

  saveOpeningHoursAndNext(): void {
    const periods: GooglePlacesPeriod[] = [];
    const days = this.selectedDays();

    if (this.hours247()) {
      for (const day of days) {
        periods.push({
          open: { day, hour: 0, minute: 0 },
          close: null
        });
      }
    } else {
      const [h1Open, m1Open] = this.period1Open.split(':').map((n) => parseInt(n, 10) || 0);
      const [h1Close, m1Close] = this.period1Close.split(':').map((n) => parseInt(n, 10) || 0);

      for (const day of days) {
        periods.push({
          open: { day, hour: h1Open, minute: m1Open },
          close: { day, hour: h1Close, minute: m1Close }
        });

        if (this.hasPeriod2()) {
          const [h2Open, m2Open] = this.period2Open.split(':').map((n) => parseInt(n, 10) || 0);
          const [h2Close, m2Close] = this.period2Close.split(':').map((n) => parseInt(n, 10) || 0);
          periods.push({
            open: { day, hour: h2Open, minute: m2Open },
            close: { day, hour: h2Close, minute: m2Close }
          });
        }
      }
    }

    this.configuredOpeningHours.set(periods);
    this.savePatchAndAdvance();
  }

  // --- Step 10: Public Accessibility ---
  setPublicAccessible(value: boolean): void {
    this.publicAccessible.set(value);
    this.savePatchAndAdvance();
  }

  // --- Step 11: Outside Access ---
  setOutsideAccess(value: boolean): void {
    this.accessibleOutsideOpeningTimes.set(value);
    this.savePatchAndAdvance();
  }

  // --- Step 12: Storage Space ---
  setStorageSpace(value: string | null): void {
    this.storageSpace.set(value);
    this.savePatchAndAdvance();
  }

  // --- Step 13: Photos ---
  onPhotoUploaded(data: { url: string; thumbUrl?: string; filename: string }): void {
    this.uploadedPhotosCount.update((c) => c + 1);
    this.showPhotoModal.set(false);
  }

  // --- Universal Step Navigation & Subsequent PATCH Updates ---
  nextStep(): void {
    if (this.createdToiletId()) {
      this.savePatchAndAdvance();
    } else {
      this.advanceToNextStep();
    }
  }

  prevStep(): void {
    const steps = this.activeSteps();
    const currentIndex = steps.indexOf(this.currentStepId());
    if (currentIndex > 0) {
      this.currentStepId.set(steps[currentIndex - 1]);
    }
  }

  private advanceToNextStep(): void {
    const steps = this.activeSteps();
    const currentIndex = steps.indexOf(this.currentStepId());
    if (currentIndex >= 0 && currentIndex < steps.length - 1) {
      const nextStepId = steps[currentIndex + 1];
      this.currentStepId.set(nextStepId);

      if (nextStepId === 'success') {
        this.triggerConfetti();
      }
    }
  }

  private savePatchAndAdvance(): void {
    const toiletId = this.createdToiletId();
    if (toiletId) {
      const payload: UpdateToiletPayload = {
        lat: this.lat(),
        lon: this.lon(),
        name: this.name.trim() || null,
        owner: this.selectedPlace()?.name || null,
        euroKey: this.euroKey() || null,
        isGenderSeparated: this.isGenderSeparated() ?? false,
        isUnisex: this.isUnisex() ?? true,
        hasWheelchairAccess: this.hasWheelchairAccess() ?? false,
        publicAccessible: this.publicAccessible() ?? true,
        accessibleOutsideOpeningTimes: this.accessibleOutsideOpeningTimes() ?? false,
        storageSpace: this.storageSpace(),
        address: this.address.trim() || this.selectedPlace()?.formattedAddress || null,
        placeOpeningHours: this.configuredOpeningHours() || this.selectedPlace()?.openingHours || null,
        comment: this.comment.trim() || null
      };

      this.api.updateToilet(toiletId, payload).subscribe();
    }

    this.advanceToNextStep();
  }

  triggerConfetti(): void {
    try {
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 }
      });
    } catch {
      // Ignore
    }
  }

  finishDirectly(): void {
    this.currentStepId.set('success');
    this.triggerConfetti();
  }

  handleClose(): void {
    if (this.isSaved()) {
      this.onComplete();
    } else {
      this.onCancel.emit();
    }
  }

  onComplete(): void {
    const created: Toilet = {
      id: this.createdToiletId() || Date.now(),
      name: this.name.trim() || 'Öffentliche Toilette',
      owner: this.selectedPlace()?.name || null,
      lat: this.lat(),
      lon: this.lon(),
      placeId: this.selectedPlace()?.placeId || null,
      publicAccessible: this.publicAccessible() ?? true,
      hasWheelchairAccess: this.hasWheelchairAccess() ?? false,
      euroKey: this.euroKey() || null,
      isUnisex: this.isUnisex() ?? true,
      isGenderSeparated: this.isGenderSeparated() ?? false,
      storageSpace: this.storageSpace(),
      address: this.address.trim() || this.selectedPlace()?.formattedAddress || null,
      placeOpeningHours: this.configuredOpeningHours() || this.selectedPlace()?.openingHours || null,
      accessibleOutsideOpeningTimes: this.accessibleOutsideOpeningTimes() ?? false,
      comment: this.comment.trim() || null,
      photos: []
    };

    this.onCreated.emit(created);
  }
}
