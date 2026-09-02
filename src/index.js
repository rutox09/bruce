/* =========================================================
   BRUCE - CLOUDFLARE WORKER
========================================================= */

export interface Env {
  AI: Ai;
  DB: D1Database;
  ELEVENLABS_API_KEY?: string;
  ELEVENLABS_VOICE_ID?: string;
}


/* =========================================================
   UTILIDADES
========================================================= */

function normalizeText(text) {

  if (!text) {
    return "";
  }

  return String(text)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}


function includesAny(text, values) {

  return values.some(
    (value) =>
      text.includes(
        normalizeText(value)
      )
  );
}


/* =========================================================
   CORS
========================================================= */

function corsHeaders() {

  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
      "Content-Type",
    "Access-Control-Allow-Methods":
      "GET, POST, OPTIONS",
  };
}


function jsonResponse(
  data,
  status = 200
) {

  return new Response(
    JSON.stringify(
      data,
      null,
      2
    ),
    {
      status,
      headers: {
        "Content-Type":
          "application/json; charset=utf-8",
        ...corsHeaders(),
      },
    }
  );
}


/* =========================================================
   DETECTAR CIERRE
========================================================= */

function wantsClose(text) {

  const normalized =
    normalizeText(text);

  return includesAny(
    normalized,
    [
      "cierra",
      "cerrar",
      "cerrame",
      "cerrarme",
      "termina",
      "terminar",
      "deten",
      "detener",
      "quita",
      "quitar",
    ]
  );
}


/* =========================================================
   DETECTAR ACCIONES DEL SISTEMA
========================================================= */

function detectSystemAction(text) {

  const normalized =
    normalizeText(text);


  // -------------------------------------------------------
  // POWERSHELL
  // -------------------------------------------------------

  if (
    includesAny(
      normalized,
      [
        "cierra powershell",
        "cerrar powershell",
        "cierra el powershell",
        "cerrar el powershell",
        "cierra power shell",
        "cerrar power shell",
      ]
    )
  ) {

    return {
      type: "command",
      command:
        "cierra powershell",
    };
  }


  // -------------------------------------------------------
  // REINICIAR AGENTE
  // -------------------------------------------------------

  if (
    includesAny(
      normalized,
      [
        "reinicia el agente",
        "reiniciar el agente",
        "reinicia bruce",
        "reiniciar bruce",
        "reinicia el bruce",
        "reiniciar el bruce",
      ]
    )
  ) {

    return {
      type: "command",
      command:
        "reinicia el agente",
    };
  }


  if (
    normalized === "reinicia" ||
    normalized === "reiniciar"
  ) {

    return {
      type: "command",
      command:
        "reinicia el agente",
    };
  }


  // -------------------------------------------------------
  // DORMIR
  // -------------------------------------------------------

  if (
    includesAny(
      normalized,
      [
        "apagate",
        "apagate bruce",
        "duerme",
        "duerme bruce",
        "deten el agente",
        "detener el agente",
        "para el agente",
        "parar el agente",
        "detente",
      ]
    )
  ) {

    return {
      type: "command",
      command:
        "apagate",
    };
  }


  // -------------------------------------------------------
  // DESPERTAR
  // -------------------------------------------------------

  if (
    includesAny(
      normalized,
      [
        "despiertate",
        "despierta bruce",
        "despierta el agente",
        "activa bruce",
        "activar bruce",
        "despertar bruce",
      ]
    )
  ) {

    return {
      type: "command",
      command:
        "despiertate",
    };
  }


  // -------------------------------------------------------
  // APAGAR ORDENADOR
  // -------------------------------------------------------

  if (
    includesAny(
      normalized,
      [
        "apaga el ordenador",
        "apagar el ordenador",
        "apaga el pc",
        "apagar el pc",
        "apaga windows",
      ]
    )
  ) {

    return {
      type: "command",
      command:
        "apaga el ordenador",
    };
  }


  // -------------------------------------------------------
  // CANCELAR APAGADO
  // -------------------------------------------------------

  if (
    includesAny(
      normalized,
      [
        "cancela el apagado",
        "cancelar el apagado",
        "cancela apagado",
        "cancelar apagado",
      ]
    )
  ) {

    return {
      type: "command",
      command:
        "cancela el apagado",
    };
  }


  return null;
}


