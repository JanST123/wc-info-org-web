import { Component, inject, signal, OnInit } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router, RouterModule, RouterOutlet } from '@angular/router';
import { ToastContainerComponent } from './shared/components/toast-container/toast-container.component';
import { HeaderComponent } from './shared/components/header/header.component';
import { TranslatePipe } from './core/pipes/translate.pipe';
import { MatomoService } from './core/services/matomo.service';
import { filter } from 'rxjs';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, ToastContainerComponent, HeaderComponent, RouterModule, TranslatePipe],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit {
  title = 'wc-info.org';

  readonly router = inject(Router);
  readonly route = inject(ActivatedRoute);
  private readonly matomoService = inject(MatomoService);
  

  private funnyFooters = [
    "Made of stardust 💫",
    "Powered by coffee ☕",
    "Made in Germany 🥔",
    "Made with love ❤️",
    "Toilets are our passion 🚽",
  ];
  funnyFooter = signal<string>(this.funnyFooters[Math.floor(Math.random() * this.funnyFooters.length)]);

  showFooter = signal(true);
  showHeader = signal(true);

  ngOnInit(): void {
    this.matomoService.init();

    window.setInterval(() => {
      this.funnyFooter.set(this.funnyFooters[Math.floor(Math.random() * this.funnyFooters.length)]);
    }, 60000);

    // depending on the page we show header/footer
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd),
    ).subscribe(event => {
      if (event.url.indexOf('/Toilets') === 0) {
        this.showHeader.set(true);
        this.showFooter.set(false);

      } else if (event.url.indexOf('/Urgent') === 0) {
        this.showHeader.set(false);
        this.showFooter.set(false);

      } else {
        this.showHeader.set(true);
        this.showFooter.set(true);
      }

    });
  }
  
 
}
