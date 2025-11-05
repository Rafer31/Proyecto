import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-trip-card',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatButtonModule, MatIconModule],
  templateUrl: './trip-card.html',
  styleUrls: ['./trip-card.scss'],
})
export class TripCardComponent {
  idviaje = input<string | null>();
  fechaPartida = input<string>();
  fechaLlegada = input<string>();
  horaPartida = input<string>();

  destino = input<string>();
  asientosDisponibles = input<number>();
  esRetorno = input<boolean>(false);
  tieneReserva = input<boolean>(false);
  asientoReservado = input<number | null>(null);

  reservar = output<string>();
  verReserva = output<string>();

  cardColor = '#607d8b';

  private destinoColors: Record<string, string> = {
    'La Paz': '#3f51b5',
    Cochabamba: '#009688',
    Oruro: '#ff5722',
    Potosí: '#9c27b0',
  };

  ngOnInit() {
    const destinoValue = this.destino ? this.destino() ?? '' : '';
    const normalized = destinoValue.trim().toLowerCase();
    const match = Object.keys(this.destinoColors).find(
      (d) => d.toLowerCase() === normalized
    );
    this.cardColor = match ? this.destinoColors[match] : '#607d8b';
  }

  onReservar() {
    const id = this.idviaje();
    if (id) this.reservar.emit(id);
  }

  onVerReserva() {
    const id = this.idviaje();
    if (id) this.verReserva.emit(id);
  }

  formatHora(hora?: string): string {
    if (!hora) return '';
    return hora.slice(0, 5);
  }
}
