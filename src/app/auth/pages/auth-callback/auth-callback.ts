import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { UserDataService } from '../../services/userdata.service';
import { DialogService } from '../../../shared/services/dialog.service';
import {
  withTimeout,
  isTimeoutError,
  isNetworkError,
} from '../../../shared/utils/timeout.util';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-auth-callback',
  templateUrl: './auth-callback.html',
  styleUrl: './auth-callback.scss',
})
export default class AuthCallback {
  private authService = inject(AuthService);
  private userDataService = inject(UserDataService);
  private router = inject(Router);
  private dialogService = inject(DialogService);

  isRetrying = signal(false);

  async ngOnInit() {
    await this.handleAuthCallback();
  }

  private async handleAuthCallback(isRetry: boolean = false) {
    try {
      const {
        data: { session },
      } = await withTimeout(
        this.authService.getSession(),
        15000,
        'No se pudo verificar tu sesión'
      );

      if (!session) {
        this.router.navigate(['/login']);
        return;
      }

      const user = session.user;

      const createdFromAdmin =
        user.user_metadata?.['created_from_admin'] ||
        user.user_metadata?.['admin_created'];

      if (user.user_metadata?.['needs_password_change']) {
        this.router.navigate(['/auth/change-password']);
        return;
      }

      const authId = user.id;

      let usuario;
      try {
        usuario = await withTimeout(
          this.userDataService.getUserByAuthId(authId),
          15000,
          'No se pudo cargar la información del usuario'
        );
      } catch (error) {
        console.error('Error buscando usuario:', error);

        if (isTimeoutError(error) || isNetworkError(error)) {
          throw error;
        }

        usuario = null;
      }

      if (!usuario) {
        this.router.navigate(['/register-user']);
        return;
      }

      const userRoleObj = Array.isArray(usuario.roles)
        ? usuario.roles[0]
        : usuario.roles;

      const userRole = userRoleObj?.nomrol;

      switch (userRole) {
        case 'Administrador':
          this.router.navigate(['/users/admin']);
          break;
        case 'Conductor':
          this.router.navigate(['/users/bus-driver']);
          break;
        case 'Personal':
          this.router.navigate(['/users/staff']);
          break;
        case 'Visitante':
          this.router.navigate(['/users/visitant']);
          break;
        default:
          this.router.navigate(['/register-user']);
      }
    } catch (error) {
      console.error('Error en auth callback:', error);

      if (isTimeoutError(error) || isNetworkError(error)) {
        const dialogRef = this.dialogService.showRetryDialog({
          title: 'Conexión lenta',
          message: isTimeoutError(error)
            ? 'La operación está tomando más tiempo del esperado. Esto puede deberse a una conexión lenta.'
            : 'No se pudo conectar con el servidor. Por favor verifica tu conexión a internet.',
          showRetry: true,
        });

        const shouldRetry = await firstValueFrom(dialogRef.afterClosed());

        if (shouldRetry) {
          this.isRetrying.set(true);
          await this.handleAuthCallback(true);
          this.isRetrying.set(false);
        } else {
          this.router.navigate(['/login']);
        }
      } else {
        this.dialogService.showErrorDialog(
          'Ocurrió un error al verificar tu sesión. Por favor intenta nuevamente.',
          'Error de autenticación'
        );
        setTimeout(() => {
          this.router.navigate(['/login']);
        }, 2000);
      }
    }
  }
}
