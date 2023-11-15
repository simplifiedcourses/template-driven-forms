import { Component, computed, effect, inject, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProductService } from '../../product.service';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { FormModel, formShape } from '../../models/form.model';
import { AddressComponent } from '../address/address.component';
import { debounceTime, filter, switchMap } from 'rxjs';
import { LukeService } from '../../luke.service';
import { PhonenumbersComponent } from '../phonenumbers/phonenumbers.component';
import { AddressModel } from '../../models/address.model';
import { purchaseFormValidations } from '../../validations/purchase.validations';
import { templateDrivenForms } from '../../template-driven-forms/template-driven.forms';
import { validateShape } from '../../template-driven-forms/shape-validation';

@Component({
  selector: 'sc-purchase-form',
  standalone: true,
  imports: [CommonModule, templateDrivenForms, AddressComponent, PhonenumbersComponent],
  templateUrl: './purchase-form.component.html',
  styleUrls: ['./purchase-form.component.scss']
})
export class PurchaseFormComponent {
  private readonly lukeService = inject(LukeService);
  private readonly productService = inject(ProductService);
  public readonly products = toSignal(this.productService.getAll());
  public tracker = (i: number) => i;
  protected readonly formValue = signal<FormModel>({});
  protected readonly formValid = signal<boolean>(false);
  protected readonly loading = signal<boolean>(false);
  protected readonly suite = purchaseFormValidations;
  private readonly shippingAddress = signal<AddressModel>({});

  private readonly viewModel = computed(() => {
    return {
      formValue: this.formValue(),
      emergencyContactDisabled: (this.formValue().age || 0) >= 18,
      showShippingAddress: this.formValue().addresses?.shippingAddressDifferentFromBillingAddress,
      showGenderOther: this.formValue().gender === 'other',
      shippingAddress: this.formValue().addresses?.shippingAddress || this.shippingAddress(),
      loading: this.loading()
    }
  });

  protected readonly validationConfig: {
    [key: string]: string[];
  } = {
      'age': ['emergencyContact'],
      'passwords.password': ['passwords.confirmPassword'],
      'gender': ['genderOther']
    };

  constructor() {
    const firstName = computed(() => this.formValue().firstName);
    const lastName = computed(() => this.formValue().lastName);
    effect(
      () => {
        if (firstName() === 'Brecht') {
          this.formValue.update((val) => ({
            ...val,
            gender: 'male'
          }));
        }
        if (firstName() === 'Brecht' && lastName() === 'Billiet') {
          this.formValue.update((val) => ({
            ...val,
            age: 35,
            passwords: {
              password: 'Test1234',
              confirmPassword: 'Test12345'
            }
          }));
        }
      },
      { allowSignalWrites: true }
    );

    toObservable(firstName)
      .pipe(
        debounceTime(1000),
        filter(v => v === 'Luke'),
        switchMap(() => this.lukeService.getLuke())
      )
      .subscribe((luke) => {
        this.formValue.update(v => ({ ...v, ...luke }))
      })
  }

  protected setFormValue(v: FormModel): void {
    this.formValue.set(v);
    validateShape(v, formShape);
    if (v.addresses?.shippingAddress) {
      this.shippingAddress.set(v.addresses.shippingAddress);
    }
  }

  protected get vm() {
    return this.viewModel();
  }

  protected onSubmit(): void {
    if (this.formValid()) {
      console.log(this.formValue())
    }
  }

  protected fetchData() {
    this.loading.set(true);
    this.lukeService.getLuke().subscribe((luke) => {
      this.formValue.update(v => ({ ...v, ...luke }))
      this.loading.set(false);
    })
  }
};
