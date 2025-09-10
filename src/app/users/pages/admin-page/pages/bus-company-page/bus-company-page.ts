import { Component, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatExpansionModule } from '@angular/material/expansion';
import { Emptystate } from '../../../../components/emptystate/emptystate';
import { BusCompanyService } from '../../services/bus-company.service';
import { BusCompany } from '../../../../../shared/interfaces/bus-company';
import { CompaniesCard } from './components/companies-card/companies-card';
import {
  CompanyDialogData,
  DialogCompany,
} from './components/dialog-company/dialog-company';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import {  MatTabsModule } from '@angular/material/tabs';
import { VehiclePage } from "./pages/vehicle-page/vehicle-page";

@Component({
  selector: 'app-bus-company-page',
  imports: [
    CommonModule,
    MatExpansionModule,
    Emptystate,
    CompaniesCard,
    MatIconModule,
    MatButtonModule,
    MatTabsModule,
    VehiclePage
],
  templateUrl: './bus-company-page.html',
  styleUrl: './bus-company-page.scss',
})
export class BusCompanyPage {
  private busCompanyService = inject(BusCompanyService);
  private dialog = inject(MatDialog);

  companies = signal<BusCompany[]>([]);

  async ngOnInit() {
    await this.loadCompanies();
  }

  async loadCompanies() {
    try {
      const companies = await this.busCompanyService.getBusCompanies();
      this.companies.set(companies);
    } catch (error) {
      console.error('Error cargando empresas:', error);
    }
  }

  openCreateDialog() {
    const dialogData: CompanyDialogData = {
      isEdit: false,
    };

    const dialogRef = this.dialog.open(DialogCompany, {
      width: '500px',
      data: dialogData,
      disableClose: true,
    });

    dialogRef.afterClosed().subscribe((result: BusCompany | undefined) => {
      if (result) {
        this.companies.update((companies) => [...companies, result]);
      }
    });
  }

  openEditDialog(company: BusCompany) {
    const dialogData: CompanyDialogData = {
      company: { ...company },
      isEdit: true,
    };

    const dialogRef = this.dialog.open(DialogCompany, {
      width: '500px',
      data: dialogData,
      disableClose: true,
    });

    dialogRef.afterClosed().subscribe((result: BusCompany | undefined) => {
      if (result) {
        this.companies.update((companies) =>
          companies.map((c) => (c.idempresa === result.idempresa ? result : c))
        );
      }
    });
  }

  onCompanyUpdated(updatedCompany: BusCompany) {
    if (updatedCompany.idempresa) {
      this.companies.update((companies) =>
        companies.map((c) =>
          c.idempresa === updatedCompany.idempresa ? updatedCompany : c
        )
      );
    }
  }
}