/* =========================================================
   DETECTAR VARIAS ACCIONES
========================================================= */

function detectMultipleActions(
  message
) {

  if (!message) {
    return [];
  }


  const original =
    String(message).trim();


  // Quitamos "Bruce" únicamente
  // cuando aparece al principio.
  //
  // Bruce, abre YouTube
  // -> abre YouTube

  const clean =
    original
      .replace(
        /^bruce[\s,:-]*/i,
        ""
      )
      .trim();


  if (!clean) {
    return [];
  }


  const normalized =
    normalizeText(clean);


  /* =======================================================
     COMANDOS DEL PROPIO BRUCE
  ======================================================= */

  const systemAction =
    detectSystemAction(
      clean
    );


  if (systemAction) {

    return [
      systemAction
    ];
  }


  /* =======================================================
     ABRIR / CERRAR
  ======================================================= */

  const openWords = [
    "abre",
    "abrir",
    "abrime",
    "abrirme",
    "inicia",
    "iniciar",
    "ejecuta",
    "ejecutar",
    "lanza",
    "lanzar",
    "juega",
    "jugar",
    "arranca",
    "arrancar",
  ];


  const closeWords = [
    "cierra",
    "cerrar",
    "cerrame",
    "cerrarme",
    "termina",
    "terminar",
    "deten",
    "detener",
  ];


  /* =======================================================
     SEPARAR VARIAS ACCIONES
  ======================================================= */

  const parts =
    clean
      .split(/\s+y\s+/i)
      .map(
        (part) =>
          part.trim()
      )
      .filter(Boolean);


  const actions = [];


  for (
    const part
    of parts
  ) {

    const partNormalized =
      normalizeText(part);


    let matched = false;


    // -----------------------------------------------------
    // ABRIR
    // -----------------------------------------------------

    for (
      const word
      of openWords
    ) {

      if (
        partNormalized === word ||
        partNormalized.startsWith(
          word + " "
        )
      ) {

        actions.push({
          type: "command",
          command: part,
        });

        matched = true;
        break;
      }
    }


    if (matched) {
      continue;
    }


    // -----------------------------------------------------
    // CERRAR
    // -----------------------------------------------------

    for (
      const word
      of closeWords
    ) {

      if (
        partNormalized === word ||
        partNormalized.startsWith(
          word + " "
        )
      ) {

        actions.push({
          type: "command",
          command: part,
        });

        matched = true;
        break;
      }
    }
  }


  return actions;
}


/* =========================================================
   DETECT ACTIONS
========================================================= */

function detectActions(
  message
) {

  if (!message) {

    return {
      type: "none",
      actions: [],
    };
  }


  const actions =
    detectMultipleActions(
      message
    );


  if (
    Array.isArray(actions) &&
    actions.length > 0
  ) {

    return {
      type: "command",
      actions,
    };
  }


  return {
    type: "none",
    actions: [],
  };
}


/* =========================================================
   GUARDAR MENSAJE
========================================================= */

async function saveMessage(
  env,
  sessionId,
  role,
  content
) {

  try {

    await env.DB
      .prepare(
        `
        INSERT INTO messages
        (session_id, role, content)
        VALUES (?, ?, ?)
        `
      )
      .bind(
        sessionId,
        role,
        content
      )
      .run();

  } catch (error) {

    console.error(
      "Error guardando mensaje:",
      error
    );

  }
}


/* =========================================================
   HISTORIAL
========================================================= */

async function getHistory(
  env,
  sessionId
) {

  if (!sessionId) {
    return [];
  }


  try {

    const result =
      await env.DB
        .prepare(
          `
          SELECT
            role,
            content
          FROM messages
          WHERE session_id = ?
          ORDER BY rowid ASC
          LIMIT 100
          `
        )
        .bind(
          sessionId
        )
        .all();


    return result.results || [];

  } catch (error) {

    console.error(
      "Error leyendo historial:",
      error
    );

    return [];
  }
}


/* =========================================================
   RESPUESTA IA
========================================================= */

