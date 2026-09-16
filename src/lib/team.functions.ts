export const TEAM_EMAIL_DOMAIN = "equipe.cronochip.app";

export function cpfLogin(cpf: string) {
  return `${cpf.replace(/\D/g, "")}@${TEAM_EMAIL_DOMAIN}`;
}

export function teamAuthPassword(password: string) {
  return password.length >= 6 ? password : `kit-${password}-access`;
}
