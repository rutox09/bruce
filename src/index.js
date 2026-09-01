const MODEL = "@cf/openai/gpt-oss-20b";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

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

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function includesAny(text, values) {
  return values.some((value) => text.includes(value));
}

/* =========================================================
   MEMORIA D1
========================================================= */

async function saveMessage(env, sessionId, role, content) {
  if (!env.DB || !sessionId || !content) return;

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
  if (!env.DB || !sessionId) return [];

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
   ACCIONES
========================================================= */

const websites = {
  youtube: {
    name: "YouTube",
    url: "https://www.youtube.com",
  },
  twitch: {
    name: "Twitch",
    url: "https://www.twitch.tv",
  },
  spotify: {
    name: "Spotify",
    url: "https://open.spotify.com",
  },
  discord: {
    name: "Discord",
    url: "https://discord.com/app",
  },
  tiktok: {
    name: "TikTok",
    url: "https://www.tiktok.com",
  },
  google: {
    name: "Google",
    url: "https://www.google.com",
  },
  netflix: {
    name: "Netflix",
    url: "https://www.netflix.com",
  },
};

const apps = {
  chrome: {
    name: "Chrome",
  },
  edge: {
    name: "Edge",
  },
  steam: {
    name: "Steam",
  },
  epic: {
    name: "Epic Games",
  },
  notepad: {
    name: "Bloc de notas",
  },
  calculator: {
    name: "Calculadora",
  },
};

const games = {
  rocket_league: {
    name: "Rocket League",
  },
};

function detectWebsite(text) {
  if (includesAny(text, ["youtube", "you tube"])) return "youtube";
  if (text.includes("twitch")) return "twitch";
  if (text.includes("spotify")) return "spotify";
  if (text.includes("discord")) return "discord";
  if (text.includes("tiktok")) return "tiktok";
  if (text.includes("netflix")) return "netflix";
  if (text.includes("google")) return "google";

  return null;
}

function detectApp(text) {
  if (text.includes("chrome")) return "chrome";
  if (text.includes("edge")) return "edge";
  if (text.includes("steam")) return "steam";
  if (text.includes("epic")) return "epic";
  if (
    text.includes("bloc de notas") ||
    text.includes("bloc notas") ||
    text.includes("notepad")
  ) {
    return "notepad";
  }

  if (
    text.includes("calculadora") ||
    text.includes("calculator")
  ) {
    return "calculator";
  }

  return null;
}

function detectGame(text) {
  if (
    text.includes("rocket league") ||
    text.includes("rocketleague")
  ) {
    return "rocket_league";
  }

  return null;
}

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
    "juega",
    "jugar",
    "lanza",
    "lanzar",
    "abre me",
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

function detectMultipleActions(text) {
  const actions = [];

  const isOpen = wantsOpen(text);
  const isClose = wantsClose(text);

  /* SISTEMA: no confundir estas órdenes con cerrar aplicaciones */

  const shutdownPC =
    includesAny(text, [
      "apaga el ordenador",
      "apaga mi ordenador",
      "apaga el pc",
      "apaga mi pc",
      "apagar el ordenador",
      "apagar el pc",
      "apaga windows",
    ]);

  const cancelShutdown =
    includesAny(text, [
      "cancela el apagado",
      "cancelar el apagado",
      "cancela apagado",
      "cancelar apagado",
    ]);

  const stopBruce =
    includesAny(text, [
      "apaga bruce",
      "apagar bruce",
      "cierra bruce",
      "cerrar bruce",
      "duerme bruce",
      "dormir bruce",
    ]);

  const wakeBruce =
    includesAny(text, [
      "enciende bruce",
      "encender bruce",
      "activa bruce",
      "activar bruce",
      "despierta bruce",
      "despertar bruce",
    ]);

  if (shutdownPC) {
    actions.push({
      type: "shutdown_pc",
    });

    return actions;
  }

  if (cancelShutdown) {
    actions.push({
      type: "cancel_shutdown",
    });

    return actions;
  }

  if (stopBruce) {
    actions.push({
      type: "stop_agent",
    });

    return actions;
  }

  if (wakeBruce) {
    actions.push({
      type: "wake_agent",
    });

    return actions;
  }

  /* =========================================================
     ABRIR
  ========================================================= */

  if (isOpen) {
    if (text.includes("rocket league") || text.includes("rocketleague")) {
      actions.push({
        type: "game",
        target: "rocket_league",
      });
    }

    for (const key of Object.keys(websites)) {
      const name = normalizeText(websites[key].name);

      if (
        text.includes(key.replace("_", " ")) ||
        text.includes(name)
      ) {
        actions.push({
          type: "website",
          target: key,
        });
      }
    }

    for (const key of Object.keys(apps)) {
      const name = normalizeText(apps[key].name);

      if (
        text.includes(key.replace("_", " ")) ||
        text.includes(name)
      ) {
        actions.push({
          type: "app",
          target: key,
        });
      }
    }
  }

  /* =========================================================
     CERRAR
  ========================================================= */

  if (isClose) {
    if (
      text.includes("rocket league") ||
      text.includes("rocketleague")
    ) {
      actions.push({
        type: "close",
        target: "rocket_league",
      });
    }

    for (const key of Object.keys(websites)) {
      const name = normalizeText(websites[key].name);

      if (
        text.includes(key.replace("_", " ")) ||
        text.includes(name)
      ) {
        actions.push({
          type: "close_website",
          target: key,
        });
      }
    }

    for (const key of Object.keys(apps)) {
      const name = normalizeText(apps[key].name);

      if (
        text.includes(key.replace("_", " ")) ||
        text.includes(name)
      ) {
        actions.push({
          type: "close",
          target: key,
        });
      }
    }
  }

  /* Quitar duplicados */

  const unique = [];
  const seen = new Set();

  for (const action of actions) {
    const id = `${action.type}:${action.target || ""}`;

    if (!seen.has(id)) {
      seen.add(id);
      unique.push(action);
    }
  }

  return unique;
}

/* =========================================================
   RESPUESTA DE BRUCE
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
    content = "No he podido generar una respuesta.";
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

  const voiceId = env.ELEVENLABS_VOICE_ID;

  const url =
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;

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
      `ElevenLabs ${response.status}: ${errorText}`
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

    /* CORS */

    if (method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: CORS_HEADERS,
      });
    }

    /* =====================================================
       HISTORIAL
    ===================================================== */

    if (method === "GET" && pathname === "/api/history") {
      const sessionId =
        url.searchParams.get("sessionId") || "default";

      const history = await getHistory(env, sessionId);

      return json({
        history,
      });
    }

    /* =====================================================
       VOZ
    ===================================================== */

    if (method === "POST" && pathname === "/api/speak") {
      try {
        const body = await readJson(request);

        const text = String(body.text || "").trim();

        if (!text) {
          return json(
            {
              error: "No hay texto para reproducir.",
            },
            400
          );
        }

        const audioResponse = await generateVoice(env, text);

        return new Response(audioResponse.body, {
          status: 200,
          headers: {
            ...CORS_HEADERS,
            "Content-Type": "audio/mpeg",
            "Cache-Control": "no-store",
          },
        });
      } catch (error) {
        console.error("Error /api/speak:", error);

        return json(
          {
            error: error.message || "Error generando voz.",
          },
          500
        );
      }
    }

    /* =====================================================
       CHAT
    ===================================================== */

    if (method === "POST" && pathname === "/api/chat") {
      try {
        const body = await readJson(request);

        const userMessage = String(
          body.message || ""
        ).trim();

        const sessionId = String(
          body.sessionId || "default"
        );

        if (!userMessage) {
          return json(
            {
              error: "Mensaje vacío.",
            },
            400
          );
        }

        const cleanText = normalizeText(userMessage);

        /* =================================================
           DETECCIÓN DIRECTA DE ACCIONES
           ================================================= */

        const actions = detectMultipleActions(cleanText);

        /* =================================================
           RESPUESTA PARA ACCIONES
           ================================================= */

        if (actions.length > 0) {
          let responseText = "Hecho.";

          if (
            actions.some(
              (action) => action.type === "shutdown_pc"
            )
          ) {
            responseText =
              "El ordenador se apagará en 30 segundos.";
          } else if (
            actions.some(
              (action) => action.type === "cancel_shutdown"
            )
          ) {
            responseText = "He cancelado el apagado.";
          } else if (
            actions.some(
              (action) => action.type === "stop_agent"
            )
          ) {
            responseText = "Bruce entrando en modo de espera.";
          } else if (
            actions.some(
              (action) => action.type === "wake_agent"
            )
          ) {
            responseText = "Bruce está activo.";
          } else if (
            actions.some(
              (action) =>
                action.type === "website" ||
                action.type === "app"
            )
          ) {
            responseText = "Abriendo.";
          } else if (
            actions.some(
              (action) =>
                action.type === "close" ||
                action.type === "close_website"
            )
          ) {
            responseText = "Cerrando.";
          } else if (
            actions.some(
              (action) => action.type === "game"
            )
          ) {
            responseText = "Iniciando el juego.";
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
            actions,
          });
        }

        /* =================================================
           IA NORMAL
           ================================================= */

        const history = await getHistory(
          env,
          sessionId
        );

        const messages = [
          {
            role: "system",
            content:
              "You are Bruce, a personal AI assistant. " +
              "You speak Spanish by default. " +
              "Be concise, useful, calm and intelligent. " +
              "Your personality is inspired by a sophisticated private assistant: " +
              "serious, composed and efficient. " +
              "Do not claim to have performed actions that were not actually sent " +
              "to the local computer agent.",
          },
          ...history,
          {
            role: "user",
            content: userMessage,
          },
        ];

        const responseText = await generateAIResponse(
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
        console.error("Error /api/chat:", error);

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
       ASSETS / WEB
    ===================================================== */

    if (env.ASSETS) {
      return env.ASSETS.fetch(request);
    }

    return textResponse("Bruce está funcionando.");
  },
};
