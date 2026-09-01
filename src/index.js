export default {
async fetch(request, env) {
const url = new URL(request.url);


// Cargar conversación anterior
if (request.method === "GET" && url.pathname === "/api/history") {
  try {
    const sessionId = url.searchParams.get("sessionId");

    if (!sessionId) {
      return new Response(
        JSON.stringify({ error: "Falta el sessionId" }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json"
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
          "Content-Type": "application/json"
        }
      }
    );
  }
}

// Chat con Bruce
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
          "Eres Bruce, un asistente personal inteligente. Responde siempre en español. Tu personalidad es elegante, inteligente, tranquila y directa. Sé útil, práctico y claro. No inventes información. Si no sabes algo, dilo claramente."
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

  answer = "He tenido un problema procesando la respuesta. Inténtalo de nuevo.";
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
