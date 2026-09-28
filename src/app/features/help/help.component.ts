import { Component, inject, Input, signal } from "@angular/core";
import { TranslationService } from "../../core/services/translation.service";
import { EuroKeyModalComponent } from "../../shared/components/euro-key-modal/euro-key-modal.component";
import { TranslatePipe } from "../../core/pipes/translate.pipe";

@Component({
    imports: [EuroKeyModalComponent, TranslatePipe],
    selector: 'app-help',
    standalone: true,
    styleUrl: './help.component.css',
    templateUrl: './help.component.html'
})
export class HelpComponent {
    @Input() modal = false;

    readonly translateService = inject(TranslationService);

    readonly currentLang = this.translateService.currentLang;
    readonly showEuroKey = signal(false);

    onShowEuroKey() {
        this.showEuroKey.set(true);
    }


}