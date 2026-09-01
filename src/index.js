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
          url.searchParams.get(
            "sessionId"
          );


        if (!sessionId) {

          return new Response(
            JSON.stringify({
              error:
                "Falta el sessionId"
            }),
            {
              status: 400,
              headers: {
                "Content-Type":
                  "application/json",

                "Access-Control-Allow-Origin":
                  "*"
              }
            }
          );
        }


        const result =
          await env.DB
            .prepare(
              "SELECT role, content FROM messages WHERE session_id = ? ORDER BY id ASC LIMIT 100"
            )
            .bind(sessionId)
            .all();


        return new Response(
          JSON.stringify({
            messages:
              result.results
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

        return new Response(
          JSON.stringify({
            error:
              "No se pudo cargar la memoria",

            details:
              String(error)
          }),
          {
            status: 500,
            headers: {
              "Content-Type":
                "application/json"
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

        const body =
          await request.json();


        const userMessage =
          String(
            body.message || ""
          ).trim();


        const sessionId =
          body.sessionId;


        if (
          !userMessage ||
          !sessionId
        ) {

          return new Response(
            JSON.stringify({
              error:
                "Falta el mensaje o la sesión"
            }),
            {
              status: 400,

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
        // MEMORIA
        // =================================================

        const previous =
          await env.DB
            .prepare(
              "SELECT role, content FROM messages WHERE session_id = ? ORDER BY id ASC LIMIT 30"
            )
            .bind(
              sessionId
            )
            .all();


        const messages = [

          {
            role:
              "system",

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

Puedes controlar el ordenador.

Si el usuario pide una acción del ordenador,
la aplicación puede ejecutarla.

Si la petición no requiere una acción,
responde normalmente.

Las páginas web disponibles son:
- YouTube
- Twitch
- Spotify
- Discord
- TikTok
- Google
- Netflix

Aplicaciones disponibles:
- Chrome
- Edge
- Steam
- Epic Games
- Bloc de notas
- Calculadora

Juego disponible:
- Rocket League
`
          }
        ];


        for (
          const msg
          of previous.results
        ) {

          messages.push({
            role:
              msg.role,

            content:
              msg.content
          });
        }


        messages.push({
          role:
            "user",

          content:
            userMessage
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
        // DETECCIÓN DIRECTA
        // =================================================

        const text =
          userMessage
            .toLowerCase()
            .normalize("NFD")
            .replace(
              /[\u0300-\u036f]/g,
              ""
            );


        const websites = {

          youtube: [
            "youtube",
            "you tube"
          ],

          twitch: [
            "twitch"
          ],

          spotify: [
            "spotify"
          ],

          discord: [
            "discord"
          ],

          tiktok: [
            "tiktok",
            "tik tok"
          ],

          google: [
            "google"
          ],

          netflix: [
            "netflix"
          ]
        };


        const apps = {

          chrome: [
            "chrome",
            "google chrome"
          ],

          edge: [
            "edge",
            "microsoft edge"
          ],

          steam: [
            "steam"
          ],

          epic: [
            "epic",
            "epic games"
          ],

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


        const actions = [];


        // =================================================
        // DETECTAR TIPO DE ORDEN
        // =================================================

        const wantsClose =
          /\b(cierra|cerrar|cerrame|cierra la|cierra el|cerrar la|cerrar el)\b/
            .test(text);


        const wantsOpen =
          /\b(abre|abrir|abrirme|pon|poner|ponme|inicia|iniciar|ejecuta|juega)\b/
            .test(text);


        // =================================================
        // CERRAR WEBS
        // =================================================

        if (wantsClose) {

          for (
            const [id, aliases]
            of Object.entries(
              websites
            )
          ) {

            if (
              aliases.some(
                alias =>
                  text.includes(alias)
              )
            ) {

              actions.push({

                type:
                  "close_website",

                target:
                  id

              });
            }
          }


          // =================================================
          // CERRAR APPS
          // =================================================

          for (
            const [id, aliases]
            of Object.entries(
              apps
            )
          ) {

            if (
              aliases.some(
                alias =>
                  text.includes(alias)
              )
            ) {

              actions.push({

                type:
                  "close",

                target:
                  id

              });
            }
          }


          // =================================================
          // CERRAR JUEGOS
          // =================================================

          for (
            const [id, aliases]
            of Object.entries(
              games
            )
          ) {

            if (
              aliases.some(
                alias =>
                  text.includes(alias)
              )
            ) {

              actions.push({

                type:
                  "close",

                target:
                  id

              });
            }
          }


          if (
            actions.length > 0
          ) {

            const names =
              [];


            for (
              const action
              of actions
            ) {

              names.push(
                action.target
              );
            }


            const readable =
              names.join(", ");


            const reply =
              `Cerrando ${readable}.`;


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

                response:
                  reply,

                actions:
                  actions

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
        }


        // =================================================
        // ABRIR
        // =================================================

        if (wantsOpen) {

          // -----------------------------------------------
          // WEBSITES
          // -----------------------------------------------

          for (
            const [id, aliases]
            of Object.entries(
              websites
            )
          ) {

            if (
              aliases.some(
                alias =>
                  text.includes(alias)
              )
            ) {

              actions.push({

                type:
                  "website",

                target:
                  id

              });
            }
          }


          // -----------------------------------------------
          // APPS
          // -----------------------------------------------

          for (
            const [id, aliases]
            of Object.entries(
              apps
            )
          ) {

            if (
              aliases.some(
                alias =>
                  text.includes(alias)
              )
            ) {

              actions.push({

                type:
                  "app",

                target:
                  id

              });
            }
          }


          // -----------------------------------------------
          // JUEGOS
          // -----------------------------------------------

          for (
            const [id, aliases]
            of Object.entries(
              games
            )
          ) {

            if (
              aliases.some(
                alias =>
                  text.includes(alias)
              )
            ) {

              actions.push({

                type:
                  "game",

                target:
                  id

              });
            }
          }


          if (
            actions.length > 0
          ) {

            const names =
              actions.map(
                action =>
                  action.target
              );


            const reply =
              `Abriendo ${names.join(", ")}.`;


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

                response:
                  reply,

                actions:
                  actions

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
        }


        // =================================================
        // IA
        // =================================================

        const result =
          await env.AI.run(
            "@cf/openai/gpt-oss-20b",
            {

              messages:
                messages,

              max_tokens:
                1024
            }
          );


        let answer =
          "";


        if (
          result &&
          result.choices &&
          result.choices.length > 0 &&
          result.choices[0].message
        ) {

          answer =
            result
              .choices[0]
              .message
              .content || "";
        }


        if (!answer) {

          answer =
            "He tenido un problema procesando la respuesta.";
        }


        // =================================================
        // GUARDAR RESPUESTA
        // =================================================

        await env.DB
          .prepare(
            "INSERT INTO messages (session_id, role, content) VALUES (?, ?, ?)"
          )
          .bind(
            sessionId,
            "assistant",
            answer
          )
          .run();


        return new Response(
          JSON.stringify({

            response:
              answer,

            actions:
              []

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

            error:
              "Error en Bruce",

            details:
              String(error)

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

      return env.ASSETS.fetch(
        request
      );
    }


    return new Response(
      "Bruce está funcionando.",
      {
        status: 200,
        headers: {
          "Content-Type":
            "text/plain"
        }
      }
    );
  }
};
