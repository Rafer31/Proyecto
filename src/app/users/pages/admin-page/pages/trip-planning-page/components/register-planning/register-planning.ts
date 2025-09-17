import { Component, inject, signal } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';
import { MatStepperModule } from '@angular/material/stepper';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { provideNativeDateAdapter } from '@angular/material/core';
import { TripPlanningService } from '../../../../services/trip-planning.service';
import { UserService } from '../../../../../../services/user.service';

@Component({
  selector: 'app-register-trip-dialog',
  standalone: true,
  providers: [provideNativeDateAdapter()],
  imports: [
    ReactiveFormsModule,
    MatStepperModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule,
    MatDatepickerModule,
  ],
  templateUrl: './register-planning.html',
})
export class RegisterTripDialog {
  private fb = inject(FormBuilder);
  private dialogRef = inject(MatDialogRef<RegisterTripDialog>);
  private tripService = inject(TripPlanningService);
  private userService = inject(UserService);
  destinos = signal<any[]>([]);
  conductores = signal<any[]>([]);
  vehiculos = signal<any[]>([]);
  empresas = signal<any[]>([]);
  selectedVehiculo: any = null;

  formTrip!: FormGroup;

  ngOnInit() {
    this.initializeForm();
    this.loadData();
  }

  private initializeForm() {
    this.formTrip = this.fb.group({
      step1: this.fb.group({
        idconductor: ['', Validators.required],
        nroplaca: ['', Validators.required],
        idempresa: ['', Validators.required],
      }),
      step2: this.fb.group({
        fechapartida: ['', Validators.required],
        fechallegada: ['', Validators.required],
        horapartida: ['', Validators.required],
        horallegada: ['', Validators.required],
        iddestino: ['', Validators.required],
      }),
    });
  }

  // register-trip.dialog.ts -> loadData()
  private async loadData() {
    this.destinos.set(await this.tripService.getDestinos());
    // antes: this.conductores.set(await this.tripService.getConductores());
    this.conductores.set(await this.userService.getConductores());
    this.vehiculos.set(await this.tripService.getVehiculos());
    this.empresas.set(await this.tripService.getEmpresas());

    console.log('conductores cargados', this.conductores());
  }

  get step1Form(): FormGroup {
    return this.formTrip.get('step1') as FormGroup;
  }
  get step2Form(): FormGroup {
    return this.formTrip.get('step2') as FormGroup;
  }

  onVehiculoSelected(nroplaca: string) {
    this.selectedVehiculo = this.vehiculos().find(
      (v) => v.nroplaca === nroplaca
    );
  }

  async onSubmit() {
    if (this.formTrip.invalid) {
      this.formTrip.markAllAsTouched();
      return;
    }
    const { step1, step2 } = this.formTrip.value;

    try {
      const viaje = await this.tripService.registrarViaje(
        step1,
        step2,
        this.selectedVehiculo
      );
      this.dialogRef.close(viaje); // <- devuelve el viaje creado al padre
    } catch (err) {
      console.error('Error al registrar viaje', err);
    }
  }

  onCancel() {
    this.dialogRef.close();
  }
}
