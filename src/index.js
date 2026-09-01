export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // =========================
    // HISTORIAL
    // =========================
    if (request.method === "GET" && url.pathname === "/api/history") {
      try {
        const sessionId = url.searchParams.get("sessionId");

        if (!sessionId) {
          return new Response(
            JSON.stringify({
              error: "Falta el sessionId"
            }),
            {
              status: 400,
              headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*"
              }
            }
          );
        }

        const result = await env.DB
          .prepare(
            "SELECT role, content FROM messages WHERE session_id = ? ORDER BY id ASC LIMIT 100"
          )
          .bind(sessionId)
          .all();

        return new Response(
          JSON.stringify({
            messages: result.results
          }),
          {
            status: 200,
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*"
            }
          }
        );
      } catch (error) {
        return new Response(
          JSON.stringify({
            error: "No se pudo cargar la memoria",
            details: String(error)
          }),
          {
            status: 500,
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*"
            }
          }
        );
      }
    }

    // =========================
    // CHAT
    // =========================
    if (request.method === "POST" && url.pathname === "/api/chat") {
      try {
        const body = await request.json();

        const userMessage = body.message;
        const sessionId = body.sessionId;

        if (!userMessage || !sessionId) {
          return new Response(
            JSON.stringify({
              error: "Falta el mensaje o la sesión"
            }),
            {
              status: 400,
              headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*"
              }
            }
          );
        }

        // =========================
        // MEMORIA
        // =========================
        const previous = await env.DB
          .prepare(
            "SELECT role, content FROM messages WHERE session_id = ? ORDER BY id ASC LIMIT 30"
          )
          .bind(sessionId)
          .all();

        const messages = [
          {
            role: "system",
            content: `
Eres Bruce, un asistente personal inteligente.

Responde siempre en español.

Tu personalidad:
- elegante
- inteligente
- tranquila
- directa
- práctica

No inventes información.

Puedes controlar el ordenador mediante estas acciones.

IMPORTANTE:
Cuando el usuario quiera controlar el ordenador, responde ÚNICAMENTE con JSON válido.

FORMATO:

{
  "reply": "mensaje para el usuario",
  "action": {
    "type": "TIPO",
    "target": "OBJETIVO"
  }
}

Si no hay ninguna acción:

{
  "reply": "respuesta normal",
  "action": null
}


====================================================
PÁGINAS WEB
====================================================

YouTube:
{
  "type": "website",
  "target": "youtube"
}

Twitch:
{
  "type": "website",
  "target": "twitch"
}

Spotify:
{
  "type": "website",
  "target": "spotify"
}

Discord:
{
  "type": "website",
  "target": "discord"
}

TikTok:
{
  "type": "website",
  "target": "tiktok"
}

Google:
{
  "type": "website",
  "target": "google"
}

Netflix:
{
  "type": "website",
  "target": "netflix"
}


====================================================
PROGRAMAS
====================================================

Chrome:
{
  "type": "app",
  "target": "chrome"
}

Edge:
{
  "type": "app",
  "target": "edge"
}

Steam:
{
  "type": "app",
  "target": "steam"
}

Bloc de notas:
{
  "type": "app",
  "target": "notepad"
}

Calculadora:
{
  "type": "app",
  "target": "calculator"
}


====================================================
JUEGOS
====================================================

Rocket League:
{
  "type": "game",
  "target": "rocket_league"
}


====================================================
CERRAR
====================================================

Chrome:
{
  "type": "close",
  "target": "chrome"
}

Steam:
{
  "type": "close",
  "target": "steam"
}

Rocket League:
{
  "type": "close",
  "target": "rocket_league"
}

Edge:
{
  "type": "close",
  "target": "edge"
}

Bloc de notas:
{
  "type": "close",
  "target": "notepad"
}


====================================================
EJEMPLOS
====================================================

Usuario:
"abre TikTok"

Respuesta:
{
  "reply": "Abriendo TikTok.",
  "action": {
    "type": "website",
    "target": "tiktok"
  }
}

Usuario:
"ponme Twitch"

Respuesta:
{
  "reply": "Abriendo Twitch.",
  "action": {
    "type": "website",
    "target": "twitch"
  }
}

Usuario:
"abre Spotify"

Respuesta:
{
  "reply": "Abriendo Spotify.",
  "action": {
    "type": "website",
    "target": "spotify"
  }
}

Usuario:
"abre Discord"

Respuesta:
{
  "reply": "Abriendo Discord.",
  "action": {
    "type": "website",
    "target": "discord"
  }
}

Usuario:
"abre Steam"

Respuesta:
{
  "reply": "Abriendo Steam.",
  "action": {
    "type": "app",
    "target": "steam"
  }
}

Usuario:
"inicia Rocket League"

Respuesta:
{
  "reply": "Iniciando Rocket League.",
  "action": {
    "type": "game",
    "target": "rocket_league"
  }
}

Usuario:
"cierra Steam"

Respuesta:
{
  "reply": "Cerrando Steam.",
  "action": {
    "type": "close",
    "target": "steam"
  }
}

Usuario:
"cierra Rocket League"

Respuesta:
{
  "reply": "Cerrando Rocket League.",
  "action": {
    "type": "close",
    "target": "rocket_league"
  }
}

No añadas ningún texto fuera del JSON.
`
          }
        ];

        for (const msg of previous.results) {
          messages.push({
            role: msg.role,
            content: msg.content
          });
        }

        messages.push({
          role: "user",
          content: userMessage
        });

        // Guardar mensaje del usuario
        await env.DB
          .prepare(
            "INSERT INTO messages (session_id, role, content) VALUES (?, ?, ?)"
          )
          .bind(sessionId, "user", userMessage)
          .run();

        // =========================
        // IA
        // =========================
        const result = await env.AI.run(
          "@cf/openai/gpt-oss-20b",
          {
            messages: messages,
            max_tokens: 1024
          }
        );

        let answer = "";

        if (
          result &&
          result.choices &&
          result.choices.length > 0 &&
          result.choices[0].message &&
          result.choices[0].message.content
        ) {
          answer = result.choices[0].message.content;
        }

        if (!answer) {
          console.error(
            "Bruce no pudo extraer el texto de la IA:",
            JSON.stringify(result)
          );

          answer = JSON.stringify({
            reply: "He tenido un problema procesando la respuesta.",
            action: null
          });
        }

        // =========================
        // INTERPRETAR JSON
        // =========================
        let parsed;

        try {
          parsed = JSON.parse(answer);
        } catch (error) {
          parsed = {
            reply: answer,
            action: null
          };
        }

        const reply = parsed.reply || answer;
        const action = parsed.action || null;

        // Guardar respuesta de Bruce
        await env.DB
          .prepare(
            "INSERT INTO messages (session_id, role, content) VALUES (?, ?, ?)"
          )
          .bind(sessionId, "assistant", reply)
          .run();

        // =========================
        // RESPUESTA
        // =========================
        return new Response(
          JSON.stringify({
            response: reply,
            action: action
          }),
          {
            status: 200,
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*"
            }
          }
        );

      } catch (error) {
        return new Response(
          JSON.stringify({
            error: "Error en Bruce",
            details: String(error)
          }),
          {
            status: 500,
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*"
            }
          }
        );
      }
        }

    if (env.ASSETS) {
      return env.ASSETS.fetch(request);
    }

    return new Response("Bruce está funcionando.", {
      status: 200,
      headers: {
        "Content-Type": "text/plain"
      }
    });
  }
};
