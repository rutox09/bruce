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
   ACCIONES / COMANDOS
========================================================= */

function detectMultipleActions(message) {

  if (!message) {
    return [];
  }

  const original = String(message).trim();

  // Quitamos "Bruce" únicamente si está al principio.
  // Ejemplo:
  // "Bruce, abre YouTube"
  // -> "abre YouTube"
  const clean = original
    .replace(/^bruce[\s,:-]*/i, "")
    .trim();

  if (!clean) {
    return [];
  }

  const normalized = normalizeText(clean);


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
  // DORMIR AGENTE
  // ---------------------------------------------------------

  if (
    includesAny(normalized, [
      "apagate",
      "apagate bruce",
      "apaga bruce agent",
      "duerme",
      "duerme bruce",
      "deten el agente",
      "detener el agente",
      "para el agente",
      "parar el agente",
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
  // DESPERTAR AGENTE
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


  // =======================================================
  // VARIAS ACCIONES
  // =======================================================

  const parts = clean
    .split(/\s+y\s+/i)
    .map((part) => part.trim())
    .filter(Boolean);


  const actions = [];


  for (const part of parts) {

    const partNormalized =
      normalizeText(part);


    let matched = false;


    // -----------------------------------------------------
    // ABRIR
    // -----------------------------------------------------

    for (const word of openWords) {

      if (
        partNormalized === word ||
        partNormalized.startsWith(word + " ")
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

    for (const word of closeWords) {

      if (
        partNormalized === word ||
        partNormalized.startsWith(word + " ")
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
     PRIMERO: COMANDOS DIRECTOS
  ======================================================= */

  const actions =
    detectMultipleActions(message);


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

