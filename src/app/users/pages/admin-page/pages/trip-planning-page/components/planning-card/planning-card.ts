import { Component, EventEmitter, Input, Output, input, computed } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';
import { WatchMoreDialog } from '../watch-more-dialog/watch-more-dialog';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { SeatsDialog } from '../seats-dialog/seats-dialog';

@Component({
  selector: 'app-planning-card',
  standalone: true,
  imports: [
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    CommonModule,
    MatDialogModule,
  ],
  templateUrl: './planning-card.html',
  styleUrl: './planning-card.scss',
})
export class PlanningCardComponent {
  @Input() fechaViaje = '';
  @Input() destino = '';
  @Input() idviaje!: string;
  @Input() horaPartida = '';
  @Input() horaLlegada = '';

  cantdisponibleasientos = input<number | undefined>(undefined);
  
  @Output() verMas = new EventEmitter<string>();
  @Output() editar = new EventEmitter<string>();
  @Output() eliminar = new EventEmitter<string>();

  cardColor = '#607d8b';
  constructor(private dialog: MatDialog) {}
  
  private destinoColors: Record<string, string> = {
    'La Paz': '#3f51b5',
    Cochabamba: '#009688',
    Oruro: '#ff5722',
    Potosí: '#9c27b0',
  };

  ngOnInit() {
    const normalized = this.destino.trim().toLowerCase();
    const match = Object.keys(this.destinoColors).find(
      (d) => d.toLowerCase() === normalized
    );
    this.cardColor = match ? this.destinoColors[match] : '#607d8b';
  }

  lightenColor(color: string, percent: number): string {
    const num = parseInt(color.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) + amt;
    const G = ((num >> 8) & 0x00ff) + amt;
    const B = (num & 0x0000ff) + amt;

    return (
      '#' +
      (
        0x1000000 +
        (R < 255 ? (R < 1 ? 0 : R) : 255) * 0x10000 +
        (G < 255 ? (G < 1 ? 0 : G) : 255) * 0x100 +
        (B < 255 ? (B < 1 ? 0 : B) : 255)
      )
        .toString(16)
        .slice(1)
    );
  }

  onVerMas(idviaje: string) {
    this.dialog.open(WatchMoreDialog, {
      width: '900px',
      data: { idplanificacion: idviaje },
    });
  }

  onEditar() {
    this.editar.emit(this.idviaje);
  }
  
  onSeatDialog(idviaje: string) {
    const dialogRef = this.dialog.open(SeatsDialog, {
      width: '700px',
      data: { idplanificacion: idviaje },
    });
  
    dialogRef.afterClosed().subscribe(() => {
      this.verMas.emit(idviaje);
    });
  }
  
  onEliminar() {
    this.eliminar.emit(this.idviaje);
  }
}