import { inject, Injectable } from '@angular/core';
import { SupabaseService } from '../../../../shared/services/supabase.service';

export interface Vehicle {
  nroplaca: string;
  color: string;
  nroasientos: number;
  tipovehiculo: 'bus' | 'minibus' | 'mini';
  imageUrl?: string;
}

export type CreateVehicle = Omit<Vehicle, 'imageUrl'> & { imageUrl?: string };
export type UpdateVehicle = Partial<CreateVehicle>;

@Injectable({ providedIn: 'root' })
export class VehicleService {
  private supabaseClient = inject(SupabaseService).supabase;

  // Obtener todos los vehículos
  async getVehicles(): Promise<Vehicle[]> {
    const { data, error } = await this.supabaseClient
      .from('vehiculo')
      .select('*');
    if (error) throw error;
    return data ?? [];
  }

  // Crear un vehículo
  async createVehicle(vehicle: CreateVehicle): Promise<Vehicle> {
    const { data, error } = await this.supabaseClient
      .from('vehiculo')
      .insert(vehicle)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  // Actualizar vehículo (por nroplaca)
  async updateVehicle(
    nroplaca: string,
    updates: UpdateVehicle
  ): Promise<Vehicle> {
    const { data, error } = await this.supabaseClient
      .from('vehiculo')
      .update(updates)
      .eq('nroplaca', nroplaca)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  // Subir imagen a Supabase Storage
  async uploadVehicleImage(file: File, fileName: string) {
    const { data, error } = await this.supabaseClient.storage
      .from('vehicles')
      .upload(fileName, file);
    if (error) throw error;
    return data;
  }

  // Actualizar imagen y obtener URL pública
  async updateVehicleImage(nroplaca: string, file: File): Promise<string> {
    const fileName = `${nroplaca}-${Date.now()}-${file.name}`;

    // Subir a storage
    await this.uploadVehicleImage(file, fileName);

    // Obtener URL pública
    const publicUrl = this.getPublicUrl(fileName);

    // Guardar en la tabla vehiculo
    await this.updateVehicle(nroplaca, { imageUrl: publicUrl });

    return publicUrl;
  }

  // Obtener URL pública desde storage
  getPublicUrl(fileName: string) {
    return this.supabaseClient.storage.from('vehicles').getPublicUrl(fileName)
      .data.publicUrl;
  }
  async deleteVehicle(nroplaca: string): Promise<void> {
    const { error } = await this.supabaseClient
      .from('vehiculo')
      .delete()
      .eq('nroplaca', nroplaca);

    if (error) throw error;
  }
}
