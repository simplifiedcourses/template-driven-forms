import { Component, Input } from '@angular/core';
import { CommonModule, KeyValuePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  templateDrivenForms,
  templateDrivenFormsViewProviders
} from '../../template-driven-forms/template-driven.forms';
import { arrayToObject } from '../../array-to-object';

@Component({
  selector: 'sc-phonenumbers',
  standalone: true,
  imports: [CommonModule, templateDrivenForms, KeyValuePipe],
  templateUrl: './phonenumbers.component.html',
  styleUrls: ['./phonenumbers.component.scss'],
  viewProviders: [templateDrivenFormsViewProviders]
})
export class PhonenumbersComponent {
  @Input() public phonenumbers: { [key: string]: string } = {};
  public addValue = '';

  protected tracker = (i: number) => i;

  public addPhonenumber(): void {
    const phoneNumbers = [...Object.values(this.phonenumbers), this.addValue];
    this.phonenumbers = arrayToObject(phoneNumbers);
    this.addValue = '';
  }

  public removePhonenumber(key: string): void {
    const phonenumbers = Object.values(this.phonenumbers).filter(
      (v, index) => index !== Number(key))
    this.phonenumbers = arrayToObject(phonenumbers)
  }
}
