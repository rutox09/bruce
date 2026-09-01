export default {
  async fetch(request, env) {
    const url = new URL(request.url);

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
                "Content-Type": "application/json"
              }
            }
          );
        }

        const previous = await env.DB
          .prepare(
            "SELECT role, content FROM messages WHERE session_id = ? ORDER BY id ASC LIMIT 30"
          )
          .bind(sessionId)
          .all();

        const messages = [
          {
            role: "system",
            content:
              "Eres Bruce, un asistente personal inteligente. Responde siempre en español. Sé claro, inteligente, directo y útil. No inventes información."
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

        await env.DB
          .prepare(
            "INSERT INTO messages (session_id, role, content) VALUES (?, ?, ?)"
          )
          .bind(sessionId, "user", userMessage)
          .run();

        const result = await env.AI.run(
          "@cf/openai/gpt-oss-20b",
          {
            messages: messages
          }
        );

        let answer = "";

if (typeof result === "string") {
  answer = result;
} else if (result && result.response) {
  answer = result.response;
} else if (result && result.output_text) {
  answer = result.output_text;
} else if (result && result.choices && result.choices[0]) {
  const choice = result.choices[0];

  if (choice.message && choice.message.content) {
    answer = choice.message.content;
  } else if (choice.text) {
    answer = choice.text;
  }
}

if (!answer) {
  answer = "No he podido obtener una respuesta de la IA.";
}

        await env.DB
          .prepare(
            "INSERT INTO messages (session_id, role, content) VALUES (?, ?, ?)"
          )
          .bind(sessionId, "assistant", answer)
          .run();

        return new Response(
          JSON.stringify({
            response: answer
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
