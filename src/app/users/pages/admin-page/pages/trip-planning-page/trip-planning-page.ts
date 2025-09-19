import { Component, signal, inject, OnInit } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { Emptystate } from '../../../../components/emptystate/emptystate';
import { TripPlanningService } from '../../services/trip-planning.service';
import { PlanningCardComponent } from './components/planning-card/planning-card';
import { RegisterTripDialog } from './components/register-planning/register-planning';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-trip-planning-page',
  imports: [Emptystate, PlanningCardComponent, MatButtonModule, MatIconModule],
  templateUrl: './trip-planning-page.html',
  styleUrl: './trip-planning-page.scss',
})
export class TripPlanningPage implements OnInit {
  trips = signal<
    {
      idviaje: string;
      fechaViaje: string;
      destino: string;
      horallegada: string;
      horapartida: string;
    }[]
  >([]);

  private dialog = inject(MatDialog);
  private tripService = inject(TripPlanningService);

  async ngOnInit() {
    try {
      const viajes = await this.tripService.getViajes();
      this.trips.set(
        viajes.map((v: any) => {
          const trip = {
            idviaje: v.idplanificacion,
            fechaViaje: v.fechapartida,
            destino: v.destino?.nomdestino ?? 'Sin destino',
            horallegada: v.horallegada,
            horapartida: v.horapartida,
          };
          return trip;
        })
      );
    } catch (err) {
      console.error('Error cargando viajes:', err);
    }
  }

  openRegisterDialog() {
    const dialogRef = this.dialog.open(RegisterTripDialog, { width: '700px' });

    dialogRef.afterClosed().subscribe((newTrip) => {
      if (newTrip) {
        this.trips.update((list) => [
          ...list,
          {
            idviaje: newTrip.idplanificacion,
            fechaViaje: newTrip.fechapartida,
            destino: newTrip.destino?.nomdestino ?? 'Sin destino',
            horapartida: newTrip.horapartida,
            horallegada: newTrip.horallegada,
          },
        ]);
      }
    });
  }

  abrirDialog(idviaje: string) {
    console.log('Ver más viaje', idviaje);
  }

  editarViaje(idviaje: string) {
    console.log('Editar viaje', idviaje);
  }

}
