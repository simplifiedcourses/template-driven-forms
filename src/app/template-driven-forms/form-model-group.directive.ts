import { Directive, NgZone, inject, signal } from '@angular/core';
import { AbstractControl, NG_VALIDATORS, ValidationErrors, Validator } from '@angular/forms';
import { FormDirective } from './form.directive';
import { createValidator, getFormGroupField } from './utils';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ReplaySubject, tap, debounceTime, delay, of } from 'rxjs';

@Directive({
  selector: '[ngModelGroup]',
  standalone: true,
  providers: [
    { provide: NG_VALIDATORS, useExisting: FormModelGroupDirective, multi: true },
  ],
})
export class FormModelGroupDirective implements Validator {
  private readonly formDirective = inject(FormDirective);
  private readonly debounced = signal(false);
  private readonly last = signal<ValidationErrors | null>(null);
  private readonly control$$ = new ReplaySubject<AbstractControl<any, any>>(0);
  private readonly ngZone = inject(NgZone);

  public constructor() {
    /**
     * Ignore all validations until the debounce time had been exceeded
     */
    this.ngZone.runOutsideAngular(() => {
      this.control$$
        .pipe(
          tap(() => this.debounced.set(false)),
          debounceTime(0),
          takeUntilDestroyed(),
        )
        .subscribe((control: AbstractControl) => {
          this.debounced.set(true);
          control.updateValueAndValidity({ onlySelf: true, emitEvent: false });
        });
    });
  }


  public validate(control: AbstractControl): ValidationErrors | null {
    if (!this.debounced()) {
      this.control$$.next(control);
      // we keep the last value in a signal because Angular triggers the validator twice
      // and we don't want to have a flickering, so we keep track of the last value
      return this.last();
    }
    this.debounced.set(false);

    const { ngForm, suite, formValue } = this.formDirective;
    if (!suite || !formValue) {
      throw new Error('suite or formValue is missing');
    }
    const field = getFormGroupField(ngForm.control, control);
    const validator = createValidator(field, formValue, suite);
    const res = validator(control);
    this.last.set(res);
    return res;
  }
}
