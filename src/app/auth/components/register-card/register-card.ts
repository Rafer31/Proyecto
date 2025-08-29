import { Component, signal, output, inject } from '@angular/core';
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

@Component({
  selector: 'register-card',
  imports: [
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    FormsModule,
    ReactiveFormsModule,
  ],
  templateUrl: './register-card.html',
  styleUrl: './register-card.scss',
})
export class RegisterCard {
  private dialogService = inject(DialogService);
  private supabaseClient = inject(SupabaseService).supabase;

  form = inject(FormBuilder).nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', [Validators.required]],
  });

  changeValue = output();
  hide = signal(true);
  hideConfirmPassword = signal(true);
  userRole = signal<string | null>(null);
  isLoading = signal(false);

  clickEvent(event: MouseEvent) {
    this.hide.set(!this.hide());
    event.stopPropagation();
  }

  clickEventConfirm(event: MouseEvent) {
    this.hideConfirmPassword.set(!this.hideConfirmPassword());
    event.stopPropagation();
  }

  async signUp() {
    if (this.form.value.password !== this.form.value.confirmPassword) {
      this.dialogService.showErrorDialog(
        'Las contraseñas no coinciden.',
        'Error de Validación'
      );
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.dialogService.showErrorDialog(
        'Por favor, completa todos los campos correctamente.',
        'Error de Validación'
      );
      return;
    }
    if (this.isLoading()) {
      return;
    }

    try {
      this.isLoading.set(true);
      const loadingDialog = this.dialogService.showLoadingDialog();

      console.log('Iniciando registro...');

      const { data, error } = await this.supabaseClient.auth.signUp({
        email: this.form.value.email!,
        password: this.form.value.password!,
        options:{
          emailRedirectTo: 'http://localhost:4200/auth/callback'
        }
      });

      this.dialogService.closeAll();

      if (error) {
        console.error('Error en registro:', error);
        let errorMessage = 'Error durante el registro. Por favor, inténtalo de nuevo.';

        if (error.message?.includes('already registered')) {
          errorMessage = 'Este correo electrónico ya está registrado.';
        } else if (error.message?.includes('invalid email')) {
          errorMessage = 'El formato del correo electrónico no es válido.';
        } else if (error.message?.includes('weak password')) {
          errorMessage = 'La contraseña debe tener al menos 8 caracteres.';
        }

        this.dialogService.showErrorDialog(errorMessage, 'Error de Registro');
        return;
      }

      console.log('Registro exitoso:', data);

      this.dialogService.showSuccessDialog(
        'Tu cuenta ha sido creada exitosamente. Por favor, verifica tu correo electrónico.',
        'Registro Exitoso'
      );

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
