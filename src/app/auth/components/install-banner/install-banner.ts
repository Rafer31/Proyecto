import { Component, Inject } from '@angular/core';
import { MAT_SNACK_BAR_DATA } from '@angular/material/snack-bar';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-install-banner',
  standalone: true,
  imports: [MatButtonModule],
  template: `
    <div class="install-banner-content">
      <span>¿Quieres instalar esta aplicación en tu dispositivo?</span>
      <button mat-raised-button color="primary" (click)="data.install()">
        Instalar
      </button>
      <button mat-button (click)="data.dismiss()">
        Más tarde
      </button>
    </div>
  `,
  styles: [`
    .install-banner-content {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      width: 100%;
      padding: 8px 16px;
      font-size: 14px;
    }
  `]
})
export class InstallBannerComponent {
  constructor(@Inject(MAT_SNACK_BAR_DATA) public data: { install: () => void; dismiss: () => void }) {}
}
