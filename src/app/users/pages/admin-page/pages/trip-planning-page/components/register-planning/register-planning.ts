import { Component, inject, signal, computed, effect } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
  AbstractControl,
  ValidationErrors,
} from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';
import { MatStepperModule } from '@angular/material/stepper';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { provideNativeDateAdapter } from '@angular/material/core';
import { TripPlanningService } from '../../../../services/trip-planning.service';
import { UserService } from '../../../../../../services/user.service';
import { DestinyService } from '../../../../../../../shared/services/destiny.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-register-trip-dialog',
  standalone: true,
  providers: [provideNativeDateAdapter()],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatStepperModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule,
    MatDatepickerModule,
    MatCheckboxModule,
    MatIconModule,
  ],
  templateUrl: './register-planning.html',
  styleUrl: './register-planning.scss',
})
export class RegisterTripDialog {
  private fb = inject(FormBuilder);
  private dialogRef = inject(MatDialogRef<RegisterTripDialog>);
  private destinyService = inject(DestinyService);
  private tripService = inject(TripPlanningService);
  private userService = inject(UserService);

  destinos = signal<any[]>([]);
  destinosRetorno = signal<any[]>([]);
  conductores = signal<any[]>([]);
  vehiculos = signal<any[]>([]);
  empresas = signal<any[]>([]);
  selectedVehiculo: any = null;

  loadingConductores = signal<boolean>(true);
  loadingVehiculos = signal<boolean>(true);
  loadingData = signal<boolean>(true);

  // Control de flujo: salida -> pregunta retorno -> retorno
  etapaActual = signal<'salida' | 'pregunta-retorno' | 'retorno'>('salida');
  datosViajeSalida: any = null;

  turnos = [
    { value: 'manana', label: 'Mañana', inicio: 6, fin: 12 },
    { value: 'tarde', label: 'Tarde', inicio: 12, fin: 18 },
    { value: 'noche', label: 'Noche', inicio: 18, fin: 24 },
    { value: 'madrugada', label: 'Madrugada', inicio: 0, fin: 6 },
  ];

  turnoSeleccionado = signal<string | null>(null);

  todasLasHoras = this.generarHoras();

  horasFiltradas = computed(() => {
    return this.filtrarHorasPorTurno(this.turnoSeleccionado());
  });

  formTrip!: FormGroup;

  constructor() {
    effect(() => {
      const hayConductores = this.conductores().length > 0;
      const hayVehiculos = this.vehiculos().length > 0;
      const isLoading = this.loadingData();

      if (this.formTrip) {
        const nroplacaControl = this.step1Form.get('nroplaca');
        const idempresaControl = this.step1Form.get('idempresa');

        if (!hayConductores || !hayVehiculos || isLoading) {
          nroplacaControl?.disable({ emitEvent: false });
          idempresaControl?.disable({ emitEvent: false });
        } else {
          nroplacaControl?.enable({ emitEvent: false });
          idempresaControl?.enable({ emitEvent: false });
        }
      }
    });
  }

  ngOnInit() {
    this.initializeForm();
    this.loadData();
  }

  private initializeForm() {
    this.formTrip = this.fb.group({
      step1: this.fb.group({
        idconductor: ['', Validators.required],
        nroplaca: [{ value: '', disabled: true }, Validators.required],
        idempresa: [{ value: '', disabled: true }, Validators.required],
      }),
      step2: this.fb.group({
        fechapartida: ['', Validators.required],
        fechallegada: ['', [Validators.required, this.validarFechaLlegada.bind(this)]],
        horapartida: [{ value: '', disabled: true }, Validators.required],
        iddestino: ['', Validators.required],
      }),
    });

    this.step2Form.get('fechapartida')?.valueChanges.subscribe(() => {
      this.step2Form.get('fechallegada')?.updateValueAndValidity({ emitEvent: false });
    });
  }

