import { isDevMode } from '@angular/core';

export class ShapeMismatchError extends Error {
  constructor(errorList: string[]) {
    super(`Shape mismatch:\n\n${errorList.join('\n')}\n\n`);
  }
}

export function validateShape(
  val: Record<string, any>,
  shape: Record<string, any>,
): void {
  if (isDevMode()) {
    const errors = validateFormValue(val, shape);
    if (errors.length) {
      throw new ShapeMismatchError(errors);
    }
  }
}

function validateFormValue(formValue: Record<string, any>, shape: Record<string, any>, path: string = ''): string[] {
  const errors: string[] = [];
  for (const key in formValue) {
      if (Object.keys(formValue).includes(key)) {
          // In form arrays we don't know how many items there are
          // so every time reset the key to '0' when the key is a number and is bigger than 0
          let keyToCompareWith = key;
          if(parseFloat(key) > 0){
              keyToCompareWith = '0';
          }
          const newPath = path ? `${path}.${key}` : key;
          if (typeof formValue[key] === 'object' && formValue[key] !== null) {
              if ((typeof shape[keyToCompareWith] !== 'object' || shape[keyToCompareWith] === null) && isNaN(parseFloat(key))) {
                  errors.push(`[ngModelGroup] Mismatch: '${newPath}'`);
              }
              errors.push(...validateFormValue(formValue[key], shape[keyToCompareWith], newPath));
          } else if ((shape ? !(key in shape) : true) && isNaN(parseFloat(key))) {
              errors.push(`[ngModel] Mismatch '${newPath}'`);
          }
      }
  }
  return errors;
}