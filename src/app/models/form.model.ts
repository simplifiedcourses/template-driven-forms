import { AddressModel, addressShape } from './address.model';
import { PhonenumberModel, phonenumberShape } from './phonenumber.model';
import { DeepRequired } from '../template-driven-forms/deep-required';

export type FormModel = Partial<{
  userId: string;
  firstName: string;
  lastName: string;
  age: number;
  emergencyContact: string;
  passwords: Partial<{
    password: string;
    confirmPassword?: string;
  }>;
  phonenumbers: PhonenumberModel;
  gender: 'male' | 'female' | 'other';
  genderOther: string;
  productId: string;
  addresses: Partial<{
    shippingAddress: Partial<AddressModel>;
    billingAddress: Partial<AddressModel>;
    shippingAddressDifferentFromBillingAddress: boolean;
  }>
}>


export const formShape: DeepRequired<FormModel> = {
  userId: '',
  firstName: '',
  lastName: '',
  age: 0,
  emergencyContact: '',
  addresses: {
    shippingAddress: addressShape,
    billingAddress: addressShape,
    shippingAddressDifferentFromBillingAddress: true
  },
  passwords: {
    password: '',
    confirmPassword: ''
  },
  phonenumbers:phonenumberShape,
  gender: 'other',
  genderOther: '',
  productId: ''
}
