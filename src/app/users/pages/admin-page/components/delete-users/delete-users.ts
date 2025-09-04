import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { DeleteUserService } from '../../services/delete-users.service';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-delete-users',
  imports: [MatDialogModule, MatButtonModule, MatProgressBarModule, MatProgressSpinnerModule],
  templateUrl: './delete-users.html',
  styleUrl: './delete-users.scss'
})
export class DeleteUsers {
 loading = false;
  error: string | null = null;

  constructor(
    private dialogRef: MatDialogRef<DeleteUsers>,
    @Inject(MAT_DIALOG_DATA) public data: { idusuario: string; nomusuario: string },
    private deleteUserService: DeleteUserService
  ) {}

  async confirmDelete() {
    this.loading = true;
    this.error = null;

    try {
      await this.deleteUserService.softDeleteUser(this.data.idusuario);
      this.dialogRef.close(true);
    } catch (err: any) {
      this.error = err.message || 'Error eliminando usuario';
    } finally {
      this.loading = false;
    }
  }

  cancel() {
    this.dialogRef.close(false);
  }
}
