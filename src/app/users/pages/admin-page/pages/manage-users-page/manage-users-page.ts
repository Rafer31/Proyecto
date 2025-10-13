import { Component, signal, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import ListUsers from '../../components/list-users/list-users';
import { ExcelReportService } from '../../../../../shared/services/excel-report.service';

@Component({
  selector: 'app-manage-users-page',
  imports: [ListUsers, MatButtonModule, MatIconModule],
  templateUrl: './manage-users-page.html',
  styleUrl: './manage-users-page.scss',
  standalone: true,
})
export class ManageUsersPage {
  userCount = signal(0);
  isDataLoaded = signal(false);

  private excelReportService = inject(ExcelReportService);
  private snackBar = inject(MatSnackBar);

  updateUserCount(count: number) {
    this.userCount.set(count);
    this.isDataLoaded.set(true);
  }

  async exportarReporteUsuarios() {
    try {
      this.snackBar.open('Generando reporte de usuarios...', 'Cerrar', {
        duration: 2000,
      });

      await this.excelReportService.generateUsersReport();

      this.snackBar.open('Reporte de usuarios generado exitosamente', 'Cerrar', {
        duration: 3000,
      });
    } catch (error) {
      console.error('Error al generar reporte de usuarios:', error);
      this.snackBar.open('Error al generar el reporte de usuarios', 'Cerrar', {
        duration: 3000,
      });
    }
  }
}
