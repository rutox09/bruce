const MODEL = "@cf/openai/gpt-oss-20b";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

/* =========================================================
   RESPUESTAS HTTP
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
  return values.some((value) => text.includes(value));
}

/* =========================================================
   D1 - MEMORIA
========================================================= */

async function saveMessage(env, sessionId, role, content) {
  if (!env.DB || !sessionId || !content) {
    return;
  }

  try {
    await env.DB
      .prepare(
        "INSERT INTO messages (session_id, role, content) VALUES (?, ?, ?)"
      )
      .bind(sessionId, role, content)
      .run();
  } catch (error) {
    console.error("Error guardando mensaje:", error);
  }
}

async function getHistory(env, sessionId) {
  if (!env.DB || !sessionId) {
    return [];
  }

  try {
    const result = await env.DB
      .prepare(
        "SELECT role, content FROM messages WHERE session_id = ? ORDER BY rowid ASC LIMIT 50"
      )
      .bind(sessionId)
      .all();

    return result.results || [];
  } catch (error) {
    console.error("Error leyendo memoria:", error);
    return [];
  }
}

/* =========================================================
   CONFIGURACIÓN DE WEBS
========================================================= */

const websites = {
  youtube: {
    name: "YouTube",
    aliases: ["youtube", "you tube"],
    url: "https://www.youtube.com",
  },

  twitch: {
    name: "Twitch",
    aliases: ["twitch"],
    url: "https://www.twitch.tv",
  },

  spotify: {
    name: "Spotify",
    aliases: ["spotify"],
    url: "https://open.spotify.com",
  },

  discord: {
    name: "Discord",
    aliases: ["discord"],
    url: "https://discord.com/app",
  },

  tiktok: {
    name: "TikTok",
    aliases: ["tiktok", "tik tok"],
    url: "https://www.tiktok.com",
  },

  google: {
    name: "Google",
    aliases: ["google"],
    url: "https://www.google.com",
  },

  netflix: {
    name: "Netflix",
    aliases: ["netflix"],
    url: "https://www.netflix.com",
  },
};

/* =========================================================
   CONFIGURACIÓN DE APLICACIONES
========================================================= */

const apps = {
  chrome: {
    name: "Chrome",
    aliases: ["chrome", "google chrome"],
  },

  edge: {
    name: "Edge",
    aliases: ["edge", "microsoft edge"],
  },

  steam: {
    name: "Steam",
    aliases: ["steam"],
  },

  epic: {
    name: "Epic Games",
    aliases: ["epic", "epic games"],
  },

  notepad: {
    name: "Bloc de notas",
    aliases: ["bloc de notas", "bloc notas", "notepad"],
  },

  calculator: {
    name: "Calculadora",
    aliases: ["calculadora", "calculator"],
  },
};

/* =========================================================
   JUEGOS
========================================================= */

const games = {
  rocket_league: {
    name: "Rocket League",
    aliases: ["rocket league", "rocketleague"],
  },
};

/* =========================================================
   DETECTAR VERBOS
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
  ]);
}

/* =========================================================
   BUSCAR ELEMENTOS
========================================================= */

function textMatchesAliases(text, aliases) {
  return aliases.some((alias) => text.includes(alias));
}

/* =========================================================
   DETECTAR ACCIONES
========================================================= */

