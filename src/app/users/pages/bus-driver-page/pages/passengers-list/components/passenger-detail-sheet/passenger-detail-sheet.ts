import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatChipsModule } from '@angular/material/chips';
import { MAT_BOTTOM_SHEET_DATA, MatBottomSheetRef } from '@angular/material/bottom-sheet';
import { PasajeroViaje } from '../../../../services/driver.service';

@Component({
  selector: 'app-passenger-detail-sheet',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatDividerModule,
    MatChipsModule,
  ],
  templateUrl: './passenger-detail-sheet.html',
  styleUrl: './passenger-detail-sheet.scss',
})
export class PassengerDetailSheet {
  constructor(
    @Inject(MAT_BOTTOM_SHEET_DATA) public data: {
      pasajero: PasajeroViaje;
      onMarcarAsistencia: (asistio: boolean) => void;
    },
    private bottomSheetRef: MatBottomSheetRef<PassengerDetailSheet>
  ) {}

  cerrar() {
    this.bottomSheetRef.dismiss();
  }

  marcarAsistio() {
    this.data.onMarcarAsistencia(true);
    this.bottomSheetRef.dismiss();
  }

  marcarInasistio() {
    this.data.onMarcarAsistencia(false);
    this.bottomSheetRef.dismiss();
  }

  getColorEstado(estado: string): string {
    switch (estado) {
      case 'asistio':
        return 'primary';
      case 'inasistio':
        return 'warn';
      default:
        return 'accent';
    }
  }

  getTextoEstado(estado: string): string {
    switch (estado) {
      case 'asistio':
        return 'Asistió';
      case 'inasistio':
        return 'Inasistió';
      default:
        return 'Pendiente';
    }
  }

  getTipoBadge(tipo: string): string {
    return tipo === 'personal' ? 'Personal' : 'Visitante';
  }
}
