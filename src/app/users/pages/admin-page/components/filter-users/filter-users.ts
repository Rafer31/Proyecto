import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';

@Component({
  selector: 'app-filter-users',
  standalone: true,
  imports: [CommonModule, MatFormFieldModule, MatSelectModule],
  templateUrl:'./filter-users.html',
  styleUrl:'./filter-users.scss'

})
export class FilterUsers {
  roles = input<Array<{ idrol: string; nomrol: string }>>([]);
  selectedRole = input<string>('');
  roleChange = output<string>();
}