function detectMultipleActions(text) {
  const actions = [];

  const isOpen = wantsOpen(text);
  const isClose = wantsClose(text);

  /* -------------------------------------------------------
     ORDENADOR
  ------------------------------------------------------- */

  const shutdownPC = includesAny(text, [
    "apaga el ordenador",
    "apaga mi ordenador",
    "apaga el pc",
    "apaga mi pc",
    "apagar el ordenador",
    "apagar el pc",
    "apaga windows",
  ]);

  const cancelShutdown = includesAny(text, [
    "cancela el apagado",
    "cancelar el apagado",
    "cancela apagado",
    "cancelar apagado",
  ]);

  /* -------------------------------------------------------
     BRUCE
  ------------------------------------------------------- */

  const stopBruce = includesAny(text, [
    "apaga bruce",
    "apagar bruce",
    "cierra bruce",
    "cerrar bruce",
    "duerme bruce",
    "dormir bruce",
  ]);

  const wakeBruce = includesAny(text, [
    "enciende bruce",
    "encender bruce",
    "activa bruce",
    "activar bruce",
    "despierta bruce",
    "despertar bruce",
  ]);

  if (shutdownPC) {
    return [
      {
        type: "shutdown_pc",
      },
    ];
  }

  if (cancelShutdown) {
    return [
      {
        type: "cancel_shutdown",
      },
    ];
  }

  if (stopBruce) {
    return [
      {
        type: "stop_agent",
      },
    ];
  }

  if (wakeBruce) {
    return [
      {
        type: "wake_agent",
      },
    ];
  }

  /* -------------------------------------------------------
     ABRIR
  ------------------------------------------------------- */

  if (isOpen) {
    /* WEBS */

    for (const [key, website] of Object.entries(websites)) {
      if (textMatchesAliases(text, website.aliases)) {
        actions.push({
          type: "website",
          target: key,
        });
      }
    }

    /* APPS */

    for (const [key, app] of Object.entries(apps)) {
      if (textMatchesAliases(text, app.aliases)) {
        actions.push({
          type: "app",
          target: key,
        });
      }
    }

    /* JUEGOS */

    for (const [key, game] of Object.entries(games)) {
      if (textMatchesAliases(text, game.aliases)) {
        actions.push({
          type: "game",
          target: key,
        });
      }
    }
  }

  /* -------------------------------------------------------
     CERRAR
  ------------------------------------------------------- */

  if (isClose) {
    /* WEBS */

    for (const [key, website] of Object.entries(websites)) {
      if (textMatchesAliases(text, website.aliases)) {
        actions.push({
          type: "close_website",
          target: key,
        });
      }
    }

    /* APPS */

    for (const [key, app] of Object.entries(apps)) {
      if (textMatchesAliases(text, app.aliases)) {
        actions.push({
          type: "close",
          target: key,
        });
      }
    }

    /* JUEGOS */

    for (const [key, game] of Object.entries(games)) {
      if (textMatchesAliases(text, game.aliases)) {
        actions.push({
          type: "close",
          target: key,
        });
      }
    }
  }

  /* -------------------------------------------------------
     ELIMINAR DUPLICADOS
  ------------------------------------------------------- */

  const unique = [];
  const seen = new Set();

  for (const action of actions) {
    const identifier =
      action.type + ":" + (action.target || "");

    if (!seen.has(identifier)) {
      seen.add(identifier);
      unique.push(action);
    }
  }

  return unique;
}

/* =========================================================
   IA
========================================================= */

