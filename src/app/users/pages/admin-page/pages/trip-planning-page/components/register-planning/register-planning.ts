import { Component, inject, signal, computed, effect } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
  AbstractControl,
  ValidationErrors,
} from '@angular/forms';
import { MatDialogRef, MatDialog } from '@angular/material/dialog';
import { MatStepperModule } from '@angular/material/stepper';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { provideNativeDateAdapter } from '@angular/material/core';
import { TripPlanningService } from '../../../../services/trip-planning.service';
import { UserService } from '../../../../../../services/user.service';
import { DestinyService } from '../../../../../../../shared/services/destiny.service';
import { TripTemplateService } from '../../../../../../../shared/services/trip-template.service';
import { SelectTemplateDialog } from '../select-template-dialog/select-template-dialog';
import { CommonModule } from '@angular/common';

type EtapaViaje = 'salida' | 'pregunta-retorno' | 'retorno';

interface DatosViaje {
  viaje: any;
  step1: any;
  vehiculo: any;
}

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
  private dialog = inject(MatDialog);
  private destinyService = inject(DestinyService);
  private tripService = inject(TripPlanningService);
  private userService = inject(UserService);
  private templateService = inject(TripTemplateService);
  private snackBar = inject(MatSnackBar);

  destinos = signal<any[]>([]);
  destinoBolivar = signal<any | null>(null);
  conductores = signal<any[]>([]);
  vehiculos = signal<any[]>([]);
  empresas = signal<any[]>([]);

  loading = signal<boolean>(true);

  etapaActual = signal<EtapaViaje>('salida');
  datosViajeSalida = signal<DatosViaje | null>(null);

  selectedVehiculo = signal<any>(null);

  turnos = [
    { value: 'manana', label: 'Mañana', inicio: 6, fin: 12 },
    { value: 'tarde', label: 'Tarde', inicio: 12, fin: 18 },
    { value: 'noche', label: 'Noche', inicio: 18, fin: 24 },
    { value: 'madrugada', label: 'Madrugada', inicio: 0, fin: 6 },
  ];

  turnoSeleccionado = signal<string | null>(null);
  todasLasHoras = this.generarHoras();
  horasFiltradas = computed(() =>
    this.filtrarHorasPorTurno(this.turnoSeleccionado())
  );

  formTrip!: FormGroup;

  constructor() {
    effect(() => {
      if (!this.formTrip) return;

      const hayDatos =
        this.conductores().length > 0 &&
        this.vehiculos().length > 0 &&
        !this.loading();

      const nroplacaControl = this.step1Form.get('nroplaca');
      const idempresaControl = this.step1Form.get('idempresa');

      if (hayDatos) {
        nroplacaControl?.enable({ emitEvent: false });
        idempresaControl?.enable({ emitEvent: false });
      } else {
        nroplacaControl?.disable({ emitEvent: false });
        idempresaControl?.disable({ emitEvent: false });
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
        fechallegada: [
          '',
          [Validators.required, this.validarFechaLlegada.bind(this)],
        ],
        horapartida: [{ value: '', disabled: true }, Validators.required],
        iddestino: ['', Validators.required],
      }),
    });

    this.step2Form.get('fechapartida')?.valueChanges.subscribe(() => {
      this.step2Form
        .get('fechallegada')
        ?.updateValueAndValidity({ emitEvent: false });
    });
  }

  private async loadData() {
    try {
      this.loading.set(true);

      const [destinos, destinoBolivar, conductores, vehiculos, empresas] =
        await Promise.all([
          this.destinyService.getDestinosParaViajes(),
          this.destinyService.getDestinoBolivar(),
          this.userService.getConductoresDisponibles(),
          this.tripService.getVehiculosDisponibles(),
          this.tripService.getEmpresas(),
        ]);

      this.destinos.set(destinos);
      this.destinoBolivar.set(destinoBolivar);
      this.conductores.set(conductores);
      this.vehiculos.set(vehiculos);
      this.empresas.set(empresas);
    } catch (error) {
      console.error('Error cargando datos:', error);
      alert('Error al cargar datos. Por favor, intente nuevamente.');
    } finally {
      this.loading.set(false);
    }
  }

  get step1Form(): FormGroup {
    return this.formTrip.get('step1') as FormGroup;
  }

  get step2Form(): FormGroup {
    return this.formTrip.get('step2') as FormGroup;
  }

  onVehiculoSelected(nroplaca: string) {
    const vehiculo = this.vehiculos().find((v) => v.nroplaca === nroplaca);
    this.selectedVehiculo.set(vehiculo);
  }

  toggleTurno(turnoValue: string, checked: boolean) {
    const horaPartidaControl = this.step2Form.get('horapartida');

    if (checked) {
      this.turnoSeleccionado.set(turnoValue);
      horaPartidaControl?.enable();
    } else {
      if (this.turnoSeleccionado() === turnoValue) {
        this.turnoSeleccionado.set(null);
        horaPartidaControl?.setValue('');
        horaPartidaControl?.disable();
      }
    }

    const horaActual = horaPartidaControl?.value;
    if (horaActual && !this.horasFiltradas().includes(horaActual)) {
      horaPartidaControl?.setValue('');
    }
  }

  isTurnoSeleccionado(turnoValue: string): boolean {
    return this.turnoSeleccionado() === turnoValue;
  }

  async onSubmitSalida() {
    if (!this.validarFormulario()) return;

    const step1 = this.step1Form.value;
    const step2 = this.step2Form.value;

    try {
      const viaje = await this.tripService.registrarViaje(
        step1,
        step2,
        this.selectedVehiculo()
      );

      this.datosViajeSalida.set({
        viaje,
        step1,
        vehiculo: this.selectedVehiculo(),
      });

      this.etapaActual.set('pregunta-retorno');
    } catch (err) {
      console.error('Error al registrar viaje:', err);
      alert('Error al registrar el viaje. Por favor, intente nuevamente.');
    }
  }

  onDecidirRetorno(crearRetorno: boolean) {
    if (crearRetorno) {
      this.prepararFormularioRetorno();
      this.etapaActual.set('retorno');
    } else {
      this.cerrarDialogoConResultado(false);
    }
  }

  private prepararFormularioRetorno() {
    setTimeout(() => {
      this.step2Form.reset();
      this.turnoSeleccionado.set(null);

      const horaPartidaControl = this.step2Form.get('horapartida');
      horaPartidaControl?.disable({ emitEvent: false });
      horaPartidaControl?.setValue('', { emitEvent: false });

      const destinoControl = this.step2Form.get('iddestino');
      const destino = this.destinoBolivar();

      if (destinoControl && destino) {
        destinoControl.setValue(destino.iddestino);
        destinoControl.markAsTouched();
      }
    }, 0);
  }

  async onSubmitRetorno() {
    if (!this.validarFormulario('retorno')) return;

    const datosIda = this.datosViajeSalida();
    if (!datosIda) return;

    const step2Retorno = this.step2Form.value;

    try {
      const viajeRetorno = await this.tripService.registrarViaje(
        datosIda.step1,
        step2Retorno,
        this.selectedVehiculo()
      );

      await this.tripService.crearRelacionRetorno(
        datosIda.viaje.idplanificacion,
        viajeRetorno.idplanificacion
      );

      this.cerrarDialogoConResultado(true, viajeRetorno);
    } catch (err) {
      console.error('Error al registrar retorno:', err);
      alert('Error al registrar el retorno. Por favor, intente nuevamente.');
    }
  }

  async volverASalida() {
    const datosIda = this.datosViajeSalida();
    if (datosIda?.viaje) {
      try {
        await this.tripService.eliminarViaje(datosIda.viaje.idplanificacion);
      } catch (err) {
        console.error('Error eliminando viaje:', err);
      }
    }

    this.datosViajeSalida.set(null);
    this.etapaActual.set('salida');
  }

  volverAPregunta() {
    this.etapaActual.set('pregunta-retorno');
  }

  onCancel() {
    this.dialogRef.close();
  }

  private validarFormulario(tipo: 'salida' | 'retorno' = 'salida'): boolean {
    const esRetorno = tipo === 'retorno';
    const form = esRetorno ? this.step2Form : this.formTrip;

    form.markAllAsTouched();

    const horaPartida = this.step2Form.get('horapartida');
    if (horaPartida?.disabled) {
      alert(
        `Debe seleccionar un turno para las horas${
          esRetorno ? ' del retorno' : ''
        }`
      );
      return false;
    }

    if (form.invalid) {
      alert('Por favor complete todos los campos requeridos');
      return false;
    }

    return true;
  }

  private obtenerDatosViajeOriginal(viaje: any) {
    return {
      fechapartida: viaje.fechapartida,
      fechallegada: viaje.fechallegada,
      horapartida: viaje.horapartida,
      iddestino: viaje.destino.iddestino,
    };
  }

  private cerrarDialogoConResultado(conRetorno: boolean, viajeRetorno?: any) {
    const datosIda = this.datosViajeSalida();

    this.dialogRef.close({
      viaje: datosIda?.viaje,
      retorno: conRetorno ? viajeRetorno : null,
    });
  }

  private validarFechaLlegada(
    control: AbstractControl
  ): ValidationErrors | null {
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

  private filtrarHorasPorTurno(turnoSeleccionado: string | null): string[] {
    if (!turnoSeleccionado) return this.todasLasHoras;

    const turno = this.turnos.find((t) => t.value === turnoSeleccionado);
    if (!turno) return this.todasLasHoras;

    return this.todasLasHoras.filter((hora) => {
      const [h] = hora.split(':').map(Number);
      return h >= turno.inicio && h < turno.fin;
    });
  }

  async usarPlantilla() {
    const dialogRef = this.dialog.open(SelectTemplateDialog, {
      width: '700px',
      maxHeight: '80vh',
    });

    const template = await dialogRef.afterClosed().toPromise();

    if (template) {
      this.aplicarPlantilla(template);

      try {
        await this.templateService.incrementUsage(template.idplantilla);
      } catch (error) {
        console.error('Error incrementando uso de plantilla:', error);
      }
    }
  }

  private aplicarPlantilla(template: any) {
    const conductor = Array.isArray(template.conductor)
      ? template.conductor[0]
      : template.conductor;

    const vehiculo = Array.isArray(template.vehiculo)
      ? template.vehiculo[0]
      : template.vehiculo;

    const empresa = Array.isArray(template.empresa)
      ? template.empresa[0]
      : template.empresa;

    const destino = Array.isArray(template.destino)
      ? template.destino[0]
      : template.destino;

    this.step1Form.patchValue({
      idconductor: conductor?.idconductor || template.idconductor,
      nroplaca: vehiculo?.nroplaca || template.nroplaca,
      idempresa: empresa?.idempresa || template.idempresa,
    });

    if (vehiculo || template.nroplaca) {
      const vehiculoCompleto = this.vehiculos().find(
        (v) => v.nroplaca === (vehiculo?.nroplaca || template.nroplaca)
      );
      if (vehiculoCompleto) {
        this.selectedVehiculo.set(vehiculoCompleto);
      }
    }

    const step2Updates: any = {};

    if (destino || template.iddestino) {
      step2Updates.iddestino = destino?.iddestino || template.iddestino;
    }

    if (template.horapartida_default) {
      const [hora] = template.horapartida_default.split(':').map(Number);
      const turno = this.turnos.find((t) => hora >= t.inicio && hora < t.fin);

      if (turno) {
        this.turnoSeleccionado.set(turno.value);
        this.step2Form.get('horapartida')?.enable();
        step2Updates.horapartida = template.horapartida_default.slice(0, 5);
      }
    }

    this.step2Form.patchValue(step2Updates);

    this.snackBar.open(
      `Plantilla "${template.nombreplantilla}" aplicada`,
      'Cerrar',
      {
        duration: 3000,
      }
    );
  }

  trackByHora = (_: number, hora: string) => hora;
  trackByTurno = (_: number, turno: any) => turno.value;
  trackByDestino = (_: number, destino: any) => destino.iddestino;
  trackByConductor = (_: number, conductor: any) => conductor.idconductor;
  trackByVehiculo = (_: number, vehiculo: any) => vehiculo.nroplaca;
  trackByEmpresa = (_: number, empresa: any) => empresa.idempresa;
}
