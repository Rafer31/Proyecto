import { Component, inject, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { BusCompany } from '../../../../../../../shared/interfaces/bus-company';
import { BusCompanyService } from '../../../../services/bus-company.service';

@Component({
  selector: 'app-companies-card',
  imports: [MatCardModule, MatButtonModule, MatIconModule],
  templateUrl: './companies-card.html',
  styleUrl: './companies-card.scss',
})
export class CompaniesCard {
  busCompanyService = inject(BusCompanyService);

  companies = input<BusCompany[]>([]);
  onEdit = output<BusCompany>();
  onCompanyUpdated = output<BusCompany>();

  async onFileSelected(event: Event, company: BusCompany) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];

    try {
      const newImageUrl = await this.busCompanyService.updateCompanyImage(
        company.idempresa,
        file
      );

      company.imageUrl = newImageUrl;

      this.onCompanyUpdated.emit(company);
    } catch (err) {
      console.error('Error subiendo imagen:', err);
    }
  }

  onEditCompany(company: BusCompany) {
    this.onEdit.emit(company);
  }
  onDelete = output<number>();

  async onDeleteCompany(company: BusCompany) {
    try {
      await this.busCompanyService.deleteBusCompany(company.idempresa);
      this.onDelete.emit(company.idempresa); // Emitimos el ID eliminado
    } catch (err) {
      console.error('Error eliminando empresa:', err);
    }
  }
}
