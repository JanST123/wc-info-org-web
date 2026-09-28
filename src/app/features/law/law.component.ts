import { Component } from "@angular/core";
import { RouterOutlet } from "@angular/router";

@Component({
    imports: [RouterOutlet],
    styleUrl: './law.component.css',
    template: ` 
<div class="p-4 pb-30 max-w-[800px] h-screen overflow-scroll">
    <router-outlet></router-outlet>
</div>
`
})
export class LawComponent {

}