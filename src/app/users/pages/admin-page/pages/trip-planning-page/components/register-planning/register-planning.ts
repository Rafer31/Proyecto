import { Component, inject, signal, computed } from '@angular/core';
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
    MatCheckboxModule,
  ],
  templateUrl: './register-planning.html',
  styleUrl: './register-planning.scss'
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

  // Turnos y horas
  turnos = [
    { value: 'manana', label: 'Mañana', inicio: 6, fin: 12 },
    { value: 'tarde', label: 'Tarde', inicio: 12, fin: 18 },
    { value: 'noche', label: 'Noche', inicio: 18, fin: 24 },
    { value: 'madrugada', label: 'Madrugada', inicio: 0, fin: 6 }
  ];

  turnoSeleccionado = signal<string | null>(null);

  // Generar todas las horas disponibles (intervalos de 15 minutos)
  todasLasHoras = this.generarHoras();

  // Horas filtradas según turno seleccionado (compartido para ambas)
  horasFiltradas = computed(() => {
    return this.filtrarHorasPorTurno(this.turnoSeleccionado());
  });

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
        fechallegada: ['', [Validators.required, this.validarFechaLlegada.bind(this)]],
        horapartida: [{ value: '', disabled: true }, Validators.required],
        horallegada: [{ value: '', disabled: true }, [Validators.required, this.validarHoraLlegada.bind(this)]],
        iddestino: ['', Validators.required],
      }),
    });

    // Revalidar cuando cambien las fechas u horas
    this.step2Form.get('fechapartida')?.valueChanges.subscribe(() => {
      this.step2Form.get('fechallegada')?.updateValueAndValidity({ emitEvent: false });
      const horallegadaControl = this.step2Form.get('horallegada');
      if (horallegadaControl?.enabled) {
        horallegadaControl.updateValueAndValidity({ emitEvent: false });
      }
    });

    this.step2Form.get('fechallegada')?.valueChanges.subscribe(() => {
      const horallegadaControl = this.step2Form.get('horallegada');
      if (horallegadaControl?.enabled) {
        horallegadaControl.updateValueAndValidity({ emitEvent: false });
      }
    });

    this.step2Form.get('horapartida')?.valueChanges.subscribe(() => {
      const horallegadaControl = this.step2Form.get('horallegada');
      if (horallegadaControl?.enabled) {
        horallegadaControl.updateValueAndValidity({ emitEvent: false });
      }
    });
  }

  private async loadData() {
    this.destinos.set(await this.tripService.getDestinos());
    this.conductores.set(await this.userService.getConductores());
    this.vehiculos.set(await this.tripService.getVehiculos());
    this.empresas.set(await this.tripService.getEmpresas());
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
    // Marcar todos los campos como tocados para mostrar errores
    this.formTrip.markAllAsTouched();
    
    // Validar manualmente los campos deshabilitados
    const horaPartida = this.step2Form.get('horapartida');
    const horaLlegada = this.step2Form.get('horallegada');
    
    if (horaPartida?.disabled) {
      alert('Debe seleccionar un turno para las horas');
      return;
    }
    
    if (this.formTrip.invalid) {
      return;
    }
    
    // Obtener valores incluyendo campos deshabilitados
    const step1 = this.formTrip.get('step1')?.value;
    const step2 = {
      ...this.step2Form.value,
      horapartida: this.step2Form.get('horapartida')?.value,
      horallegada: this.step2Form.get('horallegada')?.value
    };

    try {
      const viaje = await this.tripService.registrarViaje(
        step1,
        step2,
        this.selectedVehiculo
      );
      this.dialogRef.close(viaje);
    } catch (err) {
      console.error('Error al registrar viaje', err);
    }
  }

  onCancel() {
    this.dialogRef.close();
  }

  // Generar horas en intervalos de 15 minutos
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

  // Filtrar horas según el turno seleccionado
  private filtrarHorasPorTurno(turnoSeleccionado: string | null): string[] {
    if (!turnoSeleccionado) {
      return this.todasLasHoras;
    }

    const turno = this.turnos.find(t => t.value === turnoSeleccionado);
    if (!turno) {
      return this.todasLasHoras;
    }

    const horasFiltradas: string[] = [];
    this.todasLasHoras.forEach(hora => {
      const [h] = hora.split(':').map(Number);
      if (h >= turno.inicio && h < turno.fin) {
        horasFiltradas.push(hora);
      }
    });
    return horasFiltradas;
  }

  // Seleccionar turno (compartido para ambas horas)
  toggleTurno(turnoValue: string, checked: boolean) {
    if (checked) {
      // Si se selecciona, reemplaza el turno actual
      this.turnoSeleccionado.set(turnoValue);
      // Habilitar los inputs de hora
      this.step2Form.get('horapartida')?.enable();
      this.step2Form.get('horallegada')?.enable();
    } else {
      // Si se deselecciona el mismo turno, lo limpia
      if (this.turnoSeleccionado() === turnoValue) {
        this.turnoSeleccionado.set(null);
        // Deshabilitar los inputs de hora y limpiar valores
        this.step2Form.get('horapartida')?.setValue('');
        this.step2Form.get('horallegada')?.setValue('');
        this.step2Form.get('horapartida')?.disable();
        this.step2Form.get('horallegada')?.disable();
      }
    }

    // Limpiar horas si ya no están en las opciones disponibles
    const horaPartida = this.step2Form.get('horapartida')?.value;
    const horaLlegada = this.step2Form.get('horallegada')?.value;
    
    if (horaPartida && !this.horasFiltradas().includes(horaPartida)) {
      this.step2Form.get('horapartida')?.setValue('');
    }
    
    if (horaLlegada && !this.horasFiltradas().includes(horaLlegada)) {
      this.step2Form.get('horallegada')?.setValue('');
    }
  }

  // Verificar si un turno está seleccionado
  isTurnoSeleccionado(turnoValue: string): boolean {
    return this.turnoSeleccionado() === turnoValue;
  }

  // Validador para fecha de llegada
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

  // Validador para hora de llegada
  private validarHoraLlegada(control: AbstractControl): ValidationErrors | null {
    const horaLlegada = control.value;
    const horaPartida = control.parent?.get('horapartida')?.value;
    const fechaPartida = control.parent?.get('fechapartida')?.value;
    const fechaLlegada = control.parent?.get('fechallegada')?.value;

    if (!horaPartida || !horaLlegada || !fechaPartida || !fechaLlegada) {
      return null;
    }

    const datePartida = new Date(fechaPartida);
    const dateLlegada = new Date(fechaLlegada);

    datePartida.setHours(0, 0, 0, 0);
    dateLlegada.setHours(0, 0, 0, 0);

    // Solo validar horas si es el mismo día
    if (dateLlegada.getTime() === datePartida.getTime()) {
      const [hPartida, mPartida] = horaPartida.split(':').map(Number);
      const [hLlegada, mLlegada] = horaLlegada.split(':').map(Number);

      const minutosPartida = hPartida * 60 + mPartida;
      const minutosLlegada = hLlegada * 60 + mLlegada;

      if (minutosLlegada <= minutosPartida) {
        return { horaLlegadaMenor: true };
      }
    }

    return null;
  }
}
