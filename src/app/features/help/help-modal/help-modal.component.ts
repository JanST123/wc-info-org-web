import { Component, EventEmitter, Output } from "@angular/core";
import { HelpComponent } from "../help.component";
import { TranslatePipe } from "../../../core/pipes/translate.pipe";

@Component({
    imports: [HelpComponent, TranslatePipe],
    selector: 'app-help-modal',
    templateUrl: './help-modal.component.html'
})
export class HelpModalComponent {
    @Output() onClose = new EventEmitter<void>();

}