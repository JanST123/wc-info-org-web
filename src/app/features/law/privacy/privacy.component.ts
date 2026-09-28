import { Component, inject } from "@angular/core";
import { TranslationService } from "../../../core/services/translation.service";

@Component({
    selector: 'app-privacy',
    templateUrl: './privacy.component.html',
})
export class PrivacyComponent {
    readonly translateService = inject(TranslationService);

    readonly currentLang = this.translateService.currentLang;
}