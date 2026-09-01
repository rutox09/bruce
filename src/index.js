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

También puedes controlar el ordenador del usuario.

IMPORTANTE:
Cuando el usuario pida una acción del ordenador, responde ÚNICAMENTE con JSON válido.

El formato es:

{
  "reply": "mensaje para el usuario",
  "action": {
    "type": "TIPO",
    "target": "OBJETIVO"
  }
}

Si no hay ninguna acción de ordenador:

{
  "reply": "respuesta normal",
  "action": null
}

ACCIONES PARA ABRIR PROGRAMAS:

Chrome:
{
  "type": "open",
  "target": "chrome"
}

Edge:
{
  "type": "open",
  "target": "edge"
}

Bloc de notas:
{
  "type": "open",
  "target": "notepad"
}

Calculadora:
{
  "type": "open",
  "target": "calculator"
}

Spotify:
{
  "type": "open",
  "target": "spotify"
}

Discord:
{
  "type": "open",
  "target": "discord"
}

ACCIONES PARA ABRIR PÁGINAS:

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

Google:
{
  "type": "website",
  "target": "google"
}

Spotify web:
{
  "type": "website",
  "target": "spotify"
}

Discord web:
{
  "type": "website",
  "target": "discord"
}

ACCIONES PARA CERRAR PROGRAMAS:

Chrome:
{
  "type": "close",
  "target": "chrome"
}

Spotify:
{
  "type": "close",
  "target": "spotify"
}

Discord:
{
  "type": "close",
  "target": "discord"
}

Edge:
{
  "type": "close",
  "target": "edge"
}

Ejemplos:

Usuario:
"abre Spotify"

Respuesta:
{
  "reply": "Abriendo Spotify.",
  "action": {
    "type": "open",
    "target": "spotify"
  }
}

Usuario:
"abre Twitch"

Respuesta:
{
  "reply": "Abriendo Twitch.",
  "action": {
    "type": "website",
    "target": "twitch"
  }
}

Usuario:
"abre Discord"

Respuesta:
{
  "reply": "Abriendo Discord.",
  "action": {
    "type": "open",
    "target": "discord"
  }
}

Usuario:
"cierra Spotify"

Respuesta:
{
  "reply": "Cerrando Spotify.",
  "action": {
    "type": "close",
    "target": "spotify"
  }
}

Usuario:
"cierra Discord"

Respuesta:
{
  "reply": "Cerrando Discord.",
  "action": {
    "type": "close",
    "target": "discord"
  }
}

Usuario:
"cierra Chrome"

Respuesta:
{
  "reply": "Cerrando Chrome.",
  "action": {
    "type": "close",
    "target": "chrome"
  }
}

Usuario:
"qué puedes hacer?"

Respuesta:
{
  "reply": "Puedo ayudarte con diferentes tareas y también controlar algunas funciones de tu ordenador.",
  "action": null
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
