import { Component, ContentChild, HostBinding, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbstractControl, NgModel, NgModelGroup } from '@angular/forms';

@Component({
  selector: '[scControlWrapper]',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './control-wrapper.component.html',
  styleUrls: ['./control-wrapper.component.scss']
})
export class ControlWrapperComponent {
  // Cache the previous error to avoi 'flickering'
  private previousError?: string[];
  @ContentChild(NgModel) public ngModel?: NgModel; // Optional ngModel

  // Optional ngModelGroup
  public readonly ngModelGroup: NgModelGroup | null = inject(NgModelGroup, {
    optional: true,
    self: true,
  });

  private get control(): AbstractControl|undefined {
    return this.ngModelGroup ? this.ngModelGroup.control : this.ngModel?.control;
  }

  @HostBinding('class.input-wrapper--invalid')
  public get invalid() {
    return this.control?.touched && this.previousError;
  }

  public get errors(): string[] | undefined {
    if (this.control?.pending) {
      return this.previousError;
    } else {
      this.previousError = this.control?.errors?.['errors'];
    }
    return this.control?.errors?.['errors'];
  }
}
