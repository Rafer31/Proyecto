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
      this.dialogService.showLoadingDialog();

      const { data, error } = await this.supabaseClient.auth.signInWithPassword(
        {
          email: this.form.value.email!,
          password: this.form.value.password!,
        }
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

      // Login exitoso
      const authId = data.user.id;
      const role = await this.userDataService.getUserRole(authId);

      const usuario = await this.userDataService.getActiveUserByAuthId(authId);
      if (!usuario) {
        // Usuario inactivo o no encontrado
        this.dialogService.showErrorDialog(
          'Tu usuario ha sido deshabilitado. Contacta al administrador.',
          'Acceso Denegado'
        );

        // Opcional: cerrar sesión Auth
        await this.supabaseClient.auth.signOut();
        return;
      }
      if (!role) {
        this.dialogService.showErrorDialog(
          'No se pudo determinar el rol del usuario.',
          'Error'
        );
        return;
      }
      const dialogRef = this.dialogService.showSuccessDialog(
        `¡Bienvenido! Has iniciado sesión correctamente.`,
        'Inicio de Sesión Exitoso'
      );

      dialogRef.afterClosed().subscribe(() => {
        const redirectDialog = this.dialogService.showLoadingDialog();

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

        this.router.navigate([target]).then(() => {
          redirectDialog.close();
          this.form.reset();
        });
      });
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
