import { Component, inject } from '@angular/core';
import {
  MatDialogRef,
  MAT_DIALOG_DATA,
  MatDialogModule,
} from '@angular/material/dialog';
import {
  FormBuilder,
  Validators,
  ReactiveFormsModule,
  NonNullableFormBuilder,
} from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { Vehicle, VehicleService } from '../../../../services/vehicle.service';

export interface VehicleDialogData {
  isEdit: boolean;
  vehicle?: Vehicle;
}

@Component({
  selector: 'app-dialog-vehicle',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatDialogModule,
  ],
  templateUrl: './dialog-vehicle.html',
})
export class DialogVehicle {
  private dialogRef = inject(MatDialogRef<DialogVehicle>);
  data = inject<VehicleDialogData>(MAT_DIALOG_DATA);
  private vehicleService = inject(VehicleService);
  private fb = inject(NonNullableFormBuilder);

  form = this.fb.group({
    nroplaca: ['', Validators.required],
    color: ['', Validators.required],
    nroasientos: [0, [Validators.required, Validators.min(1)]],
    tipovehiculo: ['bus' as 'bus' | 'minibus' | 'mini', Validators.required],
  });

  constructor() {
    if (this.data.isEdit && this.data.vehicle) {
      this.form.patchValue(this.data.vehicle);
      this.form.get('nroplaca')?.disable();
    }
  }

  async save() {
    if (this.form.invalid) return;

    try {
      if (this.data.isEdit && this.data.vehicle) {
        const updated = await this.vehicleService.updateVehicle(
          this.data.vehicle.nroplaca,
          this.form.getRawValue()
        );
        this.dialogRef.close(updated);
      } else {
        const created = await this.vehicleService.createVehicle(
          this.form.value as Vehicle
        );
        this.dialogRef.close(created);
      }
    } catch (err) {
      console.error('Error guardando vehículo:', err);
    }
  }

  close() {
    this.dialogRef.close();
  }
}
