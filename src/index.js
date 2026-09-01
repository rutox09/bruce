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

Además, puedes controlar determinadas funciones del ordenador.

Cuando el usuario quiera realizar una acción en el ordenador, debes devolver un JSON EXACTAMENTE con este formato:

{
  "reply": "texto que verá el usuario",
  "action": {
    "type": "open",
    "target": "chrome"
  }
}

Acciones permitidas:

Abrir programas:
- chrome
- edge
- notepad
- calculator

Abrir páginas:
{
  "type": "website",
  "target": "youtube"
}

Páginas permitidas:
- youtube
- google
- spotify

Si el usuario NO quiere realizar una acción del ordenador, utiliza:

{
  "reply": "tu respuesta normal",
  "action": null
}

No añadas ningún texto fuera del JSON.

Ejemplos:

Usuario:
"abre Chrome"

Respuesta:
{
  "reply": "Abriendo Chrome.",
  "action": {
    "type": "open",
    "target": "chrome"
  }
}

Usuario:
"abre YouTube"

Respuesta:
{
  "reply": "Abriendo YouTube.",
  "action": {
    "type": "website",
    "target": "youtube"
  }
}

Usuario:
"qué tiempo hace?"

Respuesta:
{
  "reply": "No puedo consultar el tiempo actual desde aquí.",
  "action": null
}
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

    return env.ASSETS.fetch(request);
  }
};
