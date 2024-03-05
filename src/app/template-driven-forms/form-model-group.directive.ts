import { Directive, inject } from '@angular/core';
import { AbstractControl, AsyncValidator, NG_ASYNC_VALIDATORS, ValidationErrors } from '@angular/forms';
import { FormDirective } from './form.directive';
import { getFormGroupField } from './utils';
import { Observable } from 'rxjs';

@Directive({
  selector: '[ngModelGroup]',
  standalone: true,
  providers: [
    { provide: NG_ASYNC_VALIDATORS, useExisting: FormModelGroupDirective, multi: true },
  ],
})
export class FormModelGroupDirective implements AsyncValidator {
  private readonly formDirective = inject(FormDirective);

  public validate(control: AbstractControl): Observable<ValidationErrors | null> {
    const { ngForm, suite, formValue } = this.formDirective;
    if (!suite || !formValue) {
      throw new Error('suite or formValue is missing');
    }
    const field = getFormGroupField(ngForm.control, control);
    return this.formDirective.createAsyncValidator(field, formValue, suite)(control) as Observable<ValidationErrors | null>
  }
}
