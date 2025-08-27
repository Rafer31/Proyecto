import { Component, signal } from '@angular/core';
import { Emptystate } from '../../../../components/emptystate/emptystate';

@Component({
  selector: 'app-bus-company-page',
  imports: [Emptystate],
  templateUrl: './bus-company-page.html',
  styleUrl: './bus-company-page.scss'
})
export class BusCompanyPage {
  data = signal<string|null>(null)
}
