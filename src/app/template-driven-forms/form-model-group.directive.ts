import { Directive, inject } from '@angular/core';
import { AbstractControl, NG_VALIDATORS, ValidationErrors, Validator } from '@angular/forms';
import { FormDirective } from './form.directive';
import { createValidator, getFormGroupField } from './utils';

@Directive({
  selector: '[ngModelGroup]',
  standalone: true,
  providers: [
    { provide: NG_VALIDATORS, useExisting: FormModelGroupDirective, multi: true },
  ],
})
export class FormModelGroupDirective implements Validator {
  private readonly formDirective = inject(FormDirective);

  public validate(control: AbstractControl): ValidationErrors | null {
    const { ngForm, suite, formValue } = this.formDirective;
    if (!suite || !formValue) {
      throw new Error('suite or formValue is missing');
    }
    const field = getFormGroupField(ngForm.control, control);
    const validator = createValidator(field, formValue, suite);
    return validator(control);
  }
}
