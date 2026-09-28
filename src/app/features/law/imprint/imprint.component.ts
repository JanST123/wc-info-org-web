import { Component, inject } from "@angular/core";
import { TranslationService } from "../../../core/services/translation.service";

@Component({
    selector: 'app-imprint',
    templateUrl: './imprint.component.html',
})
export class ImprintComponent {
    readonly translateService = inject(TranslationService);

    readonly currentLang = this.translateService.currentLang;
}