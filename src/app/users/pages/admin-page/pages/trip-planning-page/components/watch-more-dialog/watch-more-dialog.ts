import { Component, Inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { TripPlanningService } from '../../../../services/trip-planning.service';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-watch-more-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatCardModule,
    MatButtonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatIconModule
  ],
  templateUrl: './watch-more-dialog.html',
  styleUrls: ['./watch-more-dialog.scss'],
})
export class WatchMoreDialog implements OnInit {
  viaje: any = null;
  editMode = false;

  conductores: any[] = [];
  vehiculos: any[] = [];
  empresas: any[] = [];

  step1Form!: FormGroup;
  loading = false;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { idplanificacion: string },
    private tripService: TripPlanningService,
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef
  ) {}

  async ngOnInit() {
    this.initializeForm();
    await this.loadData();
  }

  private initializeForm() {
    this.step1Form = this.fb.group({
      idconductor: ['', Validators.required],
      nroplaca: ['', Validators.required],
      idempresa: ['', Validators.required],
    });
  }

  private async loadData() {
    try {
      this.loading = true;
      this.cdr.detectChanges(); // Forzar detección antes de la carga

      // Cargar todos los datos en paralelo
      const [viaje, conductores, vehiculos, empresas] = await Promise.all([
        this.tripService.getViaje(this.data.idplanificacion),
        this.tripService.getConductores(),
        this.tripService.getVehiculos(),
        this.tripService.getEmpresas()
      ]);

      // Usar setTimeout para evitar el error de ExpressionChanged
      setTimeout(() => {
        this.viaje = viaje;
        this.conductores = conductores;
        this.vehiculos = vehiculos;
        this.empresas = empresas;
        this.loading = false;
        this.cdr.detectChanges();
      });

    } catch (error) {
      console.error('Error cargando datos:', error);
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  startEdit() {
    if (!this.viaje?.vehiculo) {
      console.error('No hay datos de vehículo disponibles');
      return;
    }

    this.editMode = true;

    console.log('Datos completos del viaje:', this.viaje);
    console.log('Datos del vehículo:', this.viaje.vehiculo);

    // Establecer los valores correctos en el formulario
    const formValues = {
      idconductor: this.viaje.vehiculo.idconductor,
      nroplaca: this.viaje.vehiculo.nroplaca,
      idempresa: this.viaje.vehiculo.idempresa,
    };

    console.log('Valores a setear en el formulario:', formValues);
    console.log('Conductores disponibles:', this.conductores);
    console.log('Vehículos disponibles:', this.vehiculos);
    console.log('Empresas disponibles:', this.empresas);

    this.step1Form.patchValue(formValues);

    // Verificar que los valores se setearon correctamente
    setTimeout(() => {
      console.log('Valores actuales del formulario:', this.step1Form.value);
      console.log('Estado de validez del formulario:', this.step1Form.valid);
      console.log('Errores del formulario:', this.step1Form.errors);
    }, 100);
  }

  cancelEdit() {
    this.editMode = false;
    this.step1Form.reset();
  }

  async saveEdit() {
    if (this.step1Form.invalid) {
      console.log('Formulario inválido:', this.step1Form.errors);
      Object.keys(this.step1Form.controls).forEach(key => {
        const control = this.step1Form.get(key);
        if (control && control.invalid) {
          console.log(`Campo ${key} inválido:`, control.errors);
        }
      });
      return;
    }

    try {
      this.loading = true;
      this.cdr.detectChanges();

      const formData = this.step1Form.value;
      console.log('Datos a actualizar:', formData);
      console.log('ID Planificacion:', this.viaje?.idplanificacion);
      console.log('Tipo ID Planificacion:', typeof this.viaje?.idplanificacion);

      // Usar el ID tal como viene (string UUID), no convertir a Number
      const idPlanificacion = this.viaje?.idplanificacion || this.data.idplanificacion;

      if (!idPlanificacion) {
        throw new Error('No se encontró el ID de planificación');
      }

      await this.tripService.actualizarAsociacion(idPlanificacion, formData);

      // Recargar los datos del viaje después de la actualización
      await this.reloadViajeData();

      // Usar setTimeout para evitar el error de ExpressionChanged
      setTimeout(() => {
        this.editMode = false;
        this.loading = false;
        this.cdr.detectChanges();
      });

      console.log('Asociación actualizada exitosamente');

    } catch (error) {
      console.error('Error al actualizar asociación:', error);
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  private async reloadViajeData() {
    try {
      const updatedViaje = await this.tripService.getViaje(this.data.idplanificacion);

      // Usar setTimeout para evitar el error de ExpressionChanged
      setTimeout(() => {
        this.viaje = updatedViaje;
        this.cdr.detectChanges();
      });

    } catch (error) {
      console.error('Error recargando datos del viaje:', error);
    }
  }

  // Métodos auxiliares para obtener información mostrada
  getConductorNombre(idconductor: number): string {
    const conductor = this.conductores.find(c => c.idconductor === idconductor);
    return conductor ?
      `${conductor.usuario.nomusuario} ${conductor.usuario.patusuario} ${conductor.usuario.matusuario}` :
      'No encontrado';
  }

  getVehiculoInfo(nroplaca: string): any {
    return this.vehiculos.find(v => v.nroplaca === nroplaca);
  }

  getEmpresaNombre(idempresa: number): string {
    const empresa = this.empresas.find(e => e.idempresa === idempresa);
    return empresa ? empresa.nomempresa : 'No encontrada';
  }
}
