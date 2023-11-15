import { Directive, inject, Input, Output } from '@angular/core';
import { AbstractControl, FormGroup, NgForm } from '@angular/forms';
import { debounceTime, map } from 'rxjs';
import { SuiteResult } from 'vest';

@Directive({
  selector: 'form',
  standalone: true,
})
export class FormDirective<T> {
  // Inject its own `NgForm` instance
  public readonly ngForm = inject(NgForm, { self: true });
  @Input() public formValue: T | null = null;
  @Input() public suite: ((formValue: T, field: string) => SuiteResult<string, string>) | null = null;

  @Output() public readonly formValueChange = this.ngForm.form.valueChanges.pipe(
    debounceTime(0)
  );

  @Output() public readonly dirtyChange = this.formValueChange.pipe(
    map(() => this.ngForm.dirty)
  );

  @Output() public readonly validChange = this.formValueChange.pipe(
    map(() => this.ngForm.valid),
  );

  @Input()
  public set alwaysTriggerValidations(v: boolean) {
    this.ngForm.form.valueChanges
      .pipe(debounceTime(0))
      .subscribe(() => {
        this.updateValueAndValidityRecursive(this.ngForm.form);
      });
  };

  @Input() public set validationConfig(v: { [key: string]: string[] }) {
    Object.keys(v).forEach((key) => {
      this.formValueChange
        .pipe(
          debounceTime(0),
          map(res => res[key])
        )
        .subscribe((form) => {
          v[key].forEach((path) => {
            this.ngForm.form.get(path)?.updateValueAndValidity({ onlySelf: true, emitEvent: false });
          })
        })
    })
  }

  constructor() {
    this.ngForm.ngSubmit.subscribe(() => {
      this.ngForm.form.markAllAsTouched();
    });
  }

  private updateValueAndValidityRecursive(control: AbstractControl): void {
    if (control instanceof FormGroup) {
      control.updateValueAndValidity({ onlySelf: true, emitEvent: false });
      Object.values(control.controls).forEach(subControl => {
        this.updateValueAndValidityRecursive(subControl);
      });
    } else {
      control.updateValueAndValidity({ onlySelf: true, emitEvent: false });
    }
  }
}

