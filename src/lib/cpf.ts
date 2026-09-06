export function onlyDigitsCpf(value: string): string {
  return value.replace(/\D/g, "");
}

export function formatCpf(value: string): string {
  const digits = onlyDigitsCpf(value).slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`;
}

export function isValidCpf(value: string): boolean {
  const digits = onlyDigitsCpf(value);
  if (digits.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(digits)) return false;

  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(digits.charAt(i), 10) * (10 - i);
  let check = 11 - (sum % 11);
  if (check === 10 || check === 11) check = 0;
  if (check !== parseInt(digits.charAt(9), 10)) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(digits.charAt(i), 10) * (11 - i);
  check = 11 - (sum % 11);
  if (check === 10 || check === 11) check = 0;
  if (check !== parseInt(digits.charAt(10), 10)) return false;

  return true;
}
