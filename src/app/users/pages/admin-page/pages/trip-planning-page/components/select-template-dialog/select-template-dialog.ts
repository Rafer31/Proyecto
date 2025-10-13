import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { FormsModule } from '@angular/forms';
import { TripTemplateService, TripTemplate } from '../../../../../../../shared/services/trip-template.service';
import { UserStateService } from '../../../../../../../shared/services/user-state.service';

@Component({
  selector: 'app-select-template-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatListModule,
    MatProgressSpinnerModule,
    MatChipsModule,
    MatDividerModule,
    MatFormFieldModule,
    MatInputModule,
  ],
  templateUrl: './select-template-dialog.html',
  styleUrl: './select-template-dialog.scss',
})
export class SelectTemplateDialog implements OnInit {
  private dialogRef = inject(MatDialogRef<SelectTemplateDialog>);
  private templateService = inject(TripTemplateService);
  private userState = inject(UserStateService);

  templates = signal<TripTemplate[]>([]);
  filteredTemplates = signal<TripTemplate[]>([]);
  isLoading = signal(true);
  searchTerm = '';

  async ngOnInit() {
    await this.loadTemplates();
  }

  private async loadTemplates() {
    try {
      this.isLoading.set(true);
      const currentUser = this.userState.currentUser();

      if (!currentUser) {
        return;
      }

      const templates = await this.templateService.getMyTemplates(
        currentUser.idusuario
      );

      this.templates.set(templates);
      this.filteredTemplates.set(templates);
    } catch (error) {
      console.error('Error cargando plantillas:', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  onSearch() {
    const term = this.searchTerm.toLowerCase().trim();

    if (!term) {
      this.filteredTemplates.set(this.templates());
      return;
    }

    const filtered = this.templates().filter(
      (t) =>
        t.nombreplantilla.toLowerCase().includes(term) ||
        t.descripcion?.toLowerCase().includes(term) ||
        t.destino?.nomdestino.toLowerCase().includes(term)
    );

    this.filteredTemplates.set(filtered);
  }

  selectTemplate(template: TripTemplate) {
    this.dialogRef.close(template);
  }

  onCancel() {
    this.dialogRef.close(null);
  }

  getConductorName(template: TripTemplate): string {
    const conductor = Array.isArray(template.conductor)
      ? template.conductor[0]
      : template.conductor;

    const usuario = conductor?.usuario;
    if (usuario) {
      return `${usuario.nomusuario} ${usuario.patusuario}`;
    }
    return 'N/A';
  }

  getVehiculoInfo(template: TripTemplate): string {
    const vehiculo = Array.isArray(template.vehiculo)
      ? template.vehiculo[0]
      : template.vehiculo;

    if (vehiculo) {
      return `${vehiculo.nroplaca} (${vehiculo.tipovehiculo})`;
    }
    return 'N/A';
  }

  getEmpresaName(template: TripTemplate): string {
    const empresa = Array.isArray(template.empresa)
      ? template.empresa[0]
      : template.empresa;

    return empresa?.nomempresa || 'N/A';
  }

  getDestinoName(template: TripTemplate): string {
    const destino = Array.isArray(template.destino)
      ? template.destino[0]
      : template.destino;

    return destino?.nomdestino || 'N/A';
  }
}
