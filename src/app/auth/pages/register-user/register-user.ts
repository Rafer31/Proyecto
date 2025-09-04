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
import { MatDialog } from '@angular/material/dialog';
import { SupabaseService } from '../../../shared/services/supabase.service';
import { UserDataService } from '../../services/userdata.service';
import { LoadingDialog } from '../../../shared/components/loading-dialog/loading-dialog';
import { SuccessDialog } from '../../../shared/components/success-dialog/success-dialog';
import { ErrorDialog } from '../../../shared/components/error-dialog/error-dialog';
import { DestinyService } from '../../../shared/services/destiny.service';

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
  private destinyService = inject(DestinyService);
  private router = inject(Router);
  private dialog = inject(MatDialog);
  destinos = signal<any[]>([]);

  formUser: FormGroup = this.fb.group({});
  selectedRole = signal<string | null>(null);

  ngOnInit() {
    this.initializeForm();
    this.setupValidationListeners();
    this.loadDestinos();
  }
  private async loadDestinos() {
    try {
      const data = await this.destinyService.getDestinos();
      this.destinos.set(data);
    } catch (error) {
      console.error('No se pudieron cargar los destinos', error);
    }
  }
  private initializeForm() {
    this.formUser = this.fb.group({
      step1: this.fb.group({
        nombre: ['', [Validators.required, Validators.minLength(2)]],
        paterno: ['', [Validators.required, Validators.minLength(2)]],
        materno: [''],
        ci: ['', [Validators.required, Validators.pattern(/^\d{7,10}$/)]],
        numcelular: [
          '',
          [Validators.required, Validators.pattern(/^[67]\d{7}$/)],
        ],
        rol: ['', Validators.required],
      }),
      step2: this.fb.group({
        nroficha: [''],
        operacion: [''],
        iddestino: ['', Validators.required],
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

    step2.reset();

    Object.keys(step2.controls).forEach((key) => {
      step2.get(key)?.clearValidators();
      step2.get(key)?.setErrors(null);
    });

    if (rol === 'Personal') {
      step2.get('nroficha')?.setValidators([Validators.required]);
      step2.get('operacion')?.setValidators([Validators.required]);
      step2.get('iddestino')?.setValidators([Validators.required]);
    }

    if (rol === 'Visitante') {
      step2.get('informacion')?.setValidators([Validators.required]);
    }

    Object.keys(step2.controls).forEach((key) => {
      step2.get(key)?.updateValueAndValidity();
    });

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

    const loadingDialog = this.dialog.open(LoadingDialog, {
      disableClose: true,
    });

    try {
      await this.userDataService.registerUser({
        ...step1,
        ...step2,
        authId,
      });

      loadingDialog.close();
      const successDialog = this.dialog.open(SuccessDialog, {
        data: { message: 'Registro exitoso!' },
      });

      successDialog.afterClosed().subscribe(() => {
        const redirectDialog = this.dialog.open(LoadingDialog, {
          disableClose: true,
        });

        let target = '/login';
        switch (step1.rol) {
          case 'Visitante':
            target = '/users/visitant';
            break;
          case 'Personal':
            target = '/users/staff';
            break;
        }

        this.router.navigate([target]).then(() => {
          redirectDialog.close();
          this.formUser.reset();
        });
      });
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
