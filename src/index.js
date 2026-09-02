// EJECUTAR UNA ACCIÓN
// =====================================================

async function executeAction(
    action
) {
async function executeAction(action) {

if (!action) {
return;
}


console.log(
"Ejecutando acción:",
action
);

    // =================================================
    // COMPATIBILIDAD CON ACCIONES ANTIGUAS
    // =================================================

    try {
    let finalAction = action;

    if (
        action.type === "website" &&
        action.target
    ) {

        finalAction = {
            type: "command",
            command: "abre " + action.target
        };

        /*
         * IMPORTANTE:
         *
         * El Bruce Agent espera recibir:
         *
         * {
         *   "type": "command",
         *   "command": "cierra powershell"
         * }
         *
         * Por eso enviamos directamente `action`.
         *
         * NO usamos:
         *
         * {
         *   "action": action
         * }
         */
    } else if (
        action.type === "app" &&
        action.target
    ) {

        finalAction = {
            type: "command",
            command: "abre " + action.target
        };

    } else if (
        action.type === "game" &&
        action.target
    ) {

        finalAction = {
            type: "command",
            command: "abre " + action.target
        };

    } else if (
        action.type === "close_website" &&
        action.target
    ) {

        finalAction = {
            type: "command",
            command: "cierra " + action.target
        };

    } else if (
        action.type === "close" &&
        action.target
    ) {

        finalAction = {
            type: "command",
            command: "cierra " + action.target
        };
    }


    console.log(
        "Acción enviada al agente:",
        finalAction
    );


    // =================================================
    // ENVIAR AL BRUCE AGENT
    // =================================================

    try {

const response =
await fetch(
@@ -225,7 +270,7 @@ async function executeAction(

body:
JSON.stringify(
                            action
                            finalAction
)
}
);
