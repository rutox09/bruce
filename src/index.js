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
          String(body.text || "").trim();


        if (!text) {

          return new Response(
            "Falta el texto",
            {
              status: 400
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

                text: text,

                model_id:
                  "eleven_multilingual_v2",

                language_code:
                  "es",

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

Tu personalidad es:
- elegante
- inteligente
- tranquila
- directa
- práctica

No inventes información.

Puedes controlar el ordenador.

Las páginas web disponibles son:
- YouTube
- Twitch
- Spotify
- Discord
- TikTok
- Google
- Netflix

Las aplicaciones disponibles son:
- Chrome
- Edge
- Steam
- Epic Games
- Bloc de notas
- Calculadora

El juego disponible es:
- Rocket League

Cuando el usuario haga una petición de control del ordenador,
devuelve una acción.

No escribas explicaciones sobre las acciones.
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
        // GUARDAR MENSAJE
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


        const wantsClose =
          /\b(cierra|cerrar|cerrame|cierra la|cierra el|cerrar la|cerrar el)\b/
            .test(text);


        const wantsOpen =
          /\b(abre|abrir|abrirme|pon|poner|ponme|inicia|iniciar|ejecuta|juega)\b/
            .test(text);


        // =================================================
        // CERRAR
        // =================================================

        if (wantsClose) {

          for (
            const [id, aliases]
            of Object.entries(websites)
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


          for (
            const [id, aliases]
            of Object.entries(apps)
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


          for (
            const [id, aliases]
            of Object.entries(games)
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
        }


        // =================================================
        // ABRIR
        // =================================================

        if (wantsOpen) {

          for (
            const [id, aliases]
            of Object.entries(websites)
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


          for (
            const [id, aliases]
            of Object.entries(apps)
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


          for (
            const [id, aliases]
            of Object.entries(games)
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
        }
// =================================================
// CONTROL DEL ORDENADOR
// =================================================

if (
  text.includes("apaga el ordenador") ||
  text.includes("apaga el pc") ||
  text.includes("apagar el ordenador") ||
  text.includes("apagar el pc")
) {

  actions.push({
    type: "shutdown_pc"
  });

  reply =
    "Apagando el ordenador en 30 segundos.";
}


if (
  text.includes("cancela el apagado") ||
  text.includes("cancelar el apagado") ||
  text.includes("cancela el apagado del ordenador")
) {

  actions.push({
    type: "cancel_shutdown"
  });

  reply =
    "He cancelado el apagado.";
}


if (
  text === "cierra bruce" ||
  text === "cerrar bruce" ||
  text.includes("detén bruce") ||
  text.includes("detener bruce") ||
  text.includes("apaga bruce")
) {

  actions.push({
    type: "stop_agent"
  });

  reply =
    "Cerrando Bruce.";
}

        // =================================================
        // SI HAY ACCIONES
        // =================================================

        if (
          actions.length > 0
        ) {

          const names =
            actions.map(
              action =>
                action.target
            );


          const verb =
            wantsClose
              ? "Cerrando"
              : "Abriendo";


          const reply =
            `${verb} ${names.join(", ")}.`;


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
