import { ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { DialogService } from '../../../../../shared/services/dialog.service';
import { RegisterUserService } from '../../services/register-users.service';

@Component({
  selector: 'app-add-users',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './add-users.html',
  styleUrls: ['./add-users.scss']
})
export class AddUsers implements OnInit {
  private fb = inject(FormBuilder);
  private dialogRef = inject(MatDialogRef<AddUsers>);
  private registerUserService = inject(RegisterUserService);
  private dialogService = inject(DialogService);
  private cdr = inject(ChangeDetectorRef);

  roles: Array<{ idrol: string; nomrol: string }> = [];
  loading = false;

  form = this.fb.group({
    // Datos básicos del usuario
    ci: ['', [Validators.required, Validators.pattern(/^\d{7,10}$/)]],
    nombre: ['', [Validators.required, Validators.minLength(2)]],
    paterno: ['', [Validators.required, Validators.minLength(2)]],
    materno: [''],
    numcelular: ['', [Validators.required, Validators.pattern(/^[67]\d{7}$/)]],
    email: ['', [Validators.required, Validators.email]],
    rol: ['', Validators.required],

    // Campos específicos por rol
    // Para Personal y Administrador
    nroficha: [''],
    operacion: [''],
    direccion: [''],

    // Para Visitante
    informacion: ['']
  });

  ngOnInit(): void {
    this.loadRoles();
    this.setupRoleValidation();
  }

  private async loadRoles() {
    try {
      this.roles = await this.registerUserService.getRoles();
    } catch (error) {
      console.error('Error cargando roles:', error);
      await this.dialogService.showErrorDialog(
        'Error al cargar los roles disponibles',
        'Error'
      );
    }
  }

  private setupRoleValidation() {
    this.form.get('rol')?.valueChanges.subscribe(role => {
      this.clearRoleSpecificValidators();

      if (role === 'Personal' || role === 'Administrador') {
        this.form.get('nroficha')?.setValidators([Validators.required]);
        this.form.get('operacion')?.setValidators([Validators.required]);
        this.form.get('direccion')?.setValidators([Validators.required]);
      } else if (role === 'Visitante') {
        this.form.get('informacion')?.setValidators([Validators.required]);
      }

      this.form.get('nroficha')?.updateValueAndValidity();
      this.form.get('operacion')?.updateValueAndValidity();
      this.form.get('direccion')?.updateValueAndValidity();
      this.form.get('informacion')?.updateValueAndValidity();
    });
  }

  private clearRoleSpecificValidators() {
    this.form.get('nroficha')?.clearValidators();
    this.form.get('operacion')?.clearValidators();
    this.form.get('direccion')?.clearValidators();
    this.form.get('informacion')?.clearValidators();
  }

  get selectedRole() {
    return this.form.get('rol')?.value;
  }

  async onSubmit() {
    if (this.form.invalid) {
      this.markFormGroupTouched();
      return;
    }

    // Evitar múltiples envíos
    if (this.loading) {
      return;
    }

    try {
      this.loading = true;
      this.cdr.markForCheck();

      const formValue = this.form.value;

      // Validar CI único antes de continuar
      const ciExists = await this.registerUserService.checkCIExists(formValue.ci!);
      if (ciExists) {
        this.loading = false;
        this.cdr.markForCheck();
        await this.dialogService.showErrorDialog(
          'Ya existe un usuario con esta cédula de identidad',
          'CI Duplicada'
        );
        return;
      }

      // Validar formatos
      if (!this.registerUserService.validateCIFormat(formValue.ci!)) {
        this.loading = false;
        this.cdr.markForCheck();
        await this.dialogService.showErrorDialog(
          'El formato de CI no es válido. Debe tener entre 7 y 10 dígitos.',
          'CI Inválida'
        );
        return;
      }

      if (!this.registerUserService.validateCelularFormat(formValue.numcelular!)) {
        this.loading = false;
        this.cdr.markForCheck();
        await this.dialogService.showErrorDialog(
          'El formato de celular no es válido. Debe tener 8 dígitos y empezar con 6 o 7.',
          'Celular Inválido'
        );
        return;
      }

      // Preparar datos del usuario
      const userData = {
        ci: formValue.ci!,
        nombre: formValue.nombre!,
        paterno: formValue.paterno!,
        materno: formValue.materno || '',
        numcelular: formValue.numcelular!,
        email: formValue.email!,
        rol: formValue.rol!,
        // Campos específicos por rol
        nroficha: formValue.nroficha || '',
        operacion: formValue.operacion || '',
        direccion: formValue.direccion || '',
        informacion: formValue.informacion || ''
      };

      // Registrar usuario completo
      const result = await this.registerUserService.registerUserFromAdmin(userData);

      // Finalizar loading antes del diálogo de éxito
      this.loading = false;
      this.cdr.markForCheck();

      // Mostrar mensaje de éxito
      await this.dialogService.showSuccessDialog(
        `Usuario ${userData.nombre} ${userData.paterno} creado exitosamente.\n\nSe ha enviado un correo de confirmación a ${userData.email}. El usuario deberá confirmar su email y establecer una nueva contraseña para acceder al sistema.`,
        'Usuario Creado'
      );

      // Cerrar el diálogo
      this.dialogRef.close(true);

    } catch (error: any) {
      console.error('Error creando usuario:', error);
      this.loading = false;
      this.cdr.markForCheck();

      await this.dialogService.showErrorDialog(
        error.message || 'Error al crear el usuario. Por favor, inténtelo nuevamente.',
        'Error'
      );
    }
  }

  private markFormGroupTouched() {
    Object.keys(this.form.controls).forEach(key => {
      const control = this.form.get(key);
      control?.markAsTouched();
    });
  }

  onCancel() {
    this.dialogRef.close(false);
  }

  // Validaciones personalizadas para mostrar errores
  getErrorMessage(fieldName: string): string {
    const field = this.form.get(fieldName);

    if (field?.hasError('required')) {
      return 'Este campo es requerido';
    }

    if (field?.hasError('email')) {
      return 'Ingrese un email válido';
    }

    if (field?.hasError('pattern')) {
      switch (fieldName) {
        case 'ci':
          return 'CI debe tener entre 7 y 10 dígitos';
        case 'numcelular':
          return 'Número de celular debe tener 8 dígitos';
        default:
          return 'Formato inválido';
      }
    }

    if (field?.hasError('minlength')) {
      return `Mínimo ${field.errors?.['minlength']?.requiredLength} caracteres`;
    }

    return '';
  }
}
