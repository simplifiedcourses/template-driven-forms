import { Optional, Provider } from '@angular/core';
import { ControlContainer, FormsModule, NgForm, NgModelGroup } from '@angular/forms';
import { FormDirective } from './form.directive';
import { FormModelDirective } from './form-model.directive';
import { FormModelGroupDirective } from './form-model-group.directive';
import { ControlWrapperComponent } from './control-wrapper/control-wrapper.component';

/**
 * This is borrowed from  [https://github.com/wardbell/ngc-validate/blob/main/src/app/core/form-container-view-provider.ts](https://github.com/wardbell/ngc-validate/blob/main/src/app/core/form-container-view-provider.ts)
 * Thank you so much Ward Bell for your effort!:
 *
 * Provide a ControlContainer to a form component from the
 * nearest parent NgModelGroup (preferred) or NgForm.
 *
 * Required for Reactive Forms as well (unless you write CVA)
 *
 * @example
 * ```
 *   @Component({
 *     ...
 *    viewProviders[ formViewProvider ]
 *   })
 * ```
 * @see Kara's AngularConnect 2017 talk: https://youtu.be/CD_t3m2WMM8?t=1826
 *
 * Without this provider
 * - Controls are not registered with parent NgForm or NgModelGroup
 * - Form-level flags say "untouched" and "valid"
 * - No form-level validation roll-up
 * - Controls still validate, update model, and update their statuses
 * - If within NgForm, no compiler error because ControlContainer is optional for ngModel
 *
 * Note: if the SubForm Component that uses this Provider
 * is not within a Form or NgModelGroup, the provider returns `null`
 * resulting in an error, something like
 * ```
 * preview-fef3604083950c709c52b.js:1 ERROR Error:
 *  ngModelGroup cannot be used with a parent formGroup directive.
 *```
 */
export const formViewProvider: Provider = {
  provide: ControlContainer,
  useFactory: _formViewProviderFactory,
  deps: [
    [new Optional(), NgForm],
    [new Optional(), NgModelGroup]
  ]
};

export function _formViewProviderFactory(
  ngForm: NgForm, ngModelGroup: NgModelGroup
) {
  return ngModelGroup || ngForm || null;
}

export const templateDrivenFormsViewProviders = [
  { provide: ControlContainer, useExisting: NgForm },
  formViewProvider // very important if we want nested components with ngModelGroup
]

export const templateDrivenForms = [ControlWrapperComponent, FormDirective, FormsModule, FormModelDirective, FormModelGroupDirective];
