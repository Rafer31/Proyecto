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
      asientos: {
        num: number | null;
        ocupado: boolean;
        label?: string;
        tipo?: string;
        pasajero?: Pasajero;
      }[];
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

    const pasajeros: Pasajero[] = [
      { nombre: 'Juan Pérez', ci: '1234567', telefono: '555-0101', asiento: 2 },
      {
        nombre: 'María González',
        ci: '2345678',
        telefono: '555-0102',
        asiento: 5,
      },
      {
        nombre: 'Carlos Rodríguez',
        ci: '3456789',
        telefono: '555-0103',
        asiento: 8,
      },
      {
        nombre: 'Ana Martínez',
        ci: '4567890',
        telefono: '555-0104',
        asiento: 12,
      },
    ];

    const ocupados = pasajeros.map((p) => p.asiento);
    let numero = 1;
    const filasTemp: any[] = [];

    while (numero <= totalAsientos) {
      const restantes = totalAsientos - numero + 1;
      let fila: any;
      const asientosEnFila = restantes >= 4 ? 4 : restantes;
      const leftSide = Math.ceil(asientosEnFila / 2);
      const rightSide = asientosEnFila - leftSide;

      const asientosFila: any[] = [];

      for (let i = 0; i < leftSide; i++) {
        const asientoNum = numero++;
        const pasajero = pasajeros.find((p) => p.asiento === asientoNum);
        asientosFila.push({
          num: asientoNum,
          ocupado: ocupados.includes(asientoNum),
          tipo: 'asiento',
          pasajero: pasajero,
        });
      }

      asientosFila.push({ num: null, tipo: 'pasillo' });

      for (let i = 0; i < rightSide; i++) {
        const asientoNum = numero++;
        const pasajero = pasajeros.find((p) => p.asiento === asientoNum);
        asientosFila.push({
          num: asientoNum,
          ocupado: ocupados.includes(asientoNum),
          tipo: 'asiento',
          pasajero: pasajero,
        });
      }

      fila = {
        tipo: 'normal',
        asientos: asientosFila,
      };

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
