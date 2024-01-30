import { AbstractControl, AsyncValidatorFn, FormGroup, ValidatorFn } from '@angular/forms';
import { StaticSuite, SuiteResult } from 'vest';
import { set, cloneDeep } from 'lodash';
import { Observable } from 'rxjs';

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
  if(!parentFormGroup){
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
  if(!parentFormGroup){
    throw new Error('An ngModelGroup should always be wrapped in a parent FormGroup');
  }
  const abstractControlName = findControlNameInGroup(parentFormGroup, control);
  return getGroupPath(rootForm, abstractControlName, control);
}

/**
 * Creates an Angular ValidatorFn that uses a Vest suite behind the scenes
 * @param field
 * @param model
 * @param suite
 */
export function createValidator<T>(
  field: string,
  model: T,
  suite: StaticSuite<string, string, (model: T, field: string) => void>,
): ValidatorFn {
  return (control: AbstractControl) => {
    const mod = cloneDeep(model);
    set(mod as object, field, control.getRawValue()); // Update the property with path
    const result = suite(mod, field);
    const errors = result.getErrors()[field];
    return errors ? { error: errors[0], errors } : null;
  };
}


export function createAsyncValidator<T>(
  field: string,
  model: T,
  suite: StaticSuite<string, string, (model: T, field: string) => void>,
): AsyncValidatorFn {
  return (control: AbstractControl) => {
    const mod = cloneDeep(model);
    set(mod as object, field, control.getRawValue()); // Update the property with path

    return new Observable((observer) => {
      suite(mod, field).done((result) => {
        const errors = result.getErrors()[field];
        observer.next((errors ? { error: errors[0], errors } : null));
        observer.complete();
      })
    })
  };
}
