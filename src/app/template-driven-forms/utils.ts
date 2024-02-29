import { AbstractControl, AsyncValidatorFn, FormGroup, ValidationErrors, ValidatorFn } from '@angular/forms';
import { StaticSuite } from 'vest';
import { set, cloneDeep } from 'lodash';
import { Observable, ReplaySubject, debounceTime, map, take, switchMap } from 'rxjs';

function getControlPath(
  rootForm: FormGroup,
  controlName: string,
  control: AbstractControl
): string {
  for (const key in rootForm.controls) {
    if (rootForm.controls.hasOwnProperty(key)) {
      const ctrl = rootForm.get(key);
      if (ctrl instanceof FormGroup) {
        const path = getControlPath(ctrl, controlName, control);
        if (path) {
          return key + '.' + path;
        }
      } else if (ctrl === control) {
        return key;
      }
    }
  }
  return '';
}

function getGroupPath(
  formGroup: FormGroup,
  controlName: string,
  control: AbstractControl
): string {
  for (const key in formGroup.controls) {
    if (formGroup.controls.hasOwnProperty(key)) {
      const ctrl = formGroup.get(key);
      if (ctrl === control) {
        return key;
      }
      if (ctrl instanceof FormGroup) {
        const path = getGroupPath(ctrl, controlName, control);
        if (path) {
          return key + '.' + path;
        }
      }

    }
  }
  return '';
}

/**
 * Calculates the name of an abstract control in a form group
 * @param formGroup
 * @param control
 */
function findControlNameInGroup(
  formGroup:
    | { [key: string]: AbstractControl<any, any> }
    | AbstractControl<any, any>[],
  control: AbstractControl
): string {
  return (
    Object.keys(formGroup).find(
      (name: string) => control === control.parent?.get(name)
    ) || ''
  );
}

/**
 * Calculates the field name of a form control: Eg: addresses.shippingAddress.street
 * @param rootForm
 * @param control
 */
export function getFormControlField(rootForm: FormGroup, control: AbstractControl): string {
  const parentFormGroup = control.parent?.controls;
  if (!parentFormGroup) {
    throw new Error('An ngModel should always be wrapped in a parent FormGroup');
  }
  const abstractControlName = findControlNameInGroup(parentFormGroup, control);
  return getControlPath(rootForm, abstractControlName, control);
}

/**
 * Calcuates the field name of a form group Eg: addresses.shippingAddress
 * @param rootForm
 * @param control
 */
export function getFormGroupField(rootForm: FormGroup, control: AbstractControl): string {
  const parentFormGroup = control.parent?.controls;
  if (!parentFormGroup) {
    throw new Error('An ngModelGroup should always be wrapped in a parent FormGroup');
  }
  const abstractControlName = findControlNameInGroup(parentFormGroup, control);
  return getGroupPath(rootForm, abstractControlName, control);
}

type CacheItem = Partial<{
  sub$$: ReplaySubject<unknown>;
  debounced: Observable<any>;
}>

type Cache = {
  [field: string]: CacheItem;
}

const cache: Cache = {
}

export function createAsyncValidator<T>(
  field: string,
  model: T,
  suite: StaticSuite<string, string, (model: T, field: string) => void>,
): AsyncValidatorFn {
  return (control: AbstractControl) => {
    const mod = cloneDeep(model);
    set(mod as object, field, control.getRawValue()); // Update the property with path
    if (!cache[field]) {
      cache[field] = {
        sub$$: new ReplaySubject(0),
      }
      cache[field].debounced = cache[field].sub$$!.pipe(debounceTime(0))
    }
    cache[field].sub$$!.next(mod);

    return cache[field].debounced!.pipe(
      take(1),
      switchMap(() => {
        return new Observable((observer) => {
          suite(mod, field).done((result) => {
            const errors = result.getErrors()[field];
            observer.next((errors ? { error: errors[0], errors } : null));
            observer.complete();
          })
        }) as Observable<ValidationErrors | null>
      })
    );
  };
}

export function mergeValuesAndRawValues<T>(form: FormGroup): T {
  // Retrieve the standard values (respecting references)
  const value = { ...form.value };

  // Retrieve the raw values (including disabled values)
  const rawValue = form.getRawValue();

  // Recursive function to merge rawValue into value
  function mergeRecursive(target: any, source: any) {
    Object.keys(source).forEach(key => {
      if (target[key] === undefined) {
        // If the key is not in the target, add it directly (for disabled fields)
        target[key] = source[key];
      } else if (typeof source[key] === 'object' && source[key] !== null && !Array.isArray(source[key])) {
        // If the value is an object, merge it recursively
        mergeRecursive(target[key], source[key]);
      }
      // If the target already has the key with a primitive value, it's left as is to maintain references
    });
  }

  // Start the merging process only if the form is a FormGroup
  if (form instanceof FormGroup) {
    mergeRecursive(value, rawValue);
  }

  return value;
}