  private async loadData() {
    try {
      this.loadingData.set(true);
      this.loadingConductores.set(true);
      this.loadingVehiculos.set(true);

      const [destinos, destinoBolivar, conductores, vehiculos, empresas] = await Promise.all([
        this.destinyService.getDestinosParaViajes(),
        this.destinyService.getDestinoBolivar(),
        this.userService.getConductoresDisponibles(),
        this.tripService.getVehiculosDisponibles(),
        this.tripService.getEmpresas(),
      ]);

      this.destinos.set(destinos);



      this.destinosRetorno.set(destinoBolivar ? [destinoBolivar] : []);

      this.conductores.set(conductores);
      this.vehiculos.set(vehiculos);
      this.empresas.set(empresas);
    } catch (error) {
      console.error('Error cargando datos:', error);
    } finally {
      this.loadingConductores.set(false);
      this.loadingVehiculos.set(false);
      this.loadingData.set(false);
    }
  }

  get step1Form(): FormGroup {
    return this.formTrip.get('step1') as FormGroup;
  }

  get step2Form(): FormGroup {
    return this.formTrip.get('step2') as FormGroup;
  }

  onVehiculoSelected(nroplaca: string) {
    this.selectedVehiculo = this.vehiculos().find((v) => v.nroplaca === nroplaca);
  }

  async onSubmitSalida() {
    this.formTrip.markAllAsTouched();

    const horaPartida = this.step2Form.get('horapartida');

    if (horaPartida?.disabled) {
      alert('Debe seleccionar un turno para las horas');
      return;
    }

    if (this.formTrip.invalid) {
      return;
    }

    const step1 = this.formTrip.get('step1')?.value;
    const step2 = {
      ...this.step2Form.value,
      horapartida: this.step2Form.get('horapartida')?.value,
      tipo: 'salida',
    };

    try {
      const viaje = await this.tripService.registrarViaje(
        step1,
        step2,
        this.selectedVehiculo
      );

      // Guardar datos del viaje de salida
      this.datosViajeSalida = { viaje, step1 };

      // Ir a la etapa de pregunta
      this.etapaActual.set('pregunta-retorno');
    } catch (err) {
      console.error('Error al registrar viaje', err);
    }
  }

  onDecidirRetorno(crearRetorno: boolean) {
    if (crearRetorno) {
      // Ir a la etapa de retorno primero
      this.etapaActual.set('retorno');

      // Esperar un tick para que Angular renderice el formulario
      setTimeout(() => {
        // Resetear completamente el formulario
        this.step2Form.reset();

        // Resetear el turno seleccionado
        this.turnoSeleccionado.set(null);

        // Deshabilitar hora partida inicialmente
        const horaPartidaControl = this.step2Form.get('horapartida');
        if (horaPartidaControl) {
          horaPartidaControl.disable({ emitEvent: false });
          horaPartidaControl.setValue('', { emitEvent: false });
        }

        // Configurar destino de retorno automáticamente (CRÍTICO)
        if (this.destinosRetorno().length > 0) {
          const destinoControl = this.step2Form.get('iddestino');
          const destinoBolivar = this.destinosRetorno()[0];


          if (destinoControl && destinoBolivar) {
            destinoControl.setValue(destinoBolivar.iddestino);
            destinoControl.markAsTouched();
            destinoControl.updateValueAndValidity();
          }
        }

        // Asegurarse de que las fechas estén limpias
        this.step2Form.get('fechapartida')?.setValue(null);
        this.step2Form.get('fechallegada')?.setValue(null);


      }, 0);
    } else {
      this.dialogRef.close({
        viaje: this.datosViajeSalida.viaje,
        retorno: null
      });
    }
  }

