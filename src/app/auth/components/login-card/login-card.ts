import { Component, signal, inject, output } from '@angular/core';
import {
  FormBuilder,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { DialogService } from '../../../shared/services/dialog.service';
import { SupabaseService } from '../../../shared/services/supabase.service';
import { Router } from '@angular/router';
import { UserDataService } from '../../services/userdata.service';
import { UserStateService } from '../../../shared/services/user-state.service';
import { withTimeout, isTimeoutError, isNetworkError } from '../../../shared/utils/timeout.util';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'login-card',
  imports: [
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    FormsModule,
    ReactiveFormsModule,
  ],
  templateUrl: './login-card.html',
  styleUrl: './login-card.scss',
})
export class LoginCard {
  private dialogService = inject(DialogService);
  private supabaseClient = inject(SupabaseService).supabase;
  private userDataService = inject(UserDataService);
  private userStateService = inject(UserStateService);
  private router = inject(Router);

  form = inject(FormBuilder).nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
  });

  hide = signal(true);
  changeValue = output();
  isLoading = signal(false);

  clickEvent(event: MouseEvent) {
    this.hide.set(!this.hide());
    event.stopPropagation();
  }

  async logIn() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.dialogService.showErrorDialog(
        'Por favor, completa todos los campos correctamente.',
        'Error de Validación'
      );
      return;
    }

    if (this.isLoading()) return;

    try {
      this.isLoading.set(true);

      this.userStateService.clearUser();

      this.dialogService.showLoadingDialog();

      const { data, error } = await withTimeout(
        this.supabaseClient.auth.signInWithPassword({
          email: this.form.value.email!,
          password: this.form.value.password!,
        }),
        15000,
        'La conexión está tardando más de lo esperado'
      );

      this.dialogService.closeAll();

      if (error) {
        let errorMessage =
          'Error durante el inicio de sesión. Por favor, inténtalo de nuevo.';

        if (error.message?.includes('Invalid login credentials')) {
          errorMessage =
            'Credenciales incorrectas. Verifica tu email y contraseña.';
        } else if (error.message?.includes('Email not confirmed')) {
          errorMessage =
            'Por favor, confirma tu email antes de iniciar sesión.';
        } else if (error.message?.includes('Too many requests')) {
          errorMessage = 'Demasiados intentos. Por favor, espera unos minutos.';
        }

        this.dialogService.showErrorDialog(
          errorMessage,
          'Error de Inicio de Sesión'
        );
        return;
      }

      const authId = data.user.id;

      
      const usuarioExists = await withTimeout(
        this.userDataService.getUserByAuthId(authId),
        15000,
        'No se pudo verificar la información del usuario'
      );

      
      if (!usuarioExists) {
        this.dialogService.closeAll();

        const dialogRef = this.dialogService.showSuccessDialog(
          'Por favor completa tu información para acceder al sistema.',
          'Completa tu Registro'
        );

        await firstValueFrom(dialogRef.afterClosed());

        
        this.dialogService.showLoadingDialog();
        await this.router.navigate(['/register-user']);
        this.dialogService.closeLoadingDialog();
        return;
      }

      
      const usuario = await withTimeout(
        this.userDataService.getActiveUserByAuthId(authId),
        15000,
        'No se pudo cargar la información del usuario'
      );

      if (!usuario) {
        this.dialogService.showErrorDialog(
          'Tu usuario ha sido deshabilitado. Contacta al administrador.',
          'Acceso Denegado'
        );

        await this.supabaseClient.auth.signOut();
        this.userStateService.clearUser();
        return;
      }

      
      const role = await withTimeout(
        this.userDataService.getUserRole(authId),
        15000,
        'No se pudo cargar el rol del usuario'
      );

      if (!role) {
        this.dialogService.showErrorDialog(
          'No se pudo determinar el rol del usuario.',
          'Error'
        );
        return;
      }

      this.userStateService.setUser(usuario);

      let target = '/login';
      switch (role) {
        case 'Administrador':
          target = '/users/admin';
          break;
        case 'Conductor':
          target = '/users/bus-driver';
          break;
        case 'Personal':
          target = '/users/staff';
          break;
        case 'Visitante':
          target = '/users/visitant';
          break;
      }

      const loadingRef = this.dialogService.showLoadingDialog();

      await this.router.navigate([target]);

      this.dialogService.closeLoadingDialog();

      this.form.reset();

      this.dialogService.showSuccessDialog(
        `¡Bienvenido! Has iniciado sesión correctamente.`,
        'Inicio de Sesión Exitoso'
      );
    } catch (error: any) {
      console.error('Error inesperado:', error);
      this.dialogService.closeAll();

      
      if (isTimeoutError(error) || isNetworkError(error)) {
        const dialogRef = this.dialogService.showRetryDialog({
          title: 'Conexión lenta',
          message: isTimeoutError(error)
            ? 'El inicio de sesión está tardando más de lo esperado. Esto puede deberse a una conexión lenta.'
            : 'No se pudo conectar con el servidor. Por favor verifica tu conexión a internet.',
          showRetry: true,
        });

        const shouldRetry = await firstValueFrom(dialogRef.afterClosed());
        if (shouldRetry) {
          
          await this.logIn();
        }
      } else {
        this.dialogService.showErrorDialog(
          'Ocurrió un error inesperado. Por favor, inténtalo de nuevo.',
          'Error'
        );
      }
    } finally {
      this.isLoading.set(false);
    }
  }
}