async function generateAIResponse(env, messages) {
  if (!env.AI) {
    throw new Error("No existe el binding env.AI");
  }

  const result = await env.AI.run(MODEL, {
    messages,
    max_tokens: 1024,
  });

  let content = null;

  if (result && result.choices && result.choices[0]) {
    const choice = result.choices[0];

    if (choice.message && choice.message.content) {
      content = choice.message.content;
    } else if (choice.text) {
      content = choice.text;
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

async function generateVoice(env, text) {
  if (!env.ELEVENLABS_API_KEY) {
    throw new Error("Falta ELEVENLABS_API_KEY");
  }

  if (!env.ELEVENLABS_VOICE_ID) {
    throw new Error("Falta ELEVENLABS_VOICE_ID");
  }

  const url =
    "https://api.elevenlabs.io/v1/text-to-speech/" +
    env.ELEVENLABS_VOICE_ID;

  const response = await fetch(url, {
    method: "POST",

    headers: {
      "xi-api-key": env.ELEVENLABS_API_KEY,
      "Content-Type": "application/json",
      Accept: "audio/mpeg",
    },

    body: JSON.stringify({
      text,
      model_id: "eleven_multilingual_v2",
      output_format: "mp3_44100_128",

      voice_settings: {
        stability: 0.45,
        similarity_boost: 0.85,
        style: 0.35,
        use_speaker_boost: true,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();

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
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    const pathname = url.pathname;
    const method = request.method;

    /* -------------------------------------------------------
       CORS
    ------------------------------------------------------- */

    if (method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: CORS_HEADERS,
      });
    }

    /* ======================================================
       GET /api/history
    ====================================================== */

    if (
      method === "GET" &&
      pathname === "/api/history"
    ) {
      const sessionId =
        url.searchParams.get("sessionId") ||
        "default";

      const history =
        await getHistory(env, sessionId);

      return json({
        history,
      });
    }

    /* ======================================================
       POST /api/speak
    ====================================================== */

    if (
      method === "POST" &&
      pathname === "/api/speak"
    ) {
      try {
        const body = await readJson(request);

        const text = String(
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
          await generateVoice(env, text);

        return new Response(audio.body, {
          status: 200,

          headers: {
            ...CORS_HEADERS,
            "Content-Type": "audio/mpeg",
            "Cache-Control":
              "no-store",
          },
        });
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

    /* ======================================================
       POST /api/chat
    ====================================================== */

    if (
      method === "POST" &&
      pathname === "/api/chat"
    ) {
      try {
        const body =
          await readJson(request);

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

        /* ==================================================
           DETECCIÓN DIRECTA
        ================================================== */

        const actions =
          detectMultipleActions(
            cleanText
          );

        console.log(
          "Acciones detectadas:",
          JSON.stringify(actions)
        );

        /* ==================================================
           SI HAY ACCIONES, NO USAR GPT
        ================================================== */

        if (actions.length > 0) {
          let responseText =
            "Hecho.";

          const hasOpen =
            actions.some(
              (action) =>
                action.type ===
                  "website" ||
                action.type ===
                  "app" ||
                action.type ===
                  "game"
            );

          const hasClose =
            actions.some(
              (action) =>
                action.type ===
                  "close" ||
                action.type ===
                  "close_website"
            );

          const hasShutdown =
            actions.some(
              (action) =>
                action.type ===
                "shutdown_pc"
            );

          const hasCancelShutdown =
            actions.some(
              (action) =>
                action.type ===
                "cancel_shutdown"
            );

          const hasStopBruce =
            actions.some(
              (action) =>
                action.type ===
                "stop_agent"
            );

          const hasWakeBruce =
            actions.some(
              (action) =>
                action.type ===
                "wake_agent"
            );

          if (hasShutdown) {
            responseText =
              "El ordenador se apagará en 30 segundos.";
          } else if (
            hasCancelShutdown
          ) {
            responseText =
              "He cancelado el apagado.";
          } else if (
            hasStopBruce
          ) {
            responseText =
              "Bruce entrando en modo de espera.";
          } else if (
            hasWakeBruce
          ) {
            responseText =
              "Bruce está activo.";
          } else if (hasOpen) {
            if (actions.length === 1) {
              responseText =
                "Abriendo.";
            } else {
              responseText =
                "Abriendo " +
                actions.length +
                " elementos.";
            }
          } else if (hasClose) {
            if (actions.length === 1) {
              responseText =
                "Cerrando.";
            } else {
              responseText =
                "Cerrando " +
                actions.length +
                " elementos.";
            }
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
            response: responseText,
            actions: actions,
          });
        }

        /* ==================================================
           IA NORMAL
        ================================================== */

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
              "Your personality is that of a sophisticated private assistant. " +
              "You are serious, efficient and composed. " +
              "Never claim to have opened, closed or controlled something " +
              "unless the system provided an action for it.",
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
          response: responseText,
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

    /* ======================================================
       ARCHIVOS DEL FRONTEND
    ====================================================== */

    if (env.ASSETS) {
      return env.ASSETS.fetch(request);
    }

    return textResponse(
      "Bruce está funcionando."
    );
  },
};
