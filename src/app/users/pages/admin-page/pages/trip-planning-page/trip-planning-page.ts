import { Component, signal, inject, OnInit } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { Emptystate } from '../../../../components/emptystate/emptystate';
import { TripPlanningService } from '../../services/trip-planning.service';
import { PlanningCardComponent } from './components/planning-card/planning-card';
import { RegisterTripDialog } from './components/register-planning/register-planning';

@Component({
  selector: 'app-trip-planning-page',
  imports: [Emptystate, PlanningCardComponent, MatButtonModule],
  templateUrl: './trip-planning-page.html',
  styleUrl: './trip-planning-page.scss',
})
export class TripPlanningPage implements OnInit {
  trips = signal<{ idviaje: number; fechaViaje: string; destino: string }[]>(
    []
  );

  private dialog = inject(MatDialog);
  private tripService = inject(TripPlanningService);

  async ngOnInit() {
    try {
      const viajes = await this.tripService.getViajes();
      this.trips.set(
        viajes.map((v: any) => ({
          idviaje: v.idviaje,
          fechaViaje: v.fechapartida,
          destino: v.destino ?? 'Sin destino',
        }))
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
            idviaje: newTrip.idviaje,
            fechaViaje: newTrip.fechapartida,
            destino: newTrip.nomdestino,
          },
        ]);
      }
    });
  }

  abrirDialog(idviaje: number) {
    console.log('Ver más viaje', idviaje);
  }

  editarViaje(idviaje: number) {
    console.log('Editar viaje', idviaje);
  }

  eliminarViaje(idviaje: number) {
    this.trips.update((list) => list.filter((t) => t.idviaje !== idviaje));
  }
}
