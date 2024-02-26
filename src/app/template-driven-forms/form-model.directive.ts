import { Directive, Input, NgZone, inject, signal } from '@angular/core';
import { AbstractControl, AsyncValidator, NG_ASYNC_VALIDATORS, ValidationErrors } from '@angular/forms';
import { FormDirective } from './form.directive';
import { createAsyncValidator, getFormControlField } from './utils';
import { Observable, ReplaySubject, debounceTime, delay, of, tap } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';


@Directive({
  selector: '[ngModel]',
  standalone: true,
  providers: [
    { provide: NG_ASYNC_VALIDATORS, useExisting: FormModelDirective, multi: true },
  ],
})
export class FormModelDirective implements AsyncValidator {
  private readonly formDirective = inject(FormDirective);
  private readonly debounced = signal(false);
  private readonly last = signal<ValidationErrors | null>(null);
  private readonly control$$ = new ReplaySubject<AbstractControl<any, any>>(0);
  private readonly ngZone = inject(NgZone);
  @Input() public  type: 'radio' |unknown| undefined = undefined;

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
        .subscribe((control) => {
          this.debounced.set(true);
          control.updateValueAndValidity({ onlySelf: true, emitEvent: false });
        });
    });
  }

  public validate(control: AbstractControl): Observable<ValidationErrors | null> {
    if (!this.debounced() && this.type !== 'radio') {
      this.control$$.next(control);
      // we keep the last value in a signal because Angular triggers the validator twice
      // and we don't want to have a flickering, so we keep track of the last value
      // We also want to delay the last value to avoid flickering of an error that was 
      // shown previously
      return of(this.last()).pipe(delay(0));
    }
    this.debounced.set(false);
    const { ngForm, suite, formValue } = this.formDirective;
    if (!suite || !formValue) {
      throw new Error('suite or formValue is missing');
    }
    const field = getFormControlField(ngForm.control, control);
    return (createAsyncValidator(field, formValue, suite)(control) as Observable<ValidationErrors | null>).pipe(
      tap((v) => this.last.set(v)),
    );
  }
}
