import { Component, Inject, signal } from '@angular/core';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { TripPlanningService } from '../../../../services/trip-planning.service';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

interface Pasajero {
  nombre: string;
  ci: string;
  telefono: string;
  asiento: number;
}

@Component({
  selector: 'app-seats-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule],
  templateUrl: './seats-dialog.html',
  styleUrls: ['./seats-dialog.scss'],
})
export class SeatsDialog {
  filas = signal<
    {
      tipo: 'conductor' | 'normal' | 'especial';
      asientos: { num: number | null; ocupado: boolean; label?: string; tipo?: string; pasajero?: Pasajero }[];
    }[]
  >([]);

  vistaActual = signal<'mapa' | 'detalle'>('mapa');
  pasajeroSeleccionado = signal<Pasajero | null>(null);

  constructor(
    private tripService: TripPlanningService,
    private dialogRef: MatDialogRef<SeatsDialog>,
    @Inject(MAT_DIALOG_DATA) public data: { idplanificacion: string }
  ) {}

  async ngOnInit() {
    const viaje: any = await this.tripService.getViaje(
      this.data.idplanificacion
    );
    const totalAsientos = viaje.vehiculo.vehiculo?.nroasientos ?? 0;
    
    // Simulación de pasajeros ocupando asientos
    const pasajeros: Pasajero[] = [
      { nombre: 'Juan Pérez', ci: '1234567', telefono: '555-0101', asiento: 2 },
      { nombre: 'María González', ci: '2345678', telefono: '555-0102', asiento: 5 },
      { nombre: 'Carlos Rodríguez', ci: '3456789', telefono: '555-0103', asiento: 8 },
      { nombre: 'Ana Martínez', ci: '4567890', telefono: '555-0104', asiento: 12 },
    ];

    const ocupados = pasajeros.map(p => p.asiento);
    let numero = 1;
    const filasTemp: any[] = [];

    while (numero <= totalAsientos) {
      const restantes = totalAsientos - numero + 1;
      let fila: any;

      if (restantes === 1) {
        // Un solo asiento sobrante - centrado
        const pasajero = pasajeros.find(p => p.asiento === numero);
        fila = {
          tipo: 'especial',
          asientos: [
            { num: null, tipo: 'vacio' },
            { num: null, tipo: 'vacio' },
            { 
              num: numero, 
              ocupado: ocupados.includes(numero), 
              tipo: 'asiento',
              pasajero: pasajero 
            },
            { num: null, tipo: 'vacio' },
            { num: null, tipo: 'vacio' },
          ],
        };
        numero++;
      } else if (restantes === 2) {
        // Dos asientos sobrantes - uno a cada lado
        const pasajero1 = pasajeros.find(p => p.asiento === numero);
        const pasajero2 = pasajeros.find(p => p.asiento === numero + 1);
        fila = {
          tipo: 'especial',
          asientos: [
            { 
              num: numero, 
              ocupado: ocupados.includes(numero), 
              tipo: 'asiento',
              pasajero: pasajero1 
            },
            { 
              num: numero + 1, 
              ocupado: ocupados.includes(numero + 1), 
              tipo: 'asiento',
              pasajero: pasajero2 
            },
            { num: null, tipo: 'pasillo' },
            { num: null, tipo: 'vacio' },
            { num: null, tipo: 'vacio' },
          ],
        };
        numero += 2;
      } else if (restantes === 3) {
        // Tres asientos sobrantes - 2 izq, 1 der
        const pasajero1 = pasajeros.find(p => p.asiento === numero);
        const pasajero2 = pasajeros.find(p => p.asiento === numero + 1);
        const pasajero3 = pasajeros.find(p => p.asiento === numero + 2);
        fila = {
          tipo: 'especial',
          asientos: [
            { 
              num: numero, 
              ocupado: ocupados.includes(numero), 
              tipo: 'asiento',
              pasajero: pasajero1 
            },
            { 
              num: numero + 1, 
              ocupado: ocupados.includes(numero + 1), 
              tipo: 'asiento',
              pasajero: pasajero2 
            },
            { num: null, tipo: 'pasillo' },
            { 
              num: numero + 2, 
              ocupado: ocupados.includes(numero + 2), 
              tipo: 'asiento',
              pasajero: pasajero3 
            },
            { num: null, tipo: 'vacio' },
          ],
        };
        numero += 3;
      } else {
        // Fila normal con 4 asientos (2-2)
        const pasajero1 = pasajeros.find(p => p.asiento === numero);
        const pasajero2 = pasajeros.find(p => p.asiento === numero + 1);
        const pasajero3 = pasajeros.find(p => p.asiento === numero + 2);
        const pasajero4 = pasajeros.find(p => p.asiento === numero + 3);
        fila = {
          tipo: 'normal',
          asientos: [
            { 
              num: numero, 
              ocupado: ocupados.includes(numero), 
              tipo: 'asiento',
              pasajero: pasajero1 
            },
            { 
              num: numero + 1, 
              ocupado: ocupados.includes(numero + 1), 
              tipo: 'asiento',
              pasajero: pasajero2 
            },
            { num: null, tipo: 'pasillo' },
            { 
              num: numero + 2, 
              ocupado: ocupados.includes(numero + 2), 
              tipo: 'asiento',
              pasajero: pasajero3 
            },
            { 
              num: numero + 3, 
              ocupado: ocupados.includes(numero + 3), 
              tipo: 'asiento',
              pasajero: pasajero4 
            },
          ],
        };
        numero += 4;
      }

      filasTemp.push(fila);
    }
    filasTemp.unshift({
      tipo: 'conductor',
      asientos: [
        { num: null, label: 'CONDUCTOR', tipo: 'conductor' },
        { num: null, tipo: 'vacio' },
      ],
    });

    this.filas.set(filasTemp);
  }

  verDetallePasajero(seat: any) {
    if (seat.tipo === 'asiento' && seat.ocupado && seat.pasajero) {
      this.pasajeroSeleccionado.set(seat.pasajero);
      this.vistaActual.set('detalle');
    }
  }

  volverAlMapa() {
    this.vistaActual.set('mapa');
    this.pasajeroSeleccionado.set(null);
  }

  cerrar() {
    this.dialogRef.close();
  }
}