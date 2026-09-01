export default {
async fetch(request, env) {


if (request.method === "POST") {

  try {

    const body = await request.json();

    const userMessage = body.message;
    const sessionId = body.sessionId;

    if (!userMessage) {
      return new Response(
        JSON.stringify({
          error: "No has enviado ningún mensaje"
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json"
          }
        }
      );
    }

    if (!sessionId) {
      return new Response(
        JSON.stringify({
          error: "Falta el identificador de sesión"
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json"
          }
        }
      );
    }

    const previousMessages = await env.DB
      .prepare(
        "SELECT role, content FROM messages WHERE session_id = ? ORDER BY id ASC LIMIT 30"
      )
      .bind(sessionId)
      .all();

    const messages = [
      {
        role: "system",
        content:
          "Eres Bruce, un asistente personal inteligente. Responde siempre en español. Tu personalidad es elegante, inteligente, tranquila y directa. Sé útil y práctico. No inventes información. Si no sabes algo, dilo claramente."
      }
    ];

    for (const message of previousMessages.results) {
      messages.push({
        role: message.role,
        content: message.content
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

    let answer = result;

    if (
      typeof result === "object" &&
      result !== null &&
      result.response
    ) {
      answer = result.response;
    }

    await env.DB
      .prepare(
        "INSERT INTO messages (session_id, role, content) VALUES (?, ?, ?)"
      )
      .bind(sessionId, "assistant", String(answer))
      .run();

    return new Response(
      JSON.stringify({
        response: answer
      }),
      {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        }
      }
    );

  } catch (error) {

    return new Response(
      JSON.stringify({
        error: "Error al ejecutar a Bruce",
        details: String(error)
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json"
        }
      }
    );
  }
}

return env.ASSETS.fetch(request);


}
};
