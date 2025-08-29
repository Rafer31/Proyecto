import { Component, inject, signal } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { MatStepperModule } from '@angular/material/stepper';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog'; // 👈 para dialogs
import { SupabaseService } from '../../../shared/services/supabase.service';
import { UserDataService } from '../../services/userdata.service';
import { LoadingDialog } from '../../../shared/components/loading-dialog/loading-dialog';
import { SuccessDialog } from '../../../shared/components/success-dialog/success-dialog';
import { ErrorDialog } from '../../../shared/components/error-dialog/error-dialog';

@Component({
  selector: 'app-register-user',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatStepperModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule,
  ],
  templateUrl: './register-user.html',
  styleUrl: './register-user.scss',
})
export default class RegisterUser {
  private fb = inject(FormBuilder);
  private supabase = inject(SupabaseService).supabase;
  private userDataService = inject(UserDataService);
  private router = inject(Router);
  private dialog = inject(MatDialog);

  formUser: FormGroup = this.fb.group({});
  selectedRole = signal<string | null>(null);

  ngOnInit() {
    this.initializeForm();
    this.setupValidationListeners();
  }

  private initializeForm() {
    this.formUser = this.fb.group({
      step1: this.fb.group({
        nombre: ['', Validators.required],
        paterno: ['', Validators.required],
        materno: [''],
        ci: ['', Validators.required],
        rol: ['', Validators.required],
        numcelular: ['', Validators.required],
      }),
      step2: this.fb.group({
        nroficha: [''],
        operacion: [''],
        direccion: [''],
        informacion: [''],
      }),
    });
  }

  private setupValidationListeners() {
    this.formUser.get('step1.rol')?.valueChanges.subscribe((rol) => {
      this.selectedRole.set(rol);
      this.updateValidators(rol);
    });
  }

  private updateValidators(rol: string) {
    const step2 = this.formUser.get('step2') as FormGroup;

    step2.get('nroficha')?.clearValidators();
    step2.get('operacion')?.clearValidators();
    step2.get('direccion')?.clearValidators();
    step2.get('informacion')?.clearValidators();

    if (rol === 'Personal') {
      step2.get('nroficha')?.setValidators([Validators.required]);
    }
    if (rol === 'Visitante') {
      step2.get('informacion')?.setValidators([Validators.required]);
    }

    step2.updateValueAndValidity();
  }

  async onSubmit() {
    if (this.formUser.invalid) {
      this.formUser.markAllAsTouched();
      return;
    }

    const { step1, step2 } = this.formUser.value;

    const {
      data: { session },
    } = await this.supabase.auth.getSession();
    const authId = session?.user.id;

    if (!authId) {
      console.error('No hay usuario autenticado');
      return;
    }

    // 👇 Abrimos el diálogo de loading
    const loadingDialog = this.dialog.open(LoadingDialog, {
      disableClose: true,
    });

    try {
      const result = await this.userDataService.registerUser({
        ...step1,
        ...step2,
        authId,
      });
      console.log('Usuario registrado exitosamente:', result);

      // Cerramos el loading y mostramos éxito
      loadingDialog.close();
      this.dialog.open(SuccessDialog, {
        data: { message: 'Registro exitoso!' },
      });

      // Redirigir según rol
      switch (step1.rol) {
        case 'Visitante':
          this.router.navigate(['/users/visitant']);
          break;
        case 'Personal':
          this.router.navigate(['/users/staff']);
          break;
        default:
          this.router.navigate(['/login']);
      }
    } catch (error) {
      console.error('Error al registrar usuario:', error);
      loadingDialog.close();
      this.dialog.open(ErrorDialog, {
        data: { message: 'Error al registrar usuario' },
      });
    }
  }

  get step1Form(): FormGroup {
    return this.formUser.get('step1') as FormGroup;
  }

  get step2Form(): FormGroup {
    return this.formUser.get('step2') as FormGroup;
  }
}
