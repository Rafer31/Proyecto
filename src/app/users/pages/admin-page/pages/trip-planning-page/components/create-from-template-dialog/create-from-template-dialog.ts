import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
  AbstractControl,
  ValidationErrors,
  FormsModule,
} from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { provideNativeDateAdapter } from '@angular/material/core';
import {
  TripTemplateService,
  TripTemplate,
} from '../../../../../../../shared/services/trip-template.service';
import { TripPlanningService } from '../../../../services/trip-planning.service';
import { UserStateService } from '../../../../../../../shared/services/user-state.service';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog } from '@angular/material/dialog';
import { ConfirmDialog } from '../../../../../../components/confirm-dialog/confirm-dialog';

@Component({
  selector: 'app-create-from-template-dialog',
  standalone: true,
  providers: [provideNativeDateAdapter()],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatCheckboxModule,
    MatProgressSpinnerModule,
    MatIconModule,
    MatTooltipModule,
  ],
  templateUrl: './create-from-template-dialog.html',
  styleUrl: './create-from-template-dialog.scss',
})
export class CreateFromTemplateDialog implements OnInit {
  private dialogRef = inject(MatDialogRef<CreateFromTemplateDialog>);
  private fb = inject(FormBuilder);
  private templateService = inject(TripTemplateService);
  private tripService = inject(TripPlanningService);
  private userState = inject(UserStateService);
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);
  templates = signal<TripTemplate[]>([]);
  selectedTemplate = signal<TripTemplate | null>(null);
  loading = signal(true);
  creating = signal(false);
  deleting = signal<string | null>(null);
  destinos = signal<any[]>([]);

  searchTerm = '';
  tripForm!: FormGroup;
  retornoForm!: FormGroup;
  crearRetorno = signal(false);

  turnos = [
    { value: 'manana', label: 'Mañana', inicio: 6, fin: 12 },
    { value: 'tarde', label: 'Tarde', inicio: 12, fin: 18 },
    { value: 'noche', label: 'Noche', inicio: 18, fin: 24 },
    { value: 'madrugada', label: 'Madrugada', inicio: 0, fin: 6 },
  ];

  turnoSeleccionado = signal<string | null>(null);
  turnoSeleccionadoRetorno = signal<string | null>(null);
  todasLasHoras = this.generarHoras();
  horasFiltradas = signal<string[]>([]);
  horasFiltradasRetorno = signal<string[]>([]);

  async ngOnInit() {
    await Promise.all([this.loadTemplates(), this.loadDestinos()]);
    this.initializeForm();
  }

  private async loadDestinos() {
    try {
      const destinos = await this.tripService.getDestinos();
      this.destinos.set(destinos);
    } catch (error) {
      console.error('Error cargando destinos:', error);
      this.snackBar.open('Error al cargar destinos', 'Cerrar', {
        duration: 3000,
      });
    }
  }

  private initializeForm() {
    this.tripForm = this.fb.group({
      fechapartida: ['', Validators.required],
      fechallegada: [
        '',
        [Validators.required, this.validarFechaLlegada.bind(this)],
      ],
      horapartida: [{ value: '', disabled: true }, Validators.required],
    });

    this.retornoForm = this.fb.group({
      fechapartida: ['', Validators.required],
      fechallegada: [
        '',
        [Validators.required, this.validarFechaLlegadaRetorno.bind(this)],
      ],
      horapartida: [{ value: '', disabled: true }, Validators.required],
      iddestino: ['', Validators.required],
    });

    this.tripForm.get('fechapartida')?.valueChanges.subscribe(() => {
      this.tripForm
        .get('fechallegada')
        ?.updateValueAndValidity({ emitEvent: false });
    });

    this.retornoForm.get('fechapartida')?.valueChanges.subscribe(() => {
      this.retornoForm
        .get('fechallegada')
        ?.updateValueAndValidity({ emitEvent: false });
    });
  }

  private async loadTemplates() {
    try {
      this.loading.set(true);
      const currentUser = this.userState.currentUser();
      if (currentUser) {
        const templates = await this.templateService.getMyTemplates(
          currentUser.idusuario
        );
        this.templates.set(templates);
      }
    } catch (error) {
      console.error('Error cargando plantillas:', error);
      this.snackBar.open('Error al cargar plantillas', 'Cerrar', {
        duration: 3000,
      });
    } finally {
      this.loading.set(false);
    }
  }

  filteredTemplates() {
    const term = this.searchTerm.toLowerCase().trim();
    if (!term) return this.templates();

    return this.templates().filter((t) =>
      t.nombreplantilla.toLowerCase().includes(term)
    );
  }

  selectTemplate(template: TripTemplate) {
    this.selectedTemplate.set(template);

    if (template.horapartida_default) {
      const hora = template.horapartida_default.substring(0, 5);
      const [h] = hora.split(':').map(Number);
      const turno = this.turnos.find((t) => h >= t.inicio && h < t.fin);

      if (turno) {
        this.turnoSeleccionado.set(turno.value);
        this.filtrarHorasPorTurno(turno.value);
        this.tripForm.get('horapartida')?.enable();
        this.tripForm.patchValue({ horapartida: hora });
      }
    }
  }

  async deleteTemplate(event: Event, template: TripTemplate) {
    event.stopPropagation();

    const dialogRef = this.dialog.open(ConfirmDialog, {
      data: {
        title: 'Eliminar plantilla',
        message: `¿Estás seguro de eliminar la plantilla "${template.nombreplantilla}"? Esta acción no se puede deshacer.`,
        confirmText: 'Eliminar',
        cancelText: 'Cancelar',
        color: 'warn',
      },
      width: '400px',
    });

    const confirmed = await dialogRef.afterClosed().toPromise();

    if (!confirmed) return;

    this.deleting.set(template.idplantilla);

    try {
      await this.templateService.deleteTemplate(template.idplantilla);

      const currentTemplates = this.templates();
      this.templates.set(
        currentTemplates.filter((t) => t.idplantilla !== template.idplantilla)
      );

      this.snackBar.open('Plantilla eliminada exitosamente', 'Cerrar', {
        duration: 3000,
      });
    } catch (error: any) {
      console.error('Error eliminando plantilla:', error);
      this.snackBar.open(
        error.message || 'Error al eliminar la plantilla',
        'Cerrar',
        { duration: 4000 }
      );
    } finally {
      this.deleting.set(null);
    }
  }

  toggleTurno(turnoValue: string, checked: boolean) {
    const horaPartidaControl = this.tripForm.get('horapartida');

    if (checked) {
      this.turnoSeleccionado.set(turnoValue);
      this.filtrarHorasPorTurno(turnoValue);
      horaPartidaControl?.enable();
    } else {
      if (this.turnoSeleccionado() === turnoValue) {
        this.turnoSeleccionado.set(null);
        this.horasFiltradas.set([]);
        horaPartidaControl?.setValue('');
        horaPartidaControl?.disable();
      }
    }

    const horaActual = horaPartidaControl?.value;
    if (horaActual && !this.horasFiltradas().includes(horaActual)) {
      horaPartidaControl?.setValue('');
    }
  }

  toggleTurnoRetorno(turnoValue: string, checked: boolean) {
    const horaPartidaControl = this.retornoForm.get('horapartida');

    if (checked) {
      this.turnoSeleccionadoRetorno.set(turnoValue);
      this.filtrarHorasPorTurnoRetorno(turnoValue);
      horaPartidaControl?.enable();
    } else {
      if (this.turnoSeleccionadoRetorno() === turnoValue) {
        this.turnoSeleccionadoRetorno.set(null);
        this.horasFiltradasRetorno.set([]);
        horaPartidaControl?.setValue('');
        horaPartidaControl?.disable();
      }
    }

    const horaActual = horaPartidaControl?.value;
    if (horaActual && !this.horasFiltradasRetorno().includes(horaActual)) {
      horaPartidaControl?.setValue('');
    }
  }

  isTurnoSeleccionado(turnoValue: string): boolean {
    return this.turnoSeleccionado() === turnoValue;
  }

  isTurnoSeleccionadoRetorno(turnoValue: string): boolean {
    return this.turnoSeleccionadoRetorno() === turnoValue;
  }

  private filtrarHorasPorTurno(turnoValue: string) {
    const turno = this.turnos.find((t) => t.value === turnoValue);
    if (!turno) {
      this.horasFiltradas.set(this.todasLasHoras);
      return;
    }

    const horas = this.todasLasHoras.filter((hora) => {
      const [h] = hora.split(':').map(Number);
      return h >= turno.inicio && h < turno.fin;
    });

    this.horasFiltradas.set(horas);
  }

  private filtrarHorasPorTurnoRetorno(turnoValue: string) {
    const turno = this.turnos.find((t) => t.value === turnoValue);
    if (!turno) {
      this.horasFiltradasRetorno.set(this.todasLasHoras);
      return;
    }

    const horas = this.todasLasHoras.filter((hora) => {
      const [h] = hora.split(':').map(Number);
      return h >= turno.inicio && h < turno.fin;
    });

    this.horasFiltradasRetorno.set(horas);
  }

  async onConfirm() {
    const template = this.selectedTemplate();
    if (!template || this.tripForm.invalid) {
      this.tripForm.markAllAsTouched();
      this.snackBar.open(
        'Complete todos los campos requeridos del viaje de ida',
        'Cerrar',
        {
          duration: 3000,
        }
      );
      return;
    }

    if (this.crearRetorno() && this.retornoForm.invalid) {
      this.retornoForm.markAllAsTouched();
      this.snackBar.open(
        'Complete todos los campos requeridos del retorno',
        'Cerrar',
        {
          duration: 3000,
        }
      );
      return;
    }

    const horaPartida = this.tripForm.get('horapartida');
    if (horaPartida?.disabled) {
      this.snackBar.open(
        'Debe seleccionar un turno para las horas de ida',
        'Cerrar',
        {
          duration: 3000,
        }
      );
      return;
    }

    if (this.crearRetorno()) {
      const horaPartidaRetorno = this.retornoForm.get('horapartida');
      if (horaPartidaRetorno?.disabled) {
        this.snackBar.open(
          'Debe seleccionar un turno para las horas de retorno',
          'Cerrar',
          {
            duration: 3000,
          }
        );
        return;
      }
    }

    this.creating.set(true);

    try {
      const formData = this.tripForm.value;

      const vehiculos = await this.tripService.getVehiculosDisponibles();
      const vehiculo = vehiculos.find(
        (v: any) => v.nroplaca === template.nroplaca
      );

      if (!vehiculo) {
        throw new Error('Vehículo no disponible');
      }

      const step1 = {
        idconductor: template.idconductor,
        nroplaca: template.nroplaca,
        idempresa: template.idempresa,
      };

      const step2 = {
        fechapartida: formData.fechapartida,
        fechallegada: formData.fechallegada,
        horapartida: formData.horapartida,
        iddestino: template.iddestino,
      };

      let viaje;
      let viajeRetorno;

      if (this.crearRetorno()) {
        const formDataRetorno = this.retornoForm.value;

        const step2Retorno = {
          fechapartida: formDataRetorno.fechapartida,
          fechallegada: formDataRetorno.fechallegada,
          horapartida: formDataRetorno.horapartida,
          iddestino: formDataRetorno.iddestino,
        };

        const resultado = await this.tripService.registrarViajeConRetorno(
          step1,
          step2,
          vehiculo,
          step1,
          step2Retorno,
          vehiculo
        );

        viaje = resultado.viajeIda;
        viajeRetorno = resultado.viajeRetorno;

        this.snackBar.open('Viaje con retorno creado exitosamente', 'Cerrar', {
          duration: 3000,
        });
      } else {
        viaje = await this.tripService.registrarViaje(step1, step2, vehiculo);

        this.snackBar.open('Viaje creado exitosamente', 'Cerrar', {
          duration: 3000,
        });
      }

      await this.templateService.incrementUsage(template.idplantilla);

      this.dialogRef.close({ viaje, viajeRetorno });
    } catch (error: any) {
      console.error('Error creando viaje:', error);
      this.snackBar.open(error.message || 'Error al crear el viaje', 'Cerrar', {
        duration: 4000,
      });
    } finally {
      this.creating.set(false);
    }
  }

  onCancel() {
    this.dialogRef.close();
  }

  goBack() {
    this.selectedTemplate.set(null);
    this.tripForm.reset();
    this.retornoForm.reset();
    this.turnoSeleccionado.set(null);
    this.turnoSeleccionadoRetorno.set(null);
    this.crearRetorno.set(false);
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

  private validarFechaLlegadaRetorno(
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

  trackByTemplate = (_: number, template: TripTemplate) => template.idplantilla;
  trackByHora = (_: number, hora: string) => hora;
  trackByTurno = (_: number, turno: any) => turno.value;
  trackByDestino = (_: number, destino: any) => destino.iddestino;
}