  async onSubmitRetorno() {


    this.step2Form.markAllAsTouched();

    const horaPartida = this.step2Form.get('horapartida');

    if (horaPartida?.disabled) {
      alert('Debe seleccionar un turno para las horas del retorno');
      return;
    }

    if (this.step2Form.invalid) {
      alert('Por favor complete todos los campos requeridos');
      return;
    }

    const step2Retorno = {
      ...this.step2Form.value,
      horapartida: this.step2Form.get('horapartida')?.value,
      tipo: 'retorno',
    };

    try {
      // Pasar el ID del viaje de salida como viaje relacionado
      const viajeRetorno = await this.tripService.registrarViaje(
        this.datosViajeSalida.step1,
        step2Retorno,
        this.selectedVehiculo,

      );

      this.dialogRef.close({
        viaje: this.datosViajeSalida.viaje,
        retorno: viajeRetorno
      });
    } catch (err) {
      console.error('Error al registrar retorno', err);
    }
  }

  onCancel() {
    this.dialogRef.close();
  }

  volverASalida() {
    // Volver desde pregunta a salida (eliminar el viaje creado)
    if (this.datosViajeSalida?.viaje) {
      this.tripService.eliminarViaje(this.datosViajeSalida.viaje.idplanificacion)
        .catch(err => console.error('Error eliminando viaje:', err));
    }
    this.datosViajeSalida = null;
    this.etapaActual.set('salida');
  }

  volverAPregunta() {
    this.etapaActual.set('pregunta-retorno');
  }

  private generarHoras(): string[] {
    const horas: string[] = [];
    for (let h = 0; h < 24; h++) {
      for (let m = 0; m < 60; m += 15) {
        const hora = h.toString().padStart(2, '0');
        const minuto = m.toString().padStart(2, '0');
        horas.push(`${hora}:${minuto}`);
      }
    }
    return horas;
  }

  // Crear un método para trackBy
  trackByHora(index: number, hora: string): string {
    return hora;
  }

  trackByTurno(index: number, turno: any): string {
    return turno.value;
  }

  trackByDestino(index: number, destino: any): string | number {
    return destino.iddestino;
  }

  trackByConductor(index: number, conductor: any): string | number {
    return conductor.idconductor;
  }

  trackByVehiculo(index: number, vehiculo: any): string {
    return vehiculo.nroplaca;
  }

  trackByEmpresa(index: number, empresa: any): string | number {
    return empresa.idempresa;
  }

  private filtrarHorasPorTurno(turnoSeleccionado: string | null): string[] {
    if (!turnoSeleccionado) {
      return this.todasLasHoras;
    }

    const turno = this.turnos.find((t) => t.value === turnoSeleccionado);
    if (!turno) {
      return this.todasLasHoras;
    }

    const horasFiltradas: string[] = [];
    this.todasLasHoras.forEach((hora) => {
      const [h] = hora.split(':').map(Number);
      if (h >= turno.inicio && h < turno.fin) {
        horasFiltradas.push(hora);
      }
    });
    return horasFiltradas;
  }

  toggleTurno(turnoValue: string, checked: boolean) {
    if (checked) {
      this.turnoSeleccionado.set(turnoValue);
      this.step2Form.get('horapartida')?.enable();
    } else {
      if (this.turnoSeleccionado() === turnoValue) {
        this.turnoSeleccionado.set(null);
        this.step2Form.get('horapartida')?.setValue('');
        this.step2Form.get('horapartida')?.disable();
      }
    }

    const horaPartida = this.step2Form.get('horapartida')?.value;
    if (horaPartida && !this.horasFiltradas().includes(horaPartida)) {
      this.step2Form.get('horapartida')?.setValue('');
    }
  }

  isTurnoSeleccionado(turnoValue: string): boolean {
    return this.turnoSeleccionado() === turnoValue;
  }

  private validarFechaLlegada(control: AbstractControl): ValidationErrors | null {
    const fechaLlegada = control.value;
    const fechaPartida = control.parent?.get('fechapartida')?.value;

    if (!fechaPartida || !fechaLlegada) {
      return null;
    }

    const datePartida = new Date(fechaPartida);
    const dateLlegada = new Date(fechaLlegada);

    datePartida.setHours(0, 0, 0, 0);
    dateLlegada.setHours(0, 0, 0, 0);

    if (dateLlegada < datePartida) {
      return { fechaLlegadaMenor: true };
    }

    return null;
  }
}