async function generateAIResponse(
  env,
  messages
) {

  try {

    const result =
      await env.AI.run(
        "@cf/openai/gpt-oss-20b",
        {
          messages,
          max_tokens: 1024,
        }
      );


    let content = "";


    if (
      result &&
      typeof result === "object"
    ) {

      if (
        "response" in result
        &&
        typeof result.response === "string"
      ) {

        content =
          result.response;

      } else if (
        "content" in result
        &&
        typeof result.content === "string"
      ) {

        content =
          result.content;

      } else if (
        result.output &&
        typeof result.output === "string"
      ) {

        content =
          result.output;

      } else if (
        result.result &&
        typeof result.result === "string"
      ) {

        content =
          result.result;

      }
    }


    if (!content) {

      return (
        "No he podido generar una respuesta."
      );
    }


    return content.trim();

  } catch (error) {

    console.error(
      "Error Workers AI:",
      error
    );

    throw error;
  }
}


/* =========================================================
   VOZ ELEVENLABS
========================================================= */

async function generateVoice(
  env,
  text
) {

  if (!env.ELEVENLABS_API_KEY) {

    throw new Error(
      "Falta ELEVENLABS_API_KEY"
    );
  }


  if (!env.ELEVENLABS_VOICE_ID) {

    throw new Error(
      "Falta ELEVENLABS_VOICE_ID"
    );
  }


  const url =
    "https://api.elevenlabs.io/v1/text-to-speech/" +
    env.ELEVENLABS_VOICE_ID;


  const response =
    await fetch(
      url,
      {
        method: "POST",

        headers: {
          "xi-api-key":
            env.ELEVENLABS_API_KEY,

          "Content-Type":
            "application/json",

          "Accept":
            "audio/mpeg",
        },

        body: JSON.stringify({

          text,

          model_id:
            "eleven_multilingual_v2",

          output_format:
            "mp3_44100_128",

          voice_settings: {

            stability: 0.45,

            similarity_boost: 0.85,

            style: 0.35,

            use_speaker_boost: true,
          },
        }),
      }
    );


  if (!response.ok) {

    const errorText =
      await response.text();

    throw new Error(
      errorText
    );
  }


  return response;
}


/* =========================================================
   WORKER
========================================================= */

