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
  horaLlegada = input<string>();
  destino = input<string>();
  asientosDisponibles = input<number>();

  reservar = output<string>();

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

  formatFecha(fecha?: string): string {
    if (!fecha) return '';
    const date = new Date(fecha);
    return date.toLocaleDateString('es-BO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  formatHora(hora?: string): string {
    if (!hora) return '';
    return hora.slice(0, 5);
  }
}
