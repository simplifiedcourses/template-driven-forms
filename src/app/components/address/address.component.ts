import { Component, Input, ViewEncapsulation } from '@angular/core';

import { AddressModel } from '../../models/address.model';
import {
  templateDrivenForms,
  templateDrivenFormsViewProviders
} from '../../template-driven-forms/template-driven.forms';

@Component({
  selector: 'sc-address',
  standalone: true,
  imports: [templateDrivenForms],
  viewProviders: [templateDrivenFormsViewProviders],
  encapsulation: ViewEncapsulation.None,
  templateUrl: './address.component.html',
  styleUrls: ['./address.component.scss']
})
export class AddressComponent {
  @Input() address?: AddressModel;
}
