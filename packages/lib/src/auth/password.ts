export const COGNITO_PASSWORD_RULE_TEXT = "半角英数字8文字以上";

const COGNITO_PASSWORD_PATTERN = /^[A-Za-z0-9]{8,}$/;

export function isValidCognitoPassword(value: string) {
  return COGNITO_PASSWORD_PATTERN.test(value);
}