export default {

  async fetch(
    request,
    env
  ) {

    /* =====================================================
       OPTIONS
    ===================================================== */

    if (
      request.method ===
      "OPTIONS"
    ) {

      return new Response(
        null,
        {
          status: 204,
          headers:
            corsHeaders(),
        }
      );
    }


    const url =
      new URL(
        request.url
      );


    /* =====================================================
       FAVICON
    ===================================================== */

    if (
      url.pathname ===
      "/favicon.ico"
    ) {

      return new Response(
        null,
        {
          status: 204,
          headers:
            corsHeaders(),
        }
      );
    }


    /* =====================================================
       HISTORIAL
    ===================================================== */

    if (
      request.method === "GET" &&
      url.pathname === "/api/history"
    ) {

      const sessionId =
        url.searchParams.get(
          "sessionId"
        );


      if (!sessionId) {

        return jsonResponse(
          {
            error:
              "Falta sessionId"
          },
          400
        );
      }


      const history =
        await getHistory(
          env,
          sessionId
        );


      return jsonResponse({
        history,
      });
    }


    /* =====================================================
       CHAT
    ===================================================== */

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
          String(
            body.sessionId || ""
          ).trim();


        if (!userMessage) {

          return jsonResponse(
            {
              error:
                "Mensaje vacío"
            },
            400
          );
        }


        if (!sessionId) {

          return jsonResponse(
            {
              error:
                "Falta sessionId"
            },
            400
          );
        }


        console.log(
          "[Bruce] Mensaje:",
          userMessage
        );


        /* =================================================
           GUARDAR USUARIO
        ================================================= */

        await saveMessage(
          env,
          sessionId,
          "user",
          userMessage
        );


        /* =================================================
           DETECTAR ACCIONES DIRECTAS
        ================================================= */

        const detected =
          detectActions(
            userMessage
          );


        console.log(
          "[Bruce] Acciones detectadas:",
          detected
        );


        /* =================================================
           SI ES UNA ACCIÓN DEL PC
        ================================================= */

        if (
          detected.type ===
            "command" &&
          detected.actions.length > 0
        ) {

          let responseText =
            "Abriendo.";


          /* -----------------------------------------------
             CIERRE
          ----------------------------------------------- */

          if (
            detected.actions.some(
              (action) =>
                wantsClose(
                  action.command
                )
            )
          ) {

            responseText =
              "Cerrando.";
          }


          /* -----------------------------------------------
             COMANDOS DEL SISTEMA
          ----------------------------------------------- */

          else if (
            detected.actions.some(
              (action) =>
                includesAny(
                  normalizeText(
                    action.command
                  ),
                  [
                    "reinicia",
                    "apagate",
                    "duerme",
                    "despiertate",
                    "apaga el ordenador",
                    "cancela el apagado",
                  ]
                )
            )
          ) {

            responseText =
              "Hecho.";
          }


          /* =================================================
             GUARDAR RESPUESTA
          ================================================= */

          await saveMessage(
            env,
            sessionId,
            "assistant",
            responseText
          );


          return jsonResponse({
            response:
              responseText,

            actions:
              detected.actions,
          });
        }


        /* =================================================
           OBTENER HISTORIAL
        ================================================= */

        const history =
          await getHistory(
            env,
            sessionId
          );


        /* =================================================
           CONSTRUIR CONTEXTO
        ================================================= */

        const messages = [

          {
            role:
              "system",

            content:
              `
Eres Bruce, un asistente personal.

Tu función principal es ayudar al usuario
de forma natural, clara y útil.

Puedes responder preguntas normales,
explicar cosas, ayudar con programación,
organización, estudios y otros temas.

El usuario también dispone de un agente local
llamado Bruce Agent para controlar su ordenador.

Las acciones del ordenador NO debes inventarlas
ni describirlas como si las hubieras ejecutado.
Cuando exista una acción directa del sistema,
el Worker se encargará de enviarla al agente local.

No generes comandos de PowerShell,
CMD, Invoke-RestMethod ni código de terminal
para controlar el ordenador.

Habla en español salvo que el usuario pida
otro idioma.

Responde de forma natural.
              `.trim(),
          },

          ...history.map(
            (message) => ({
              role:
                message.role,

              content:
                message.content,
            })
          ),
        ];


        /* =================================================
           IA
        ================================================= */

        let responseText;

        try {

          responseText =
            await generateAIResponse(
              env,
              messages
            );

        } catch (error) {

          console.error(
            "[Bruce] Error IA:",
            error
          );


          return jsonResponse(
            {
              error:
                String(
                  error?.message ||
                  error
                ),
            },
            500
          );
        }


        /* =================================================
           GUARDAR RESPUESTA IA
        ================================================= */

        await saveMessage(
          env,
          sessionId,
          "assistant",
          responseText
        );


        return jsonResponse({
          response:
            responseText,

          actions: [],
        });


      } catch (error) {

        console.error(
          "[Bruce] Error /api/chat:",
          error
        );


        return jsonResponse(
          {
            error:
              String(
                error?.message ||
                error
              ),
          },
          500
        );
      }
    }


    /* =====================================================
       SPEAK
    ===================================================== */

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

          return jsonResponse(
            {
              error:
                "Falta text"
            },
            400
          );
        }


        try {

          const response =
            await generateVoice(
              env,
              text
            );


          return new Response(
            response.body,
            {
              status:
                response.status,

              headers: {
                "Content-Type":
                  "audio/mpeg",

                "Cache-Control":
                  "no-store",

                ...corsHeaders(),
              },
            }
          );

        } catch (error) {

          console.error(
            "[Bruce] Error ElevenLabs:",
            error
          );


          return jsonResponse(
            {
              error:
                String(
                  error?.message ||
                  error
                ),
            },
            500
          );
        }


      } catch (error) {

        console.error(
          "[Bruce] Error /api/speak:",
          error
        );


        return jsonResponse(
          {
            error:
              String(
                error?.message ||
                error
              ),
          },
          500
        );
      }
    }


    /* =====================================================
       RUTA NO ENCONTRADA
    ===================================================== */

    return jsonResponse(
      {
        error:
          "Ruta no encontrada"
      },
      404
    );
  },
};

