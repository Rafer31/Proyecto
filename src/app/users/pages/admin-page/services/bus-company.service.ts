import { inject, Injectable } from '@angular/core';
import { SupabaseService } from '../../../../shared/services/supabase.service';
import {
  BusCompany,
  CreateBusCompany,
  UpdateBusCompany,
} from '../../../../shared/interfaces/bus-company';

@Injectable({ providedIn: 'root' })
export class BusCompanyService {
  private supabaseClient = inject(SupabaseService).supabase;

  async getBusCompanies(): Promise<BusCompany[]> {
    const { data, error } = await this.supabaseClient
      .from('empresa_contratista')
      .select('*');
    if (error) throw error;
    const empresas: BusCompany[] = data ?? [];
    return empresas;
  }

  async createBusCompany(company: CreateBusCompany): Promise<BusCompany> {
    const companyData = {
      ...company,
      estado: 'activo',
    };
    const { data, error } = await this.supabaseClient
      .from('empresa_contratista')
      .insert(companyData)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async updateBusCompany(
    id: number,
    updates: UpdateBusCompany
  ): Promise<BusCompany> {
    const { data, error } = await this.supabaseClient
      .from('empresa_contratista')
      .update(updates)
      .eq('idempresa', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async uploadCompanyImage(file: File, fileName: string) {
    const { data, error } = await this.supabaseClient.storage
      .from('companies')
      .upload(fileName, file);
    if (error) throw error;
    return data;
  }

  async updateCompanyImage(companyId: number, file: File): Promise<string> {
    const fileName = `${companyId}-${Date.now()}-${file.name}`;

    await this.uploadCompanyImage(file, fileName);

    const publicUrl = this.getPublicUrl(fileName);

    await this.updateBusCompany(companyId, { imageUrl: publicUrl });

    return publicUrl;
  }

  getPublicUrl(fileName: string) {
    return this.supabaseClient.storage.from('companies').getPublicUrl(fileName)
      .data.publicUrl;
  }
  async deleteBusCompany(id: number): Promise<void> {
    const { error } = await this.supabaseClient
      .from('empresa_contratista')
      .delete()
      .eq('idempresa', id);

    if (error) throw error;
  }
}
