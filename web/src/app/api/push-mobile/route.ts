/**
 * Proxy same-origin pro Expo Push API — pedido de 14/08/2026 ("quero
 * fazer no plano gratuito"). Sem Blaze não dá pra usar Cloud Functions,
 * e chamar https://exp.host direto do navegador esbarra em CORS (o
 * preflight OPTIONS passa, mas o POST de verdade é bloqueado — testado
 * e confirmado). Uma API Route do Next.js roda no servidor mesmo em
 * hospedagem gratuita (não depende de Firebase/Blaze nenhum), então o
 * POST pro Expo sai servidor-a-servidor, sem CORS.
 */
export async function POST(req: Request) {
  const { tokens, titulo, corpo, dados } = (await req.json()) as {
    tokens?: string[];
    titulo?: string;
    corpo?: string;
    dados?: Record<string, string>;
  };

  if (!tokens?.length || !titulo || !corpo) {
    return Response.json({ erro: "Informe tokens, titulo e corpo." }, { status: 400 });
  }

  const resposta = await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify(tokens.map((to) => ({ to, sound: "default", title: titulo, body: corpo, data: dados ?? {} }))),
  });

  const corpoResposta = await resposta.text();
  return new Response(corpoResposta, {
    status: resposta.status,
    headers: { "Content-Type": "application/json" },
  });
}
