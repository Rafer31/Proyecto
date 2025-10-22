import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormsModule,
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
} from '@angular/forms';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TripTemplateService } from '../../../../../../../shared/services/trip-template.service';
import { UserStateService } from '../../../../../../../shared/services/user-state.service';

export interface SaveTemplateDialogData {
  idplanificacion: string;
  destino: string;
  conductor: any;
  vehiculo: any;
  empresa: any;
  horapartida: string;
}

@Component({
  selector: 'app-save-template-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './save-template-dialog.html',
  styleUrl: './save-template-dialog.scss',
})
export class SaveTemplateDialog {
  private dialogRef = inject(MatDialogRef<SaveTemplateDialog>);
  public data = inject(MAT_DIALOG_DATA) as SaveTemplateDialogData;
  private fb = inject(FormBuilder);
  private templateService = inject(TripTemplateService);
  private userState = inject(UserStateService);
  private snackBar = inject(MatSnackBar);

  templateForm: FormGroup;
  isSaving = signal(false);

  constructor() {
    this.templateForm = this.fb.group({
      nombreplantilla: ['', Validators.compose([Validators.required, Validators.maxLength(255)])],
      descripcion: ['', Validators.maxLength(500)],
    });
  }

  onCancel() {
    this.dialogRef.close(false);
  }

  async onSave() {
    if (this.templateForm.invalid) {
      return;
    }

    const currentUser = this.userState.currentUser();
    if (!currentUser) {
      this.snackBar.open('Error: Usuario no autenticado', 'Cerrar', {
        duration: 3000,
      });
      return;
    }

    this.isSaving.set(true);

    try {
      const formData = this.templateForm.value;

      const template = await this.templateService.createTemplate({
        nombreplantilla: formData.nombreplantilla,
        descripcion: formData.descripcion || undefined,
        idconductor: this.data.conductor.idconductor,
        nroplaca: this.data.vehiculo.nroplaca,
        idempresa: this.data.empresa.idempresa,
        iddestino: this.data.destino,
        horapartida_default: this.data.horapartida,
 
        creadopor: currentUser.idusuario,
      });

      this.snackBar.open('Plantilla guardada exitosamente', 'Cerrar', {
        duration: 3000,
      });

      this.dialogRef.close(true);
    } catch (error: any) {
      console.error('Error guardando plantilla:', error);
      this.snackBar.open(
        error.message || 'Error al guardar la plantilla',
        'Cerrar',
        {
          duration: 4000,
        }
      );
    } finally {
      this.isSaving.set(false);
    }
  }

  get nombreControl() {
    return this.templateForm.get('nombreplantilla');
  }

  get descripcionControl() {
    return this.templateForm.get('descripcion');
  }
}