import { ChangeDetectorRef, Component, inject, OnInit, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogRef, MatDialogModule, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { DialogService } from '../../../../../shared/services/dialog.service';
import { EditUsersService } from '../../services/edit-users.service';
import { RegisterUserService } from '../../services/register-users.service';

export interface EditUserData {
  idusuario: string;
  ci: string;
  nombre: string;
  paterno: string;
  materno: string;
  numcelular: string;
  email: string; // Solo informativo, no se edita
  rol: string; // Nombre del rol
  idrol: string; // ID del rol
  // Campos específicos por rol
  nroficha?: string; // Para Personal/Administrador
  operacion?: string; // Para Personal/Administrador
  direccion?: string; // Para Personal/Administrador
  informacion?: string; // Para Visitante
}

@Component({
  selector: 'app-edit-users',
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
  templateUrl: './edit-users.html',
  styleUrls: ['./edit-users.scss']
})
export class EditUsers {
  private fb = inject(FormBuilder);
  private dialogRef = inject(MatDialogRef<EditUsers>);
  private editUsersService = inject(EditUsersService);
  private registerUserService = inject(RegisterUserService);
  private dialogService = inject(DialogService);
  private cdr = inject(ChangeDetectorRef);

  roles: Array<{ idrol: string; nomrol: string }> = [];
  loading = false;
  originalCi: string;

  form = this.fb.group({
    ci: ['', [Validators.required, Validators.pattern(/^\d{7,10}$/)]],
    nombre: ['', [Validators.required, Validators.minLength(2)]],
    paterno: ['', [Validators.required, Validators.minLength(2)]],
    materno: [''],
    numcelular: ['', [Validators.required, Validators.pattern(/^[67]\d{7}$/)]],
    email: [{ value: '', disabled: true }], // Email solo informativo - NO se actualiza
    rol: ['', Validators.required],

    nroficha: [''],
    operacion: [''],
    direccion: [''],
    informacion: ['']
  });

  constructor(@Inject(MAT_DIALOG_DATA) public data: EditUserData) {
    this.originalCi = data.ci;
  }

  ngOnInit(): void {
    this.loadRoles();
    this.setupRoleValidation();
    this.populateForm();
  }

  private populateForm() {
    this.form.patchValue({
      ci: this.data.ci,
      nombre: this.data.nombre,
      paterno: this.data.paterno,
      materno: this.data.materno || '',
      numcelular: this.data.numcelular,
      email: this.data.email,
      rol: this.data.rol,
      nroficha: this.data.nroficha || '',
      operacion: this.data.operacion || '',
      direccion: this.data.direccion || '',
      informacion: this.data.informacion || ''
    });
  }

  private async loadRoles() {
    try {
      this.roles = await this.registerUserService.getRoles();
    } catch (error) {
      console.error('Error cargando roles:', error);
      this.dialogService.showErrorDialog(
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
    if (this.loading) {
      return;
    }

    try {
      this.loading = true;
      this.cdr.markForCheck();

      const formValue = this.form.value;

      // Validar CI solo si cambió
      if (formValue.ci !== this.originalCi) {
        const ciExists = await this.registerUserService.checkCIExists(formValue.ci!);
        if (ciExists) {
          this.loading = false;
          this.cdr.markForCheck();
          await this.dialogService.showErrorDialog(
            'Ya existe un usuario con esta cédula de identidad',
            'CI Duplicada'
          ).afterClosed();
          return;
        }
      }

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

      // Buscar el idrol basado en el nombre del rol seleccionado
      const selectedRoleObj = this.roles.find(role => role.nomrol === formValue.rol);
      if (!selectedRoleObj) {
        this.loading = false;
        this.cdr.markForCheck();
        await this.dialogService.showErrorDialog(
          'Rol seleccionado no válido',
          'Error'
        );
        return;
      }

      const userData = {
        ci: formValue.ci!,
        nombre: formValue.nombre!,
        paterno: formValue.paterno!,
        materno: formValue.materno || '',
        numcelular: formValue.numcelular!,
        rol: formValue.rol!,
        idrol: selectedRoleObj.idrol,
        nroficha: formValue.nroficha || '',
        operacion: formValue.operacion || '',
        direccion: formValue.direccion || '',
        informacion: formValue.informacion || ''
      };

      await this.editUsersService.updateUser(this.data.idusuario, userData);

      this.loading = false;
      this.cdr.markForCheck();

      await this.dialogService.showSuccessDialog(
        `Usuario ${userData.nombre} ${userData.paterno} actualizado exitosamente.`,
        'Usuario Actualizado'
      ).afterClosed();
      this.dialogRef.close(true);

    } catch (error: any) {
      console.error('Error actualizando usuario:', error);
      this.loading = false;
      this.cdr.markForCheck();

      await this.dialogService.showErrorDialog(
        error.message || 'Error al actualizar el usuario. Por favor, inténtelo nuevamente.',
        'Error'
      ).afterClosed();
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
