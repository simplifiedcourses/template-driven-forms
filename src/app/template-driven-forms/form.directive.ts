import { Directive, inject, Input, OnDestroy, Output } from '@angular/core';
import { AbstractControl, AsyncValidatorFn, FormGroup, NgForm, ValidationErrors } from '@angular/forms';
import { debounceTime, distinctUntilChanged, map, Observable, ReplaySubject, Subject, switchMap, take, takeUntil } from 'rxjs';
import { StaticSuite } from 'vest';
import { cloneDeep, set } from 'lodash';
import { mergeValuesAndRawValues } from './utils';

@Directive({
  selector: 'form',
  standalone: true,
})
export class FormDirective<T> implements OnDestroy {
  /**
   * Used to debounce formValues to make sure vest isn't triggered all the time
   */
  private readonly formValueCache: {
    [field: string]: Partial<{
      sub$$: ReplaySubject<unknown>;
      debounced: Observable<any>;
    }>;
  } = {};
  private readonly destroy$$ = new Subject<void>();
  public readonly ngForm = inject(NgForm, { self: true });
  @Input() public formValue: T | null = null;
  @Input() public suite: StaticSuite<string, string, (model: T, field: string) => void> | null = null;

  @Output() public readonly formValueChange = this.ngForm.form.valueChanges.pipe(
    debounceTime(0),
    map(() => mergeValuesAndRawValues<T>(this.ngForm.form))
  );

  @Output() public readonly dirtyChange = this.formValueChange.pipe(
    debounceTime(0),
    map(() => this.ngForm.form.dirty),
  );

  @Output() public readonly validChange =  this.ngForm.form.statusChanges.pipe(
    debounceTime(0),
    map(() => this.ngForm.form.valid),
  );

  @Input() public set validationConfig(v: {[key:string]: string[]}) {
    Object.keys(v).forEach((key) => {
      this.formValueChange
        .pipe(
          map(() => this.ngForm.form.get(key)?.value),
          distinctUntilChanged(),
          takeUntil(this.destroy$$)
        )
        .subscribe(() => {
          v[key].forEach((path) => {
            this.ngForm.form.get(path)?.updateValueAndValidity({ onlySelf: false, emitEvent: false });
          })
        })
    })
  }

  constructor() {
    this.ngForm.ngSubmit.subscribe(() => {
      this.ngForm.form.markAllAsTouched();
    });
  }
  public ngOnDestroy(): void {
    this.destroy$$.next();
  }

  /**
   * This will feed the formValueCache, debounce it till the next tick
   * and create an asynchronous validator that runs a vest suite
   * @param field 
   * @param model 
   * @param suite 
   * @returns an asynchronous vlaidator function
   */
  public createAsyncValidator(
    field: string,
    model: T,
    suite:
      | StaticSuite<string, string, (model: T, field: string) => void>
  ): AsyncValidatorFn {
    return (control: AbstractControl) => {
      const mod = cloneDeep(model);
      set(mod as object, field, control.getRawValue()); // Update the property with path
      if (!this.formValueCache[field]) {
        this.formValueCache[field] = {
          sub$$: new ReplaySubject(1), // Keep track of the last model
        };
        this.formValueCache[field].debounced = this.formValueCache[field].sub$$!.pipe(debounceTime(0));
      }
      // Next the latest model in the cache for a certain field
      this.formValueCache[field].sub$$!.next(mod);

      return this.formValueCache[field].debounced!.pipe(
        // When debounced, take the latest value and perform the asynchronous vest validation
        take(1),
        switchMap(() => {
          return new Observable((observer) => {
            suite(mod, field).done((result) => {
              const errors = result.getErrors()[field];
              observer.next((errors ? { error: errors[0], errors } : null));
              observer.complete();
            });
          }) as Observable<ValidationErrors | null>;
        }),
        takeUntil(this.destroy$$),
      );
    };
  }
}