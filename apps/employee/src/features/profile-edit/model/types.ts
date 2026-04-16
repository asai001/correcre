export type EditableEmployeeAddress = {
  postalCode?: string;
  prefecture?: string;
  city?: string;
  building?: string;
};

export type EditableEmployeeProfile = {
  lastName: string;
  firstName: string;
  lastNameKana: string;
  firstNameKana: string;
  email: string;
  phoneNumber?: string;
  address?: EditableEmployeeAddress;
};

export type UpdateOwnProfileInput = {
  lastName: string;
  firstName: string;
  lastNameKana: string;
  firstNameKana: string;
  email: string;
  phoneNumber?: string;
  postalCodeFirstHalf?: string;
  postalCodeSecondHalf?: string;
  prefecture?: string;
  city?: string;
  building?: string;
};
