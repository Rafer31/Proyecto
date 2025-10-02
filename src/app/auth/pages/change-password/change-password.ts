import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { SupabaseService } from '../../../shared/services/supabase.service';
import { DialogService } from '../../../shared/services/dialog.service';
import { UserDataService } from '../../services/userdata.service';

@Component({
  selector: 'app-change-password',
  imports: [
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
  ],
  templateUrl: './change-password.html',
  styleUrl: './change-password.scss',
})
export default class ChangePassword {
  private fb = inject(FormBuilder);
  private supabase = inject(SupabaseService).supabase;
  private router = inject(Router);
  private dialogService = inject(DialogService);
  private userDataService = inject(UserDataService);

  hidePassword = signal(true);
  hideConfirmPassword = signal(true);
  isLoading = signal(false);

  form = this.fb.group(
    {
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirm: ['', Validators.required],
    },
    { validators: this.passwordsMatchValidator }
  );

  private passwordsMatchValidator(group: any) {
    const pass = group.get('password')?.value;
    const confirm = group.get('confirm')?.value;
    return pass === confirm ? null : { mismatch: true };
  }

  async onSubmit() {
    if (this.form.invalid || this.isLoading()) return;

    const { password } = this.form.value;

    this.isLoading.set(true);
    const loadingRef = this.dialogService.showLoadingDialog();

    try {
      const { error } = await this.supabase.auth.updateUser({
        password: password!,
      });
      this.dialogService.closeLoadingDialog();

      if (error) {
        console.error('Error actualizando contraseña:', error.message);
        await this.dialogService.showErrorDialog(error.message, 'Error');
        return;
      }


      const {
        data: { user },
        error: userErr,
      } = await this.supabase.auth.getUser();

      if (userErr || !user) {
        await this.dialogService.showErrorDialog(
          'Tu sesión se actualizó. Vuelve a iniciar sesión.',
          'Sesión cerrada'
        );
        this.router.navigate(['/login']);
        return;
      }


      const usuario = await this.userDataService.getUserByAuthId(user.id);

      if (!usuario) {
        this.router.navigate(['/register-user']);
      } else {
        switch (usuario.rol) {
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
            this.router.navigate(['/login']);
        }
      }

      await this.dialogService.showSuccessDialog(
        'Contraseña actualizada correctamente',
        'Éxito'
      );
    } finally {
      this.isLoading.set(false);
    }
  }
}
