import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialog } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Vehicle, VehicleService } from '../../../../services/vehicle.service';
import { Emptystate } from '../../../../../../components/emptystate/emptystate';
import { VehiclesCard } from '../../components/vehicle-card/vehicle-card';
import { DialogVehicle, VehicleDialogData } from '../../components/dialog-vehicle/dialog-vehicle';

@Component({
  selector: 'app-vehicles-page',
  imports: [
    CommonModule,
    Emptystate,
    VehiclesCard,
    MatButtonModule,
    MatIconModule,
  ],
  templateUrl: './vehicle-page.html',
  styleUrl: './vehicle-page.scss',
})
export class VehiclePage {
  private vehicleService = inject(VehicleService);
  private dialog = inject(MatDialog);

  vehicles = signal<Vehicle[]>([]);

  async ngOnInit() {
    await this.loadVehicles();
  }

  async loadVehicles() {
    try {
      const data = await this.vehicleService.getVehicles();
      this.vehicles.set(data);
    } catch (err) {
      console.error('Error cargando vehículos:', err);
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
}
