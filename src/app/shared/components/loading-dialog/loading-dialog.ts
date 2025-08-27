import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
export interface LoadingDialogData {
  message: string;
  title: string;
  textButton?: string | null;
}
@Component({
  selector: 'app-loading-dialog',
  imports: [MatDialogModule, MatButtonModule, MatProgressSpinnerModule],
  templateUrl: './loading-dialog.html',
  styleUrl: './loading-dialog.scss',
})
export class LoadingDialog {
  private dialogRef = inject(MatDialogRef)
  private data = inject<LoadingDialogData>(MAT_DIALOG_DATA)

  close(){
    this.dialogRef.close()
  }
}
