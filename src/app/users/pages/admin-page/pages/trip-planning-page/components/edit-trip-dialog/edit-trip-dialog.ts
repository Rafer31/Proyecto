import { Component, Inject, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { provideNativeDateAdapter } from '@angular/material/core';
import { TripPlanningService } from '../../../../services/trip-planning.service';
import { DestinyService } from '../../../../../../../shared/services/destiny.service';

@Component({
  selector: 'app-edit-trip-dialog',
  standalone: true,
  providers: [provideNativeDateAdapter()],
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule,
    MatDatepickerModule,
    MatDialogModule
  ],
  templateUrl: './edit-trip-dialog.html',
  styleUrls: ['./edit-trip-dialog.scss'],
})
export class EditTripDialog {
  private fb = inject(FormBuilder);
  private dialogRef = inject(MatDialogRef<EditTripDialog>);
  private tripService = inject(TripPlanningService);
  private destinyService = inject(DestinyService)
  destinos: any[] = [];
  formStep2!: FormGroup;

  constructor(@Inject(MAT_DIALOG_DATA) public data: any) {}

  async ngOnInit() {
    this.formStep2 = this.fb.group({
      fechapartida: [this.data?.viaje.fechapartida || '', Validators.required],
      fechallegada: [this.data?.viaje.fechallegada || '', Validators.required],
      horapartida: [this.data?.viaje.horapartida || '', Validators.required],

      iddestino: [this.data?.viaje.destino?.iddestino || '', Validators.required],
    });

    this.destinos = await this.destinyService.getDestinosParaViajes();
  }

  async onSubmit() {
    if (this.formStep2.invalid) {
      this.formStep2.markAllAsTouched();
      return;
    }

    try {
      const updated = await this.tripService.actualizarPlanificacion(
        this.data.viaje.idplanificacion,
        this.formStep2.value
      );
      this.dialogRef.close(updated);
    } catch (err) {
      console.error('Error al actualizar viaje:', err);
    }
  }

  onCancel() {
    this.dialogRef.close();
  }
}
