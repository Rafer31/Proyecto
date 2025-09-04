import { Component, inject } from '@angular/core';
import { BusCompany } from '../../../../../../../shared/interfaces/bus-company';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { BusCompanyService } from '../../../../services/bus-company.service';
export interface CompanyDialogData {
  company?: BusCompany;
  isEdit: boolean;
}
@Component({
  selector: 'app-dialog-company',
  imports: [
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    ReactiveFormsModule,
  ],
  templateUrl: './dialog-company.html',
  styleUrl: './dialog-company.scss',
})
export class DialogCompany {
  private fb = inject(FormBuilder);
  private busCompanyService = inject(BusCompanyService);
  private dialogRef = inject(MatDialogRef<DialogCompany>);
  public data = inject<CompanyDialogData>(MAT_DIALOG_DATA);

  companyForm!: FormGroup;
  selectedFile: File | null = null;
  isLoading = false;

  ngOnInit() {
    this.initForm();
  }

  private initForm() {
    this.companyForm = this.fb.group({
      nomempresa: [this.data.company?.nomempresa || '', [Validators.required]],
      nomcontacto: [
        this.data.company?.nomcontacto || '',
        [Validators.required],
      ],
      celcontacto: [
        this.data.company?.celcontacto || '',
        [Validators.required],
      ],
    });
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.selectedFile = input.files[0];
    }
  }

  removeFile() {
    this.selectedFile = null;
  }

  async onSave() {
    if (!this.companyForm.valid) return;

    this.isLoading = true;

    try {
      const formData = this.companyForm.value;

      if (this.data.isEdit && this.data.company?.idempresa) {
        const updatedCompany = await this.busCompanyService.updateBusCompany(
          this.data.company.idempresa,
          formData
        );

        if (this.selectedFile) {
          const newImageUrl = await this.busCompanyService.updateCompanyImage(
            this.data.company.idempresa,
            this.selectedFile
          );
          updatedCompany.imageUrl = newImageUrl;
        }

        this.dialogRef.close(updatedCompany);
      } else {
        const newCompany = await this.busCompanyService.createBusCompany(
          formData
        );

        if (this.selectedFile && newCompany.idempresa) {
          const imageUrl = await this.busCompanyService.updateCompanyImage(
            newCompany.idempresa,
            this.selectedFile
          );
          newCompany.imageUrl = imageUrl;
        }

        this.dialogRef.close(newCompany);
      }
    } catch (error) {
      console.error('Error guardando empresa:', error);
    } finally {
      this.isLoading = false;
    }
  }

  onCancel() {
    this.dialogRef.close();
  }
}
