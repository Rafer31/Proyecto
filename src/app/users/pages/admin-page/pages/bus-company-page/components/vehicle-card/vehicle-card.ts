import { Component, inject, input, output } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Vehicle, VehicleService } from '../../../../services/vehicle.service';

@Component({
  selector: 'app-vehicles-card',
  imports: [MatCardModule, MatButtonModule, MatIconModule],
  templateUrl: './vehicle-card.html',
  styleUrl: './vehicle-card.scss',
})
export class VehiclesCard {
  vehicleService = inject(VehicleService);

  vehicles = input<Vehicle[]>([]);
  onEdit = output<Vehicle>();
  onVehicleUpdated = output<Vehicle>();
  onDelete = output<string>(); 

  async onFileSelected(event: Event, vehicle: Vehicle) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    try {
      const newUrl = await this.vehicleService.updateVehicleImage(
        vehicle.nroplaca,
        file
      );
      vehicle.imageUrl = newUrl;
      this.onVehicleUpdated.emit(vehicle);
    } catch (err) {
      console.error('Error subiendo imagen:', err);
    }
  }

  onEditVehicle(vehicle: Vehicle) {
    this.onEdit.emit(vehicle);
  }

  async onDeleteVehicle(vehicle: Vehicle) {
    this.onDelete.emit(vehicle.nroplaca);
  }
}
