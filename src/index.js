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


        const result =
          await env.DB
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
            error:
              "No se pudo cargar la memoria",
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
    // VOZ DE BRUCE - ELEVENLABS
    // =====================================================

    if (
      request.method === "POST" &&
      url.pathname === "/api/speak"
    ) {

      try {

        const body =
          await request.json();


        const text =
          String(
            body.text || ""
          ).trim();


        if (!text) {

          return new Response(
            JSON.stringify({
              error:
                "Falta el texto"
            }),
            {
              status: 400,
              headers: {
                "Content-Type":
                  "application/json"
              }
            }
          );
        }


        if (!env.ELEVENLABS_API_KEY) {

          return new Response(
            JSON.stringify({
              error:
                "Falta ELEVENLABS_API_KEY"
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


        if (!env.ELEVENLABS_VOICE_ID) {

          return new Response(
            JSON.stringify({
              error:
                "Falta ELEVENLABS_VOICE_ID"
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


        const elevenResponse =
          await fetch(
            `https://api.elevenlabs.io/v1/text-to-speech/${env.ELEVENLABS_VOICE_ID}?output_format=mp3_44100_128`,
            {
              method: "POST",

              headers: {
                "xi-api-key":
                  env.ELEVENLABS_API_KEY,

                "Content-Type":
                  "application/json"
              },

              body: JSON.stringify({

                text:

                  text,

                model_id:
                  "eleven_multilingual_v2",

                voice_settings: {

                  stability:
                    0.45,

                  similarity_boost:
                    0.85,

                  style:
                    0.35,

                  use_speaker_boost:
                    true
                }
              })
            }
          );


        if (!elevenResponse.ok) {

          const errorText =
            await elevenResponse.text();


          console.error(
            "ElevenLabs error:",
            elevenResponse.status,
            errorText
          );


          return new Response(
            JSON.stringify({

              error:
                "ElevenLabs devolvió un error",

              status:
                elevenResponse.status,

              details:
                errorText

            }),
            {
              status: 502,

              headers: {
                "Content-Type":
                  "application/json"
              }
            }
          );
        }


        const audio =
          await elevenResponse.arrayBuffer();


        return new Response(
          audio,
          {
            status: 200,

            headers: {

              "Content-Type":
                "audio/mpeg",

              "Cache-Control":
                "no-store",

              "Access-Control-Allow-Origin":
                "*"
            }
          }
        );


      } catch (error) {

        console.error(
          "ERROR ELEVENLABS:",
          error
        );


        return new Response(
          JSON.stringify({

            error:
              "No se pudo generar la voz",

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

Tu personalidad es elegante, inteligente, tranquila, directa y práctica.

Puedes conversar normalmente.

También puedes controlar el ordenador.

Funciones disponibles:

PÁGINAS WEB:
- YouTube
- Twitch
- Spotify
- Discord
- TikTok
- Google
- Netflix

APLICACIONES:
- Chrome
- Edge
- Steam
- Epic Games
- Bloc de notas
- Calculadora

JUEGOS:
- Rocket League

ACCIONES DEL SISTEMA:
- apagar ordenador
- cancelar apagado
- dormir Bruce
- despertar Bruce

La aplicación puede interpretar directamente las órdenes sencillas de control del ordenador.
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
        // GUARDAR MENSAJE DEL USUARIO
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
        // NORMALIZAR TEXTO
        // =================================================

        const text =
          userMessage
            .toLowerCase()
            .normalize("NFD")
            .replace(
              /[\u0300-\u036f]/g,
              ""
            );


        // =================================================
        // CONFIGURACIÓN
        // =================================================

        const websites = {

          youtube: [
            "youtube",
            "you tube"
          ],

          twitch: [
            "twitch",
            "twich"
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


        let reply = "";


        // =================================================
        // INTENCIONES
        // =================================================

        const wantsClose =
          /\b(
            cierra|
            cerrar|
            cerrame|
            cierra la|
            cierra el|
            cerrar la|
            cerrar el|
            apaga|
            apagar|
            detén|
            deten|
            detener|
            duerme|
            dormir
          )\b/x.test(text);


        const wantsOpen =
          /\b(
            abre|
            abrir|
            abrime|
            abrirme|
            pon|
            poner|
            ponme|
            inicia|
            iniciar|
            ejecuta|
            ejecutar|
            juega|
            jugar
          )\b/x.test(text);


        // =================================================
        // APAGAR PC
        // =================================================

        if (
          text.includes(
            "apaga el ordenador"
          ) ||
          text.includes(
            "apaga el pc"
          ) ||
          text.includes(
            "apagar el ordenador"
          ) ||
          text.includes(
            "apagar el pc"
          )
        ) {

          actions.push({

            type:
              "shutdown_pc"
          });


          reply =
            "Apagando el ordenador en 30 segundos.";
        }


        // =================================================
        // CANCELAR APAGADO
        // =================================================

        else if (
          text.includes(
            "cancela el apagado"
          ) ||
          text.includes(
            "cancelar el apagado"
          ) ||
          text.includes(
            "cancela el apagado del ordenador"
          )
        ) {

          actions.push({

            type:
              "cancel_shutdown"
          });


          reply =
            "He cancelado el apagado.";
        }


        // =================================================
        // DORMIR BRUCE
        // =================================================

        else if (
          text === "duerme bruce" ||
          text === "dormir bruce" ||
          text === "duerme" ||
          text.includes("pon a bruce a dormir") ||
          text.includes("pon bruce a dormir") ||
          text.includes("apaga bruce")
        ) {

          actions.push({

            type:
              "stop_agent"
          });


          reply =
            "Entrando en modo reposo.";
        }


        // =================================================
        // DESPERTAR BRUCE
        // =================================================

        else if (
          text === "despierta bruce" ||
          text === "despertar bruce" ||
          text === "enciende bruce" ||
          text === "encender bruce" ||
          text === "despierta"
        ) {

          actions.push({

            type:
              "wake_agent"
          });


          reply =
            "Bruce está activo de nuevo.";
        }


        // =================================================
        // CERRAR PÁGINAS
        // =================================================

        else if (wantsClose) {

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
              actions
                .map(
                  action =>
                    action.target
                )
                .filter(Boolean);


            if (
              names.length === 1
            ) {

              reply =
                `Cerrando ${names[0]}.`;

            } else {

              reply =
                `Cerrando ${names.join(", ")}.`;
            }
          }
        }


        // =================================================
        // ABRIR
        // =================================================

        if (
          wantsOpen &&
          !text.includes(
            "apaga"
          )
        ) {

          // -------------------------------------------------
          // PÁGINAS
          // -------------------------------------------------

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

              const exists =
                actions.some(
                  action =>
                    action.target === id
                );


              if (!exists) {

                actions.push({

                  type:
                    "website",

                  target:
                    id
                });
              }
            }
          }


          // -------------------------------------------------
          // APPS
          // -------------------------------------------------

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

              const exists =
                actions.some(
                  action =>
                    action.target === id
                );


              if (!exists) {

                actions.push({

                  type:
                    "app",

                  target:
                    id
                });
              }
            }
          }


          // -------------------------------------------------
          // JUEGOS
          // -------------------------------------------------

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

              const exists =
                actions.some(
                  action =>
                    action.target === id
                );


              if (!exists) {

                actions.push({

                  type:
                    "game",

                  target:
                    id
                });
              }
            }
          }


          if (
            actions.length > 0 &&
            !reply
          ) {

            const names =
              actions.map(
                action =>
                  action.target
              );


            reply =
              `Abriendo ${names.join(", ")}.`;
          }
        }


        // =================================================
        // SI HAY ACCIONES
        // =================================================

        if (
          actions.length > 0
        ) {

          if (!reply) {

            reply =
              "Ejecutando la orden.";
          }


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


        // =================================================
        // IA PARA CONVERSACIÓN NORMAL
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
