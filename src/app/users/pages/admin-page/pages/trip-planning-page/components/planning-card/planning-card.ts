import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-planning-card',
  standalone: true,
  imports: [MatCardModule, MatIconModule, MatButtonModule, CommonModule],
  templateUrl: './planning-card.html',
  styleUrl: './planning-card.scss'
})
export class PlanningCardComponent {
  @Input() fechaViaje = '';     // Ej: 2025-09-20
  @Input() destino = '';        // Ej: La Paz
  @Input() idviaje!: number;    // Para identificar el viaje en editar/eliminar

  @Output() verMas = new EventEmitter<number>();
  @Output() editar = new EventEmitter<number>();
  @Output() eliminar = new EventEmitter<number>();

  onVerMas() {
    this.verMas.emit(this.idviaje);
  }

  onEditar() {
    this.editar.emit(this.idviaje);
  }

  onEliminar() {
    this.eliminar.emit(this.idviaje);
  }
}
