import { Component, signal, inject } from '@angular/core';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { LoginCard } from '../../components/login-card/login-card';
import { RegisterCard } from '../../components/register-card/register-card';
import { RightContent } from '../../components/right-content/right-content';
import { InstallBannerComponent } from '../../components/install-banner/install-banner';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [LoginCard, RegisterCard, RightContent, MatSnackBarModule],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export default class Login {
  isLoginMode = signal(true);
  deferredPrompt: any = null;

  private snackBar = inject(MatSnackBar);

  constructor() {
    window.addEventListener('beforeinstallprompt', (event: any) => {
      event.preventDefault();
      this.deferredPrompt = event;
      this.showInstallSnackbar();
    });

    window.addEventListener('appinstalled', () => {
      console.log(' Aplicación instalada');
    });
  }

  private showInstallSnackbar() {
    this.snackBar.openFromComponent(InstallBannerComponent, {
      data: {
        install: () => this.installPWA(),
        dismiss: () => this.dismissPrompt(),
      },
      horizontalPosition: 'center',
      verticalPosition: 'top',
      panelClass: ['install-banner-snackbar'],
      duration: 10000,
    });
  }

  async installPWA() {
    if (!this.deferredPrompt) return;
    this.deferredPrompt.prompt();
    const { outcome } = await this.deferredPrompt.userChoice;
    if (outcome === 'accepted') console.log(' Usuario instaló la app');
    else console.log(' Usuario rechazó la instalación');
    this.deferredPrompt = null;
    this.snackBar.dismiss();
  }

  dismissPrompt() {
    this.snackBar.dismiss();
  }
}
