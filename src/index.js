export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // =====================================================
    // HISTORIAL
    // =====================================================

    if (
      request.method === "GET" &&
      url.pathname === "/api/history"
    ) {
      try {
        const sessionId =
          url.searchParams.get("sessionId");

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

    // =====================================================
    // CHAT
    // =====================================================

    if (
      request.method === "POST" &&
      url.pathname === "/api/chat"
    ) {
      try {
        const body = await request.json();

        const userMessage =
          String(body.message || "").trim();

        const sessionId =
          body.sessionId;

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

        // =================================================
        // MEMORIA
        // =================================================

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
Tu personalidad es elegante, inteligente, tranquila y directa.

No inventes información.

Puedes conversar normalmente y también controlar el ordenador.

IMPORTANTE:
Si el usuario pide una acción del ordenador, responde SOLO con JSON válido.

Formato:

{
  "reply": "mensaje",
  "action": {
    "type": "TIPO",
    "target": "OBJETIVO"
  }
}

Si no hay acción:

{
  "reply": "respuesta",
  "action": null
}

No uses Markdown.
No uses bloques de código.
No escribas nada fuera del JSON.

Acciones:

Páginas web:
type = website

targets:
youtube
twitch
spotify
discord
tiktok
google
netflix

Cerrar páginas:
type = close_website

targets:
youtube
twitch
spotify
discord
tiktok
google
netflix

Aplicaciones:
type = app

targets:
chrome
edge
steam
notepad
calculator

Juegos:
type = game

targets:
rocket_league

Cerrar aplicaciones y juegos:
type = close

targets:
chrome
edge
steam
notepad
calculator
rocket_league
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

        // =================================================
        // GUARDAR USUARIO
        // =================================================

        await env.DB
          .prepare(
            "INSERT INTO messages (session_id, role, content) VALUES (?, ?, ?)"
          )
          .bind(
            sessionId,
            "user",
            userMessage
          )
          .run();

        // =================================================
        // DETECCIÓN DIRECTA DE ÓRDENES
        // =================================================

        const text =
          userMessage
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "");

        const websites = {
          youtube: ["youtube", "you tube"],
          twitch: ["twitch"],
          spotify: ["spotify"],
          discord: ["discord"],
          tiktok: ["tiktok", "tik tok"],
          google: ["google"],
          netflix: ["netflix"]
        };

        const apps = {
          chrome: ["chrome", "google chrome"],
          edge: ["edge", "microsoft edge"],
          steam: ["steam"],
          notepad: [
            "bloc de notas",
            "notepad"
          ],
          calculator: [
            "calculadora",
            "calculator"
          ]
        };

        const games = {
          rocket_league: [
            "rocket league",
            "rocket"
          ]
        };

        let action = null;
        let reply = null;

        // -------------------------------------------------
        // CERRAR PÁGINA
        // -------------------------------------------------

        const closeWords = [
          "cierra",
          "cerrar",
          "cierra la",
          "cierra el",
          "cerrame",
          "cerrar la",
          "cerrar el"
        ];

        const wantsClose =
          closeWords.some(
            word => text.includes(word)
          );

        if (wantsClose) {

          for (const [id, aliases] of Object.entries(websites)) {

            if (
              aliases.some(
                alias => text.includes(alias)
              )
            ) {
              action = {
                type: "close_website",
                target: id
              };

              reply =
                `Cerrando ${id}.`;

              break;
            }
          }

          // Cerrar aplicación/juego
          if (!action) {

            for (const [id, aliases] of Object.entries(apps)) {

              if (
                aliases.some(
                  alias => text.includes(alias)
                )
              ) {
                action = {
                  type: "close",
                  target: id
                };

                reply =
                  `Cerrando ${id}.`;

                break;
              }
            }
          }

          if (!action) {

            for (const [id, aliases] of Object.entries(games)) {

              if (
                aliases.some(
                  alias => text.includes(alias)
                )
              ) {
                action = {
                  type: "close",
                  target: id
                };

                reply =
                  `Cerrando Rocket League.`;

                break;
              }
            }
          }
        }

        // -------------------------------------------------
        // ABRIR PÁGINA
        // -------------------------------------------------

        if (!action) {

          const openWords = [
            "abre",
            "abrir",
            "pon",
            "poner",
            "entra en",
            "abrirme",
            "ponme"
          ];

          const wantsOpen =
            openWords.some(
              word => text.includes(word)
            );

          if (wantsOpen) {

            for (const [id, aliases] of Object.entries(websites)) {

              if (
                aliases.some(
                  alias => text.includes(alias)
                )
              ) {
                action = {
                  type: "website",
                  target: id
                };

                reply =
                  `Abriendo ${id}.`;

                break;
              }
            }
          }
        }

        // -------------------------------------------------
        // ABRIR APP
        // -------------------------------------------------

        if (!action) {

          const openWords = [
            "abre",
            "abrir",
            "inicia",
            "iniciar",
            "pon",
            "poner",
            "ejecuta"
          ];

          const wantsOpen =
            openWords.some(
              word => text.includes(word)
            );

          if (wantsOpen) {

            for (const [id, aliases] of Object.entries(apps)) {

              if (
                aliases.some(
                  alias => text.includes(alias)
                )
              ) {
                action = {
                  type: "app",
                  target: id
                };

                reply =
                  `Abriendo ${id}.`;

                break;
              }
            }
          }
        }

        // -------------------------------------------------
        // ABRIR JUEGO
        // -------------------------------------------------

        if (!action) {

          const openWords = [
            "abre",
            "abrir",
            "inicia",
            "iniciar",
            "juega",
            "pon"
          ];

          const wantsOpen =
            openWords.some(
              word => text.includes(word)
            );

          if (wantsOpen) {

            for (const [id, aliases] of Object.entries(games)) {

              if (
                aliases.some(
                  alias => text.includes(alias)
                )
              ) {
                action = {
                  type: "game",
                  target: id
                };

                reply =
                  "Iniciando Rocket League.";

                break;
              }
            }
          }
        }

        // =================================================
        // SI ES UNA ORDEN CONOCIDA
        // NO LLAMAMOS A LA IA
        // =================================================

        if (action) {

          await env.DB
            .prepare(
              "INSERT INTO messages (session_id, role, content) VALUES (?, ?, ?)"
            )
            .bind(
              sessionId,
              "assistant",
              reply
            )
            .run();

          return new Response(
            JSON.stringify({
              response: reply,
              action: action
            }),
            {
              status: 200,
              headers: {
                "Content-Type":
                  "application/json",
                "Access-Control-Allow-Origin":
                  "*"
              }
            }
          );
        }

        // =================================================
        // IA PARA CONVERSACIÓN NORMAL
        // =================================================

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
          result.choices[0].message
        ) {
          answer =
            result.choices[0].message.content || "";
        }

        if (!answer) {
          answer =
            "He tenido un problema procesando la respuesta.";
        }

        let parsed;

        try {
          parsed = JSON.parse(
            answer
              .replace(/^```json\s*/i, "")
              .replace(/^```\s*/i, "")
              .replace(/```\s*$/i, "")
              .trim()
          );
        } catch {
          parsed = {
            reply: answer,
            action: null
          };
        }

        reply =
          parsed.reply ||
          answer;

        action =
          parsed.action ||
          null;

        await env.DB
          .prepare(
            "INSERT INTO messages (session_id, role, content) VALUES (?, ?, ?)"
          )
          .bind(
            sessionId,
            "assistant",
            reply
          )
          .run();

        return new Response(
          JSON.stringify({
            response: reply,
            action: action
          }),
          {
            status: 200,
            headers: {
              "Content-Type":
                "application/json",
              "Access-Control-Allow-Origin":
                "*"
            }
          }
        );

      } catch (error) {

        console.error(
          "ERROR BRUCE:",
          error
        );

        return new Response(
          JSON.stringify({
            error: "Error en Bruce",
            details: String(error)
          }),
          {
            status: 500,
            headers: {
              "Content-Type":
                "application/json",
              "Access-Control-Allow-Origin":
                "*"
            }
          }
        );
      }
    }

    // =====================================================
    // ASSETS
    // =====================================================

    if (env.ASSETS) {
      return env.ASSETS.fetch(request);
    }

    return new Response(
      "Bruce está funcionando.",
      {
        status: 200,
        headers: {
          "Content-Type": "text/plain"
        }
      }
    );
  }
};
