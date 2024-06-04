import { Directive, inject } from '@angular/core';
import { AbstractControl, AsyncValidator, NG_ASYNC_VALIDATORS, ValidationErrors } from '@angular/forms';
import { FormDirective } from './form.directive';
import { getFormControlField } from './utils';
import { Observable, of } from 'rxjs';

@Directive({
  selector: '[ngModel]',
  standalone: true,
  providers: [
    { provide: NG_ASYNC_VALIDATORS, useExisting: FormModelDirective, multi: true },
  ],
})
export class FormModelDirective implements AsyncValidator {
  private readonly formDirective = inject(FormDirective);
  public validate(control: AbstractControl): Observable<ValidationErrors | null> {
    const { ngForm, suite, formValue } = this.formDirective;
    if (!suite || !formValue) {
      throw of(null);
    }
    const field = getFormControlField(ngForm.control, control);
    return this.formDirective.createAsyncValidator(field, formValue, suite)(control.getRawValue()) as Observable<ValidationErrors | null>
  }
}
