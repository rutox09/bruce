// =====================================================
// SESIÓN
// =====================================================
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

let sessionId =
    localStorage.getItem(
        "bruce_session_id"
    );

if (!sessionId) {
function textResponse(text, status = 200) {
  return new Response(text, {
    status,
    headers: {
      ...CORS_HEADERS,
      "Content-Type": "text/plain; charset=UTF-8",
    },
  });
}

    sessionId =
        crypto.randomUUID();

    localStorage.setItem(
        "bruce_session_id",
        sessionId
    );
async function readJson(request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}


// =====================================================
// URLS
// =====================================================

const WORKER_URL =
    "https://brucewayne.aleixruto.workers.dev/api/chat";
/* =========================================================
   UTILIDADES
========================================================= */

const AGENT_URL =
    "http://127.0.0.1:8765/action";
function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[¿?¡!,.;:()[\]{}]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const SPEAK_URL =
    "https://brucewayne.aleixruto.workers.dev/api/speak";

const HISTORY_URL =
    "https://brucewayne.aleixruto.workers.dev/api/history";
function includesAny(text, values) {
  return values.some((value) =>
    text.includes(value)
  );
}


// =====================================================
// ELEMENTOS
// =====================================================
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

const chat =
    document.getElementById("chat");

const inputArea =
    document.getElementById("inputArea");
async function getHistory(env, sessionId) {
  if (!env.DB || !sessionId) {
    return [];
  }

const input =
    document.getElementById("messageInput");
  try {
    const result =
      await env.DB
        .prepare(
          "SELECT role, content FROM messages WHERE session_id = ? ORDER BY rowid ASC LIMIT 100"
        )
        .bind(sessionId)
        .all();

const micButton =
    document.getElementById("micButton");
    return result.results || [];

  } catch (error) {
    console.error(
      "Error leyendo historial:",
      error
    );

// =====================================================
// MOSTRAR MENSAJE
// =====================================================
    return [];
  }
}

function addMessage(
    text,
    type
) {

    if (!chat) {
        return;
    }
async function deleteHistory(env, sessionId) {
  if (!env.DB || !sessionId) {
    return;
  }

    const message =
        document.createElement("div");
  await env.DB
    .prepare(
      "DELETE FROM messages WHERE session_id = ?"
    )
    .bind(sessionId)
    .run();
}

    message.className =
        "message " + type;

    message.textContent =
        text;
/* =========================================================
   TIPOS DE ORDEN
========================================================= */

function wantsClose(text) {
  return includesAny(text, [
    "cierra",
    "cerrar",
    "cerrame",
    "cerrarme",
    "termina",
    "terminar",
    "deten",
    "detener",
  ]);
}

    chat.appendChild(
        message
    );

    chat.scrollTop =
        chat.scrollHeight;
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


// =====================================================
// BRUCE HABLA
// =====================================================
/* =========================================================
   ACCIONES
========================================================= */

function detectMultipleActions(message) {

  if (!message) {
    return [];
  }

  const original =
    String(message).trim();


  const clean =
    original
      .replace(/^bruce[\s,:-]*/i, "")
      .trim();


  if (!clean) {
    return [];
  }


  const normalized =
    normalizeText(clean);


  /* =======================================================
     COMANDOS INTERNOS
  ======================================================= */

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


  if (
    includesAny(normalized, [
      "reinicia el agente",
      "reiniciar el agente",
      "reinicia bruce",
      "reiniciar bruce",
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


  if (
    includesAny(normalized, [
      "apagate",
      "apagate bruce",
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


  /* =======================================================
     ABRIR / CERRAR
  ======================================================= */

  if (
    /^(abre|abrir|abrime|abrirme|inicia|iniciar|lanza|lanzar|arranca|arrancar|ejecuta|ejecutar|juega|jugar)\s+/i
      .test(clean)
  ) {
    return [
      {
        type: "command",
        command: clean,
      },
    ];
  }


  if (
    /^(cierra|cerrar|cerrame|cerrarme|termina|terminar|deten|detener)\s+/i
      .test(clean)
  ) {
    return [
      {
        type: "command",
        command: clean,
      },
    ];
  }


  /* =======================================================
     MÚLTIPLES ACCIONES
  ======================================================= */

  const parts =
    clean
      .split(/\s+y\s+/i)
      .map((part) => part.trim())
      .filter(Boolean);


  const actions = [];


  for (const part of parts) {

    const normalizedPart =
      normalizeText(part);


    const startsWithCommand =
      /^(abre|abrir|abrime|abrirme|inicia|iniciar|lanza|lanzar|arranca|arrancar|ejecuta|ejecutar|juega|jugar|cierra|cerrar|cerrame|cerrarme|termina|terminar|deten|detener)\s+/i
        .test(part);

async function speak(text) {

    if (!text) {
        return;
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

    try {

        console.log(
            "Generando voz de Bruce..."
        );

        const response =
            await fetch(
                SPEAK_URL,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({
                        text: text
                    })
                }
            );
  return actions;
}


        if (!response.ok) {
/* =========================================================
   DETECT ACTIONS
========================================================= */

            const errorText =
                await response.text();
function detectActions(message) {

            console.error(
                "Error ElevenLabs:",
                errorText
            );
  const original =
    String(message || "").trim();

            return;
        }

  const cleanText =
    normalizeText(original);

        const audioBlob =
            await response.blob();

  if (!cleanText) {
    return {
      type: "none",
      actions: [],
    };
  }

        const audioUrl =
            URL.createObjectURL(
                audioBlob
            );

  /* =======================================================
     SISTEMA
  ======================================================= */

        const audio =
            new Audio(
                audioUrl
            );
  const systemAction =
    detectSystemAction(cleanText);


        audio.volume = 1.0;
  if (systemAction) {
    return {
      type: "direct",
      actions: [
        systemAction,
      ],
    };
  }


        audio.onended =
            function () {
  /* =======================================================
     COMANDOS
  ======================================================= */

                URL.revokeObjectURL(
                    audioUrl
                );
            };
  const actions =
    detectMultipleActions(original);


        await audio.play();
  if (
    Array.isArray(actions) &&
    actions.length > 0
  ) {
    return {
      type: "command",
      actions,
    };
  }

    } catch (error) {

        console.error(
            "No se pudo reproducir la voz:",
            error
        );
    }
  return {
    type: "none",
    actions: [],
  };
}


// =====================================================
// EJECUTAR UNA ACCIÓN
// =====================================================
/* =========================================================
   IA
========================================================= */

async function executeAction(action) {
async function generateAIResponse(env, messages) {

    if (!action) {
        return;
    }

    console.log(
        "Ejecutando acción:",
        action
  if (!env.AI) {
    throw new Error(
      "No existe el binding env.AI"
);
  }

    // =================================================
    // COMPATIBILIDAD CON ACCIONES ANTIGUAS
    // =================================================

    let finalAction = action;
  const result =
    await env.AI.run(
      MODEL,
      {
        messages,
        max_tokens: 1024,
      }
    );

    if (
        action.type === "website" &&
        action.target
    ) {

        finalAction = {
            type: "command",
            command: "abre " + action.target
        };
  let content = null;

    } else if (
        action.type === "app" &&
        action.target
    ) {

        finalAction = {
            type: "command",
            command: "abre " + action.target
        };
  if (
    result &&
    result.choices &&
    result.choices[0]
  ) {

    } else if (
        action.type === "game" &&
        action.target
    ) {
    const choice =
      result.choices[0];

        finalAction = {
            type: "command",
            command: "abre " + action.target
        };

    } else if (
        action.type === "close_website" &&
        action.target
    if (
      choice.message &&
      choice.message.content
) {

        finalAction = {
            type: "command",
            command: "cierra " + action.target
        };
      content =
        choice.message.content;

} else if (
        action.type === "close" &&
        action.target
      choice.text
) {

        finalAction = {
            type: "command",
            command: "cierra " + action.target
        };
      content =
        choice.text;
}
  }


    console.log(
        "Acción enviada al agente:",
        finalAction
    );
  if (!content) {
    return "No he podido generar una respuesta.";
  }


    // =================================================
    // ENVIAR AL BRUCE AGENT
    // =================================================
  return String(content);
}

    try {

        const response =
            await fetch(
                AGENT_URL,
                {
                    method: "POST",
/* =========================================================
   ELEVENLABS
========================================================= */

                    headers: {
                        "Content-Type":
                            "application/json"
                    },
async function generateVoice(env, text) {

                    body:
                        JSON.stringify(
                            finalAction
                        )
                }
            );
  if (!env.ELEVENLABS_API_KEY) {
    throw new Error(
      "Falta ELEVENLABS_API_KEY"
    );
  }


        const responseText =
            await response.text();
  if (!env.ELEVENLABS_VOICE_ID) {
    throw new Error(
      "Falta ELEVENLABS_VOICE_ID"
    );
  }


        console.log(
            "Respuesta HTTP del agente:",
            responseText
        );
  const url =
    "https://api.elevenlabs.io/v1/text-to-speech/" +
    env.ELEVENLABS_VOICE_ID;


        let data;
  const response =
    await fetch(
      url,
      {
        method: "POST",

        try {
        headers: {
          "xi-api-key":
            env.ELEVENLABS_API_KEY,

            data =
                JSON.parse(
                    responseText
                );
          "Content-Type":
            "application/json",

        } catch {
          "Accept":
            "audio/mpeg",
        },

            data = {
                success: false,
                message:
                    "Respuesta inválida del Bruce Agent."
            };
        }
        body: JSON.stringify({
          text,

          model_id:
            "eleven_multilingual_v2",

        console.log(
            "Bruce Agent:",
            data
        );
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

            console.error(
                "Bruce Agent HTTP:",
                response.status,
                data
            );
  if (!response.ok) {

            return;
        }
    const errorText =
      await response.text();

    throw new Error(
      "ElevenLabs " +
      response.status +
      ": " +
      errorText
    );
  }

        if (!data.success) {

            console.error(
                "El agente rechazó:",
                data.message
            );
  return response;
}

        } else {

            console.log(
                "Acción ejecutada correctamente:",
                data.message
            );
        }
/* =========================================================
   WORKER
========================================================= */

    } catch (error) {
export default {

        console.error(
            "Error con Bruce Agent:",
            error
        );
    }
}
  async fetch(request, env, ctx) {

    const url =
      new URL(request.url);

// =====================================================
// EJECUTAR VARIAS ACCIONES
// =====================================================
    const pathname =
      url.pathname;

async function executeActions(
    data
) {
    const method =
      request.method;

    if (
        data &&
        Array.isArray(
            data.actions
        )
    ) {

        for (
            const action
            of data.actions
        ) {
    /* =====================================================
       CORS
    ===================================================== */

            await executeAction(
                action
            );
    if (method === "OPTIONS") {
      return new Response(
        null,
        {
          status: 204,
          headers: CORS_HEADERS,
}

        return;
      );
}


    /*
     * Compatibilidad con respuestas antiguas
     * que todavía puedan enviar `action`.
     */
    /* =====================================================
       HISTORIAL
    ===================================================== */

if (
        data &&
        data.action
      method === "GET" &&
      pathname === "/api/history"
) {

        await executeAction(
            data.action
        );
    }
}
      const sessionId =
        url.searchParams.get(
          "sessionId"
        ) ||
        "default";


// =====================================================
// ENVIAR MENSAJE
// =====================================================
      const history =
        await getHistory(
          env,
          sessionId
        );

async function sendMessage() {

    if (!input) {
        return;
      return json({
        history,
      });
}


    const text =
        input.value.trim();

    /* =====================================================
       BORRAR HISTORIAL
    ===================================================== */

    if (!text) {
        return;
    }


    // Mostrar mensaje del usuario
    addMessage(
        text,
        "user"
    );


    // Limpiar input
    input.value = "";


    try {

        const response =
            await fetch(
                WORKER_URL,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },
    if (
      method === "DELETE" &&
      pathname === "/api/history"
    ) {

                    body: JSON.stringify({
      try {

                        message:
                            text,
        const sessionId =
          url.searchParams.get(
            "sessionId"
          ) ||
          "default";

                        sessionId:
                            sessionId

                    })
                }
            );
        await deleteHistory(
          env,
          sessionId
        );


        const responseText =
            await response.text();
        return json({
          success: true,
        });

      } catch (error) {

        console.log(
            "Bruce respondió:",
            responseText
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


        let data;


        try {

            data =
                JSON.parse(
                    responseText
                );
    /* =====================================================
       VOZ
    ===================================================== */

        } catch {
    if (
      method === "POST" &&
      pathname === "/api/speak"
    ) {

            addMessage(
                "Respuesta inesperada: " +
                responseText,
                "bruce"
            );
      try {

            return;
        }
        const body =
          await readJson(
            request
          );


        // =============================================
        // ERROR DEL WORKER
        // =============================================
        const text =
          String(
            body.text || ""
          ).trim();

        if (data.error) {

            addMessage(
                "Error: " +
                data.error,
                "bruce"
            );
        if (!text) {

            return;
          return json(
            {
              error:
                "No hay texto para reproducir.",
            },
            400
          );
}


        // =============================================
        // RESPUESTA DE BRUCE
        // =============================================

        const reply =
            data.response ||
            "He recibido tu mensaje.";


        addMessage(
            reply,
            "bruce"
        );

        const audio =
          await generateVoice(
            env,
            text
          );

        // =============================================
        // VOZ
        // =============================================

        await speak(
            reply
        );
        return new Response(
          audio.body,
          {
            status: 200,

            headers: {
              ...CORS_HEADERS,

        // =============================================
        // ACCIONES
        // =============================================
              "Content-Type":
                "audio/mpeg",

        await executeActions(
            data
              "Cache-Control":
                "no-store",
            },
          }
);


    } catch (error) {
      } catch (error) {

console.error(
            "Error enviando mensaje:",
            error
          "Error /api/speak:",
          error
);


        addMessage(
            "Error de conexión: " +
            error.message,
            "bruce"
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
}


// =====================================================
// CARGAR HISTORIAL
// =====================================================
    /* =====================================================
       CHAT
    ===================================================== */

async function loadHistory() {
    if (
      method === "POST" &&
      pathname === "/api/chat"
    ) {

    if (!chat) {
        return;
    }
      try {

        const body =
          await readJson(
            request
          );

    try {

        const response =
            await fetch(
                HISTORY_URL +
                "?sessionId=" +
                encodeURIComponent(
                    sessionId
                )
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

        if (!response.ok) {

            throw new Error(
                "HTTP " +
                response.status
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


        const data =
            await response.json();
        const detected =
          detectActions(
            userMessage
          );


console.log(
            "Historial recibido:",
            data
          "Bruce recibe:",
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
            !Array.isArray(
                data.history
            )
          detected.type === "direct"
) {

            return;
        }
          const action =
            detected.actions[0];


        // Limpiar conversación visual
        chat.innerHTML = "";
          let responseText =
            "Hecho.";


        // Cargar mensajes
        for (
            const message
            of data.history
        ) {
          if (
            action.type ===
            "shutdown_pc"
          ) {

            if (
                message.role ===
                "user"
            ) {

                addMessage(
                    message.content,
                    "user"
                );

            } else if (
                message.role ===
                "assistant"
            ) {

                addMessage(
                    message.content,
                    "bruce"
                );
            }
        }
            responseText =
              "El ordenador se apagará en 30 segundos.";

          } else if (
            action.type ===
            "cancel_shutdown"
          ) {

        // Si no hay historial
        if (
            data.history.length === 0
        ) {
            responseText =
              "He cancelado el apagado.";

            addMessage(
                "Buenas. Soy Bruce. ¿En qué puedo ayudarte?",
                "bruce"
            );
        }
          } else if (
            action.type ===
            "stop_agent"
          ) {

            responseText =
              "Bruce entrando en modo de espera.";

    } catch (error) {
          } else if (
            action.type ===
            "wake_agent"
          ) {

        console.error(
            "No se pudo cargar el historial:",
            error
        );
    }
}
            responseText =
              "Bruce está activo.";
          }


// =====================================================
// FORMULARIO
// =====================================================
          await saveMessage(
            env,
            sessionId,
            "user",
            userMessage
          );

if (inputArea) {

    inputArea.addEventListener(
        "submit",
        function(event) {
          await saveMessage(
            env,
            sessionId,
            "assistant",
            responseText
          );

            event.preventDefault();

            sendMessage();
        }
    );
}
          return json({
            response:
              responseText,

            actions:
              detected.actions,
          });
        }

// =====================================================
// ENTER
// =====================================================

if (input) {
        /* =================================================
           COMANDO LOCAL
        ================================================= */

    input.addEventListener(
        "keydown",
        function(event) {
        if (
          detected.type === "command"
        ) {

            if (
                event.key === "Enter" &&
                !event.shiftKey
            ) {
          const responseText =
            detected.actions.some(
              (action) =>
                wantsClose(
                  normalizeText(
                    action.command
                  )
                )
            )
              ? "Cerrando."
              : "Abriendo.";

                event.preventDefault();

                sendMessage();
            }
        }
    );
}
          await saveMessage(
            env,
            sessionId,
            "user",
            userMessage
          );


// =====================================================
// MICRÓFONO
// =====================================================
          await saveMessage(
            env,
            sessionId,
            "assistant",
            responseText
          );

if (micButton) {

    micButton.addEventListener(
        "click",
        function() {
          return json({
            response:
              responseText,

            /*
             * Reconocimiento de voz del navegador.
             *
             * Si el navegador no lo soporta,
             * no hacemos nada.
             */
            actions:
              detected.actions,
          });
        }

            const SpeechRecognition =
                window.SpeechRecognition ||
                window.webkitSpeechRecognition;

        /* =================================================
           IA NORMAL
        ================================================= */

            if (!SpeechRecognition) {
        const history =
          await getHistory(
            env,
            sessionId
          );

                console.error(
                    "Este navegador no soporta reconocimiento de voz."
                );

                return;
            }
        const messages = [

          {
            role: "system",

            const recognition =
                new SpeechRecognition();
            content:
              "You are Bruce, a personal AI assistant. " +
              "Respond in Spanish by default. " +
              "Be concise, intelligent, calm and useful. " +
              "Your personality is serious, sophisticated " +
              "and efficient. " +
              "Do not claim to have opened, closed or " +
              "controlled anything unless an actual action " +
              "has been returned by the system.",
          },

          ...history,

            recognition.lang =
                "es-ES";
          {
            role: "user",
            content: userMessage,
          },
        ];


            recognition.continuous =
                false;
        const responseText =
          await generateAIResponse(
            env,
            messages
          );


            recognition.interimResults =
                false;
        await saveMessage(
          env,
          sessionId,
          "user",
          userMessage
        );


            recognition.onresult =
                function(event) {
        await saveMessage(
          env,
          sessionId,
          "assistant",
          responseText
        );

                    const transcript =
                        event.results[0][0]
                            .transcript;

        return json({
          response:
            responseText,

                    input.value =
                        transcript;
          actions: [],
        });


                    sendMessage();
                };
      } catch (error) {

        console.error(
          "Error /api/chat:",
          error
        );

            recognition.onerror =
                function(error) {

                    console.error(
                        "Error de reconocimiento de voz:",
                        error
                    );
                };
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


            recognition.start();
        }
    );
}
    /* =====================================================
       ASSETS
    ===================================================== */

    if (env.ASSETS) {
      return env.ASSETS.fetch(
        request
      );
    }

// =====================================================
// INICIO
// =====================================================

loadHistory();
    return textResponse(
      "Bruce está funcionando."
    );
  },
};
