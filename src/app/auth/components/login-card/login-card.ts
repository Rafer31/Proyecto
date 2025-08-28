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
    // Validar formulario
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.dialogService.showErrorDialog(
        'Por favor, completa todos los campos correctamente.',
        'Error de Validación'
      );
      return;
    }

    // Evitar múltiples llamadas simultáneas
    if (this.isLoading()) {
      return;
    }

    try {
      this.isLoading.set(true);

      // Mostrar loading dialog
      this.dialogService.showLoadingDialog();

      console.log('Iniciando sesión...');

      // Realizar el login
      const { data, error } = await this.supabaseClient.auth.signInWithPassword(
        {
          email: this.form.value.email!,
          password: this.form.value.password!,
        }
      );

      // Cerrar loading dialog
      this.dialogService.closeAll();

      if (error) {
        console.error('Error en el inicio de sesión:', error);

        // Determinar mensaje de error específico
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

      // Login exitoso
      console.log('Inicio de sesión exitoso:', data);
      const authId = data.user.id;
      const role = await this.userDataService.getUserRole(authId)
      if (!role) {
        this.dialogService.showErrorDialog(
          'No se pudo determinar el rol del usuario.',
          'Error'
        );
        return;
      }

      // Redirigir según rol
      switch (role) {
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
          this.dialogService.showErrorDialog(
            'Rol no reconocido en el sistema.',
            'Error'
          );
          break;
      }

      this.dialogService.showSuccessDialog(
        `¡Bienvenido! Has iniciado sesión correctamente.`,
        'Inicio de Sesión Exitoso'
      );

      // Limpiar formulario y emitir evento
      this.form.reset();
      this.changeValue.emit();

    } catch (error: any) {
      console.error('Error inesperado:', error);
      this.dialogService.closeAll();
      this.dialogService.showErrorDialog(
        'Ocurrió un error inesperado. Por favor, inténtalo de nuevo.',
        'Error'
      );
    } finally {
      this.isLoading.set(false);
    }
  }
}
