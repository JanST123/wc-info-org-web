import { Component, inject } from "@angular/core";
import { TranslationService } from "../../../core/services/translation.service";

@Component({
    selector: 'app-disclaimer',
    templateUrl: './disclaimer.component.html',
})
export class DisclaimerComponent {
    readonly translateService = inject(TranslationService);

    readonly currentLang = this.translateService.currentLang;
}