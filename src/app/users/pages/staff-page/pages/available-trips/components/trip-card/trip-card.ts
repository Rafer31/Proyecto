import { Component, Input, Output, EventEmitter } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-trip-card',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
  ],
  templateUrl: './trip-card.html',
  styleUrl: './trip-card.scss',
})
export class TripCardComponent {
  @Input() idviaje!: string;
  @Input() fechaPartida = '';
  @Input() fechaLlegada = '';
  @Input() horaPartida = '';
  @Input() horaLlegada = '';
  @Input() destino = '';
  @Input() asientosDisponibles = 0;
  
  @Output() reservar = new EventEmitter<string>();

  cardColor = '#607d8b';

  private destinoColors: Record<string, string> = {
    'La Paz': '#3f51b5',
    'Cochabamba': '#009688',
    'Oruro': '#ff5722',
    'Potosí': '#9c27b0',
  };

  ngOnInit() {
    const normalized = this.destino.trim().toLowerCase();
    const match = Object.keys(this.destinoColors).find(
      (d) => d.toLowerCase() === normalized
    );
    this.cardColor = match ? this.destinoColors[match] : '#607d8b';
  }

  onReservar() {
    this.reservar.emit(this.idviaje);
  }

  formatFecha(fecha: string): string {
    const date = new Date(fecha);
    return date.toLocaleDateString('es-BO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  }

  formatHora(hora: string): string {
    if (!hora) return '';
    // Remover segundos si existen (formato HH:MM:SS -> HH:MM)
    return hora.slice(0, 5);
  }
}
