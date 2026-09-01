export default {
async fetch(request, env) {
if (request.method === "POST") {
try {
const body = await request.json();
const userMessage = body.message;

```
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

    const messages = [
      {
        role: "system",
        content: "Eres Bruce, un asistente personal inteligente. Responde siempre en español. Tu personalidad es elegante, inteligente, tranquila y directa. Sé útil y práctico. No inventes información. Si no sabes algo, dilo claramente."
      },
      {
        role: "user",
        content: userMessage
      }
    ];

    const result = await env.AI.run(
      "@cf/openai/gpt-oss-20b",
      {
        messages: messages
      }
    );

    return new Response(
      JSON.stringify({
        response: result
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
```

}
};
