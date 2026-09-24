const PUBLISHED_RESET_API = "https://event-kit-sync.lovable.app/api/public/team-password-reset";

function getTeamPasswordResetApi() {
  const hostname = window.location.hostname;
  const runsOnLovable = hostname === "localhost" || hostname.endsWith(".lovable.app");
  return runsOnLovable ? "/api/public/team-password-reset" : PUBLISHED_RESET_API;
}

type IssueResetLinkResponse = {
  token: string;
  expiresAt: string;
};

async function readApiError(response: Response) {
  const body = (await response.json().catch(() => null)) as { error?: string } | null;
  return body?.error ?? "Não foi possível concluir a solicitação.";
}

export async function issueTeamPasswordResetLink(
  accessToken: string,
  eventId: string,
  userId: string,
): Promise<IssueResetLinkResponse> {
  const response = await fetch(getTeamPasswordResetApi(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ action: "issue", eventId, userId }),
  });

  if (!response.ok) throw new Error(await readApiError(response));
  return (await response.json()) as IssueResetLinkResponse;
}

export async function consumeTeamPasswordResetLink(token: string, cpf: string, password: string) {
  const response = await fetch(getTeamPasswordResetApi(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "consume", token, cpf, password }),
  });

  if (!response.ok) throw new Error(await readApiError(response));
  return (await response.json()) as { ok: true };
}