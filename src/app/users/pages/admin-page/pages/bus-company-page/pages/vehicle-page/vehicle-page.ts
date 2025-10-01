import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialog } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Vehicle, VehicleService } from '../../../../services/vehicle.service';
import { Emptystate } from '../../../../../../components/emptystate/emptystate';
import { VehiclesCard } from '../../components/vehicle-card/vehicle-card';
import {
  DialogVehicle,
  VehicleDialogData,
} from '../../components/dialog-vehicle/dialog-vehicle';
import { ConfirmDialog } from '../../../../../../components/confirm-dialog/confirm-dialog';

@Component({
  selector: 'app-vehicles-page',
  imports: [
    CommonModule,
    Emptystate,
    VehiclesCard,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './vehicle-page.html',
  styleUrl: './vehicle-page.scss',
})
export class VehiclePage {
  private vehicleService = inject(VehicleService);
  private dialog = inject(MatDialog);

  vehicles = signal<Vehicle[]>([]);
  isLoading = signal(true); // Estado de carga

  async ngOnInit() {
    await this.loadVehicles();
  }

  async loadVehicles() {
    try {
      this.isLoading.set(true);
      const data = await this.vehicleService.getVehicles();
      this.vehicles.set(data);
    } catch (err) {
      console.error('Error cargando vehículos:', err);
    } finally {
      this.isLoading.set(false);
    }
  }

  openCreateDialog() {
    const dialogData: VehicleDialogData = { isEdit: false };
    const dialogRef = this.dialog.open(DialogVehicle, {
      width: '500px',
      data: dialogData,
      disableClose: true,
    });
    dialogRef.afterClosed().subscribe((result: Vehicle | undefined) => {
      if (result) {
        this.vehicles.update((vehicles) => [...vehicles, result]);
      }
    });
  }

  openEditDialog(vehicle: Vehicle) {
    const dialogData: VehicleDialogData = {
      isEdit: true,
      vehicle: { ...vehicle },
    };
    const dialogRef = this.dialog.open(DialogVehicle, {
      width: '500px',
      data: dialogData,
      disableClose: true,
    });
    dialogRef.afterClosed().subscribe((result: Vehicle | undefined) => {
      if (result) {
        this.vehicles.update((vehicles) =>
          vehicles.map((v) => (v.nroplaca === result.nroplaca ? result : v))
        );
      }
    });
  }

  onVehicleUpdated(updated: Vehicle) {
    this.vehicles.update((vehicles) =>
      vehicles.map((v) => (v.nroplaca === updated.nroplaca ? updated : v))
    );
  }

  async removeVehicle(nroplaca: string) {
    const vehicle = this.vehicles().find((v) => v.nroplaca === nroplaca);
    if (!vehicle) return;
    const dialogRef = this.dialog.open(ConfirmDialog, {
      width: '400px',
      data: {
        title: 'Eliminar vehículo',
        message: `¿Seguro que deseas eliminar el vehículo con placa "${vehicle.nroplaca}"?`,
      },
    });
    dialogRef.afterClosed().subscribe(async (confirmed: boolean) => {
      if (confirmed) {
        try {
          await this.vehicleService.deleteVehicle(nroplaca);
          this.vehicles.update((vs) =>
            vs.filter((v) => v.nroplaca !== nroplaca)
          );
        } catch (error) {
          console.error('Error eliminando vehículo:', error);
        }
      }
    });
  }
}
