.run();

} catch (error) {

console.error(
"Error guardando mensaje:",
error
@@ -109,7 +108,6 @@ async function getHistory(
}

try {

const result =
await env.DB
.prepare(
@@ -121,7 +119,6 @@ async function getHistory(
return result.results || [];

} catch (error) {

console.error(
"Error leyendo historial:",
error
@@ -186,6 +183,8 @@ function wantsClose(text) {
"detener",
"quita",
"quitar",
    "termina",
    "terminar",
]);
}

@@ -264,230 +263,377 @@ function detectSystemAction(text) {


/* =========================================================
   ACCIONES
   ACCIONES / COMANDOS
========================================================= */

function detectMultipleActions(message) {

    if (!message) {
        return [];
    }
  if (!message) {
    return [];
  }

    const original = message.trim();
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

    // Quitamos "Bruce" del principio.
    const clean = original
        .replace(/^bruce[\s,:-]*/i, "")
        .trim();

    if (!clean) {
        return [];
    }
  if (!clean) {
    return [];
  }

    const normalized = clean
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");

  const normalized =
    normalizeText(clean);

    // =====================================================
    // COMANDOS DEL PROPIO BRUCE
    // =====================================================

    if (
        normalized.includes("cierra powershell") ||
        normalized.includes("cerrar powershell") ||
        normalized.includes("cierra el powershell") ||
        normalized.includes("cerrar el powershell") ||
        normalized.includes("cierra power shell") ||
        normalized.includes("cerrar power shell")
    ) {
  /* =======================================================
     COMANDOS INTERNOS DE BRUCE
  ======================================================= */

        return [
            {
                type: "command",
                command: "cierra powershell"
            }
        ];
    }

  // ---------------------------------------------------------
  // POWERSHELL
  // ---------------------------------------------------------

    if (
        normalized.includes("reinicia el agente") ||
        normalized.includes("reiniciar el agente") ||
        normalized.includes("reinicia bruce") ||
        normalized.includes("reiniciar bruce")
    ) {
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
                command: "reinicia el agente"
            }
        ];
    }
    return [
      {
        type: "command",
        command: "cierra powershell",
      },
    ];
  }


    if (
        normalized === "reinicia" ||
        normalized === "reiniciar"
    ) {
  // ---------------------------------------------------------
  // REINICIAR AGENTE
  // ---------------------------------------------------------

        return [
            {
                type: "command",
                command: "reinicia el agente"
            }
        ];
    }
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
        normalized.includes("apagate") ||
        normalized.includes("apagate bruce") ||
        normalized.includes("duerme") ||
        normalized.includes("duerme bruce") ||
        normalized.includes("deten el agente") ||
        normalized.includes("para el agente")
    ) {

        return [
            {
                type: "command",
                command: "apagate"
            }
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
        normalized.includes("despiertate") ||
        normalized.includes("despierta bruce") ||
        normalized.includes("despierta el agente") ||
        normalized.includes("activa bruce")
    ) {

        return [
            {
                type: "command",
                command: "despiertate"
            }
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

    if (
        normalized.includes("apaga el ordenador") ||
        normalized.includes("apagar el ordenador") ||
        normalized.includes("apaga el pc") ||
        normalized.includes("apagar el pc")
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

        return [
            {
                type: "command",
                command: "apaga el ordenador"
            }
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
        normalized.includes("cancela el apagado") ||
        normalized.includes("cancelar el apagado")
      startsWithCommand ||
      parts.length === 1
) {

        return [
            {
                type: "command",
                command: "cancela el apagado"
            }
        ];
      actions.push({
        type: "command",
        command: part,
      });
}
  }


    // =====================================================
    // ABRIR / CERRAR ELEMENTOS
    // =====================================================

    const commandWords = [
        "abre ",
        "abrir ",
        "inicia ",
        "iniciar ",
        "ejecuta ",
        "ejecutar ",
        "lanza ",
        "lanzar ",
        "cierra ",
        "cerrar ",
        "termina ",
        "terminar "
    ];
  return actions;
}


    const hasCommandWord =
        commandWords.some(
            word => normalized.includes(word)
        );
/* =========================================================
   DETECT ACTIONS
========================================================= */

function detectActions(message) {

    if (hasCommandWord) {
  const cleanText =
    normalizeText(message);

        // Separar órdenes múltiples:
        //
        // "abre youtube y abre spotify"
        //
        // en:
        //
        // "abre youtube"
        // "abre spotify"

        const parts = clean
            .split(/\s+y\s+/i)
            .map(part => part.trim())
            .filter(Boolean);
  if (!cleanText) {

    return {
      type: "none",
      actions: [],
    };
  }

        const actions = [];

        for (const part of parts) {
  /* =======================================================
     SISTEMA
  ======================================================= */

            const partNormalized = part
                .toLowerCase()
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "");
  const systemAction =
    detectSystemAction(
      cleanText
    );


            const startsWithCommand =
                commandWords.some(
                    word =>
                        partNormalized.startsWith(
                            word.trim()
                        )
                );
  if (systemAction) {

    return {
      type: "direct",
      actions: [
        systemAction
      ],
    };
  }

            if (
                startsWithCommand ||
                parts.length === 1
            ) {

                actions.push({
                    type: "command",
                    command: part
                });
            }
        }
  /* =======================================================
     COMANDOS
  ======================================================= */

  const actions =
    detectMultipleActions(
      message
    );

        if (actions.length > 0) {
            return actions;
        }
    }

  if (
    Array.isArray(actions) &&
    actions.length > 0
  ) {

    return [];
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


@@ -551,7 +697,6 @@ async function generateAIResponse(
if (!content) {

return "No he podido generar una respuesta.";

}


@@ -629,9 +774,7 @@ async function generateVoice(

use_speaker_boost:
true,

},

}),
}
);
@@ -906,7 +1049,7 @@ export default {

const detected =
detectActions(
            cleanText
            userMessage
);


@@ -941,7 +1084,7 @@ export default {
) {

responseText =
              "El ordenador se apagará en 15 segundos.";
              "El ordenador se apagará en 30 segundos.";

} else if (
action.type ===
@@ -992,7 +1135,6 @@ export default {

actions:
detected.actions,

});
}

@@ -1006,10 +1148,55 @@ export default {
"command"
) {

          let responseText =
            wantsClose(cleanText)
              ? "Cerrando."
              : "Abriendo.";
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
@@ -1035,7 +1222,6 @@ export default {

actions:
detected.actions,

});
}

@@ -1073,7 +1259,6 @@ export default {
role: "user",
content: userMessage,
},

];


@@ -1106,7 +1291,6 @@ export default {
responseText,

actions: [],

});

