import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialog,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';


@Component({
  selector: 'app-rol-dialog',
  imports: [MatDialogModule, MatButtonModule, MatIconModule],
  templateUrl: './rol-dialog.html',
  styleUrl: './rol-dialog.scss',
})
export class RolDialog {
  private dialogRef = inject(MatDialogRef<RolDialog>);

  close() {
    this.dialogRef.close();
  }
}
