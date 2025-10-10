import {
  Component,
  input,
  output,
  inject,
  signal,
  computed,
} from '@angular/core';
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
  fechaViaje = input<string>('');
  destino = input<string>('');
  idviaje = input.required<string>();
  horaPartida = input<string>('');
  cantdisponibleasientos = input<number | undefined>(undefined);
  tieneRetorno = input<boolean>(false);
  esRetorno = input<boolean>(false);
  viajeIdaDestino = input<string>('');

  verMas = output<string>();
  editar = output<string>();
  eliminar = output<string>();
  actualizarAsientos = output<string>();

  private dialog = inject(MatDialog);

  cardColor = signal('#607d8b');

  private destinoColors: Record<string, string> = {
    'La Paz': '#3f51b5',
    Cochabamba: '#009688',
    Oruro: '#ff5722',
    Potosí: '#9c27b0',
  };

  cardColorComputed = computed(() => {
    const destino = this.destino();
    const normalized = destino.trim().toLowerCase();
    const match = Object.keys(this.destinoColors).find(
      (d) => d.toLowerCase() === normalized
    );
    return match ? this.destinoColors[match] : '#607d8b';
  });

  tituloCard = computed(() => {
    if (this.esRetorno()) {
      return 'Retorno programado a:';
    }
    return this.tieneRetorno()
      ? 'Viaje programado a: (con retorno)'
      : 'Viaje programado a:';
  });

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

  onVerMas() {
    this.dialog.open(WatchMoreDialog, {
      width: '900px',
      data: { idplanificacion: this.idviaje() },
    });
  }

  onEditar() {
    this.editar.emit(this.idviaje());
  }

  onSeatDialog() {
    const dialogRef = this.dialog.open(SeatsDialog, {
      width: '700px',
      data: {
        idplanificacion: this.idviaje(),
        isStaff: true,
        isAdmin: true,
      },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result?.cambiosRealizados) {
        this.actualizarAsientos.emit(this.idviaje());
      }
    });
  }

  onEliminar() {
    this.eliminar.emit(this.idviaje());
  }
}
