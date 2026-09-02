const MODEL = "@cf/openai/gpt-oss-20b";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};


/* =========================================================
   RESPUESTAS
========================================================= */

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...CORS_HEADERS,
      "Content-Type": "application/json; charset=UTF-8",
    },
  });
}


function textResponse(text, status = 200) {
  return new Response(text, {
    status,
    headers: {
      ...CORS_HEADERS,
      "Content-Type": "text/plain; charset=UTF-8",
    },
  });
}


async function readJson(request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}


/* =========================================================
   UTILIDADES
========================================================= */

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[¿?¡!,.;:()[\]{}]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}


function includesAny(text, values) {
  return values.some((value) =>
    text.includes(value)
  );
}


/* =========================================================
   D1 - MEMORIA
========================================================= */

async function saveMessage(
  env,
  sessionId,
  role,
  content
) {
  if (!env.DB || !sessionId || !content) {
    return;
  }

  try {
    await env.DB
      .prepare(
        "INSERT INTO messages (session_id, role, content) VALUES (?, ?, ?)"
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


async function getHistory(
  env,
  sessionId
) {
  if (!env.DB || !sessionId) {
    return [];
  }

  try {
    const result =
      await env.DB
        .prepare(
          "SELECT role, content FROM messages WHERE session_id = ? ORDER BY rowid ASC LIMIT 100"
        )
        .bind(sessionId)
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


async function deleteHistory(
  env,
  sessionId
) {
  if (!env.DB || !sessionId) {
    return;
  }

  await env.DB
    .prepare(
      "DELETE FROM messages WHERE session_id = ?"
    )
    .bind(sessionId)
    .run();
}


/* =========================================================
   TIPOS DE ÓRDENES
========================================================= */

function wantsOpen(text) {
  return includesAny(text, [
    "abre",
    "abrir",
    "abrime",
    "abrirme",
    "pon",
    "poner",
    "ponme",
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
  ]);
}


function wantsClose(text) {
  return includesAny(text, [
    "cierra",
    "cerrar",
    "cerrame",
    "cerrarme",
    "deten",
    "detener",
    "quita",
    "quitar",
    "termina",
    "terminar",
  ]);
}


/* =========================================================
   SISTEMA
========================================================= */

function detectSystemAction(text) {

  if (
    includesAny(text, [
      "apaga el ordenador",
      "apaga mi ordenador",
      "apaga el pc",
      "apaga mi pc",
      "apagar el ordenador",
      "apagar el pc",
      "apaga windows",
    ])
  ) {
    return {
      type: "shutdown_pc",
    };
  }


  if (
    includesAny(text, [
      "cancela el apagado",
      "cancelar el apagado",
      "cancela apagado",
      "cancelar apagado",
    ])
  ) {
    return {
      type: "cancel_shutdown",
    };
  }


  if (
    includesAny(text, [
      "apaga bruce",
      "apagar bruce",
      "cierra bruce",
      "cerrar bruce",
      "duerme bruce",
      "dormir bruce",
    ])
  ) {
    return {
      type: "stop_agent",
    };
  }


  if (
    includesAny(text, [
      "enciende bruce",
      "encender bruce",
      "activa bruce",
      "activar bruce",
      "despierta bruce",
      "despertar bruce",
    ])
  ) {
    return {
      type: "wake_agent",
    };
  }


  return null;
}


/* =========================================================
   ACCIONES / COMANDOS
========================================================= */

function detectMultipleActions(message) {

  if (!message) {
    return [];
  }

  const original =
    String(message).trim();


  /*
   * Quitamos "Bruce" solamente si aparece
   * al principio.
   *
   * Ejemplo:
   * "Bruce, cierra powershell"
   *
   * -> "cierra powershell"
   */

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
     COMANDOS INTERNOS DE BRUCE
  ======================================================= */


  // ---------------------------------------------------------
  // POWERSHELL
  // ---------------------------------------------------------

  if (
    includesAny(normalized, [
      "cierra powershell",
      "cerrar powershell",
      "cierra el powershell",
      "cerrar el powershell",
      "cierra power shell",
      "cerrar power shell",
    ])
  ) {

    return [
      {
        type: "command",
        command: "cierra powershell",
      },
    ];
  }


  // ---------------------------------------------------------
  // REINICIAR AGENTE
  // ---------------------------------------------------------

  if (
    includesAny(normalized, [
      "reinicia el agente",
      "reiniciar el agente",
      "reinicia bruce",
      "reiniciar bruce",
      "reinicia el bruce",
      "reiniciar el bruce",
    ])
  ) {

    return [
      {
        type: "command",
        command: "reinicia el agente",
      },
    ];
  }


  if (
    normalized === "reinicia" ||
    normalized === "reiniciar"
  ) {

    return [
      {
        type: "command",
        command: "reinicia el agente",
      },
    ];
  }


  // ---------------------------------------------------------
  // DORMIR
  // ---------------------------------------------------------

  if (
    includesAny(normalized, [
      "apagate",
      "apagate bruce",
      "apaga bruce agent",
      "duerme",
      "duerme bruce",
      "deten el agente",
      "para el agente",
      "detente",
    ])
  ) {

    return [
      {
        type: "command",
        command: "apagate",
      },
    ];
  }


  // ---------------------------------------------------------
  // DESPERTAR
  // ---------------------------------------------------------

  if (
    includesAny(normalized, [
      "despiertate",
      "despierta bruce",
      "despierta el agente",
      "activa bruce",
      "activar bruce",
      "despertar bruce",
    ])
  ) {

    return [
      {
        type: "command",
        command: "despiertate",
      },
    ];
  }


  // ---------------------------------------------------------
  // APAGAR ORDENADOR
  // ---------------------------------------------------------

  if (
    includesAny(normalized, [
      "apaga el ordenador",
      "apagar el ordenador",
      "apaga el pc",
      "apagar el pc",
      "apaga windows",
    ])
  ) {

    return [
      {
        type: "command",
        command: "apaga el ordenador",
      },
    ];
  }


  // ---------------------------------------------------------
  // CANCELAR APAGADO
  // ---------------------------------------------------------

  if (
    includesAny(normalized, [
      "cancela el apagado",
      "cancelar el apagado",
      "cancela apagado",
      "cancelar apagado",
    ])
  ) {

    return [
      {
        type: "command",
        command: "cancela el apagado",
      },
    ];
  }


  /* =======================================================
     ABRIR / CERRAR WEBS, APPS Y JUEGOS
  ======================================================= */

  const commandWords = [
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
    "cierra",
    "cerrar",
    "cerrame",
    "cerrarme",
    "termina",
    "terminar",
  ];


  const hasCommandWord =
    commandWords.some(
      (word) =>
        normalized.startsWith(word + " ") ||
        normalized === word
    );


  if (!hasCommandWord) {
    return [];
  }


  /*
   * Soportar varias acciones:
   *
   * "abre youtube y abre spotify"
   *
   * ->
   *
   * "abre youtube"
   * "abre spotify"
   */

  const parts =
    clean
      .split(/\s+y\s+/i)
      .map((part) => part.trim())
      .filter(Boolean);


  const actions = [];


  for (
    const part
    of parts
  ) {

    const partNormalized =
      normalizeText(part);


    const startsWithCommand =
      commandWords.some(
        (word) =>
          partNormalized === word ||
          partNormalized.startsWith(
            word + " "
          )
      );


    if (
      startsWithCommand ||
      parts.length === 1
    ) {

      actions.push({
        type: "command",
        command: part,
      });
    }
  }


  return actions;
}


/* =========================================================
   DETECT ACTIONS
========================================================= */

function detectActions(message) {

  const cleanText =
    normalizeText(message);


  if (!cleanText) {

    return {
      type: "none",
      actions: [],
    };
  }


  /* =======================================================
     SISTEMA
  ======================================================= */

  const systemAction =
    detectSystemAction(
      cleanText
    );


  if (systemAction) {

    return {
      type: "direct",
      actions: [
        systemAction
      ],
    };
  }


  /* =======================================================
     COMANDOS
  ======================================================= */

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


  /* =======================================================
     NINGUNA ACCIÓN
  ======================================================= */

  return {
    type: "none",
    actions: [],
  };
}


/* =========================================================
   IA
========================================================= */

async function generateAIResponse(
  env,
  messages
) {

  if (!env.AI) {
    throw new Error(
      "No existe el binding env.AI"
    );
  }


  const result =
    await env.AI.run(
      MODEL,
      {
        messages,
        max_tokens: 1024,
      }
    );


  let content = null;


  if (
    result &&
    result.choices &&
    result.choices[0]
  ) {

    const choice =
      result.choices[0];


    if (
      choice.message &&
      choice.message.content
    ) {

      content =
        choice.message.content;

    } else if (
      choice.text
    ) {

      content =
        choice.text;
    }
  }


  if (!content) {

    return "No he podido generar una respuesta.";
  }


  return String(content);
}


/* =========================================================
   ELEVENLABS
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

          Accept:
            "audio/mpeg",
        },

        body: JSON.stringify({

          text,

          model_id:
            "eleven_multilingual_v2",

          output_format:
            "mp3_44100_128",

          voice_settings: {

            stability:
              0.45,

            similarity_boost:
              0.85,

            style:
              0.35,

            use_speaker_boost:
              true,
          },
        }),
      }
    );


  if (!response.ok) {

    const errorText =
      await response.text();

    throw new Error(
      "ElevenLabs " +
      response.status +
      ": " +
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
    env,
    ctx
  ) {

    const url =
      new URL(request.url);

    const pathname =
      url.pathname;

    const method =
      request.method;


    /* =====================================================
       CORS
    ===================================================== */

    if (method === "OPTIONS") {

      return new Response(
        null,
        {
          status: 204,
          headers:
            CORS_HEADERS,
        }
      );
    }


    /* =====================================================
       HISTORIAL
    ===================================================== */

    if (
      method === "GET" &&
      pathname === "/api/history"
    ) {

      const sessionId =
        url.searchParams.get(
          "sessionId"
        ) ||
        "default";


      const history =
        await getHistory(
          env,
          sessionId
        );


      return json({
        history,
      });
    }


    /* =====================================================
       BORRAR HISTORIAL
    ===================================================== */

    if (
      method === "DELETE" &&
      pathname === "/api/history"
    ) {

      try {

        const sessionId =
          url.searchParams.get(
            "sessionId"
          ) ||
          "default";


        await deleteHistory(
          env,
          sessionId
        );


        return json({
          success: true,
        });


      } catch (error) {

        return json(
          {
            error:
              error.message ||
              "No se pudo borrar el historial.",
          },
          500
        );
      }
    }


    /* =====================================================
       VOZ
    ===================================================== */

    if (
      method === "POST" &&
      pathname === "/api/speak"
    ) {

      try {

        const body =
          await readJson(
            request
          );


        const text =
          String(
            body.text || ""
          ).trim();


        if (!text) {

          return json(
            {
              error:
                "No hay texto para reproducir.",
            },
            400
          );
        }


        const audio =
          await generateVoice(
            env,
            text
          );


        return new Response(
          audio.body,
          {
            status: 200,

            headers: {
              ...CORS_HEADERS,

              "Content-Type":
                "audio/mpeg",

              "Cache-Control":
                "no-store",
            },
          }
        );


      } catch (error) {

        console.error(
          "Error /api/speak:",
          error
        );


        return json(
          {
            error:
              error.message ||
              "Error generando voz.",
          },
          500
        );
      }
    }


    /* =====================================================
       CHAT
    ===================================================== */

    if (
      method === "POST" &&
      pathname === "/api/chat"
    ) {

      try {

        const body =
          await readJson(
            request
          );


        const userMessage =
          String(
            body.message || ""
          ).trim();


        const sessionId =
          String(
            body.sessionId ||
            "default"
          );


        if (!userMessage) {

          return json(
            {
              error:
                "Mensaje vacío.",
            },
            400
          );
        }


        const cleanText =
          normalizeText(
            userMessage
          );


        console.log(
          "Bruce recibe:",
          cleanText
        );


        /* =================================================
           DETECTAR ORDEN
        ================================================= */

        const detected =
          detectActions(
            userMessage
          );


        console.log(
          "Acciones detectadas:",
          JSON.stringify(
            detected.actions
          )
        );


        /* =================================================
           ACCIÓN DIRECTA
        ================================================= */

        if (
          detected.type ===
          "direct"
        ) {

          const action =
            detected.actions[0];


          let responseText =
            "Hecho.";


          if (
            action.type ===
            "shutdown_pc"
          ) {

            responseText =
              "El ordenador se apagará en 30 segundos.";

          } else if (
            action.type ===
            "cancel_shutdown"
          ) {

            responseText =
              "He cancelado el apagado.";

          } else if (
            action.type ===
            "stop_agent"
          ) {

            responseText =
              "Bruce entrando en modo de espera.";

          } else if (
            action.type ===
            "wake_agent"
          ) {

            responseText =
              "Bruce está activo.";
          }


          await saveMessage(
            env,
            sessionId,
            "user",
            userMessage
          );


          await saveMessage(
            env,
            sessionId,
            "assistant",
            responseText
          );


          return json({

            response:
              responseText,

            actions:
              detected.actions,
          });
        }


        /* =================================================
           COMANDO PARA EL AGENTE LOCAL
        ================================================= */

        if (
          detected.type ===
          "command"
        ) {

          let responseText;


          /*
           * Si alguna acción es de cierre,
           * Bruce responde "Cerrando."
           */

          if (
            detected.actions.some(
              (action) =>
                wantsClose(
                  normalizeText(
                    action.command
                  )
                )
            )
          ) {

            responseText =
              "Cerrando.";

          } else if (
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

          } else {

            responseText =
              "Abriendo.";
          }


          await saveMessage(
            env,
            sessionId,
            "user",
            userMessage
          );


          await saveMessage(
            env,
            sessionId,
            "assistant",
            responseText
          );


          return json({

            response:
              responseText,

            actions:
              detected.actions,
          });
        }


        /* =================================================
           IA NORMAL
        ================================================= */

        const history =
          await getHistory(
            env,
            sessionId
          );


        const messages = [

          {
            role: "system",

            content:
              "You are Bruce, a personal AI assistant. " +
              "Respond in Spanish by default. " +
              "Be concise, intelligent, calm and useful. " +
              "Your personality is serious, sophisticated " +
              "and efficient. " +
              "Do not claim to have opened, closed or " +
              "controlled anything unless the system " +
              "actually returned an action.",
          },

          ...history,

          {
            role: "user",
            content: userMessage,
          },
        ];


        const responseText =
          await generateAIResponse(
            env,
            messages
          );


        await saveMessage(
          env,
          sessionId,
          "user",
          userMessage
        );


        await saveMessage(
          env,
          sessionId,
          "assistant",
          responseText
        );


        return json({

          response:
            responseText,

          actions: [],
        });


      } catch (error) {

        console.error(
          "Error /api/chat:",
          error
        );


        return json(
          {
            error:
              error.message ||
              "Error interno del servidor.",
          },
          500
        );
      }
    }


    /* =====================================================
       ASSETS
    ===================================================== */

    if (env.ASSETS) {

      return env.ASSETS.fetch(
        request
      );
    }


    return textResponse(
      "Bruce está funcionando."
    );
  },
};
