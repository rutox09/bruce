javascript
let sessionId =
    localStorage.getItem(
        "bruce_session_id"
    );


if (!sessionId) {

    sessionId =
        crypto.randomUUID();

    localStorage.setItem(
        "bruce_session_id",
        sessionId
    );
}


// =====================================================
// URLS
// =====================================================

const WORKER_URL =
    "https://brucewayne.aleixruto.workers.dev/api/chat";

const AGENT_URL =
    "http://127.0.0.1:8765/action";

const SPEAK_URL =
    "https://brucewayne.aleixruto.workers.dev/api/speak";

const HISTORY_URL =
    "https://brucewayne.aleixruto.workers.dev/api/history";


// =====================================================
// ELEMENTOS
// =====================================================

const chat =
    document.getElementById("chat");

const inputArea =
    document.getElementById("inputArea");

const input =
    document.getElementById("messageInput");

const clearButton =
    document.getElementById("clearChat");


// =====================================================
// MOSTRAR MENSAJE
// =====================================================

function addMessage(
    text,
    type
) {

    const message =
        document.createElement("div");

    message.className =
        "message " + type;

    message.textContent =
        text;

    chat.appendChild(
        message
    );

    chat.scrollTop =
        chat.scrollHeight;
}


// =====================================================
// BRUCE HABLA
// =====================================================

async function speak(
    text
) {

    if (!text) {
        return;
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


        if (!response.ok) {

            const errorText =
                await response.text();

            console.error(
                "Error ElevenLabs:",
                errorText
            );

            return;
        }


        const audioBlob =
            await response.blob();


        const audioUrl =
            URL.createObjectURL(
                audioBlob
            );


        const audio =
            new Audio(
                audioUrl
            );


        audio.volume = 1.0;


        audio.onended =
            function () {

                URL.revokeObjectURL(
                    audioUrl
                );

            };


        await audio.play();


    } catch (error) {

        console.error(
            "No se pudo reproducir la voz:",
            error
        );

    }
}


// =====================================================
// EJECUTAR UNA ACCIÓN
// =====================================================

async function executeAction(
    action
) {

    if (!action) {
        return;
    }


    console.log(
        "Ejecutando acción:",
        action
    );


    try {

        const response =
            await fetch(
                AGENT_URL,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({
                        action: action
                    })
                }
            );


        const data =
            await response.json();


        console.log(
            "Bruce Agent:",
            data
        );


        if (!data.success) {

            console.error(
                "El agente rechazó:",
                data.message
            );

        }


    } catch (error) {

        console.error(
            "Error con Bruce Agent:",
            error
        );

    }
}


// =====================================================
// EJECUTAR VARIAS ACCIONES
// =====================================================

async function executeActions(
    data
) {

    if (
        Array.isArray(
            data.actions
        )
    ) {

        for (
            const action
            of data.actions
        ) {

            await executeAction(
                action
            );

        }

        return;
    }


    if (data.action) {

        await executeAction(
            data.action
        );

    }
}


// =====================================================
// ENVIAR MENSAJE
// =====================================================

async function sendMessage() {

    const text =
        input.value.trim();


    if (!text) {
        return;
    }


    addMessage(
        text,
        "user"
    );


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

                    body: JSON.stringify({

                        message:
                            text,

                        sessionId:
                            sessionId

                    })
                }
            );


        const responseText =
            await response.text();


        console.log(
            "Bruce respondió:",
            responseText
        );


        let data;


        try {

            data =
                JSON.parse(
                    responseText
                );

        } catch {

            addMessage(
                "Respuesta inesperada: " +
                responseText,
                "bruce"
            );

            return;
        }


        if (data.error) {

            addMessage(
                "Error: " +
                data.error,
                "bruce"
            );

            return;
        }


        const reply =
            data.response ||
            "He recibido tu mensaje.";


        addMessage(
            reply,
            "bruce"
        );


        // Bruce habla
        await speak(
            reply
        );


        // Ejecutar acciones
        await executeActions(
            data
        );


    } catch (error) {

        console.error(
            error
        );


        addMessage(
            "Error de conexión: " +
            error.message,
            "bruce"
        );

    }
}


// =====================================================
// CARGAR HISTORIAL
// =====================================================

async function loadHistory() {

    try {

        const response =
            await fetch(
                HISTORY_URL +
                "?sessionId=" +
                encodeURIComponent(
                    sessionId
                )
            );


        const data =
            await response.json();


        console.log(
            "Historial recibido:",
            data
        );


        // IMPORTANTE:
        // El Worker devuelve "history",
        // no "messages".

        if (
            !Array.isArray(
                data.history
            )
        ) {

            return;
        }


        // Ocultamos el mensaje inicial
        // del HTML porque vamos a cargar
        // el historial real.

        chat.innerHTML = "";


        for (
            const message
            of data.history
        ) {

            if (
                message.role ===
                "user"
            ) {

                addMessage(
                    message.content,
                    "user"
                );

            }


            if (
                message.role ===
                "assistant"
            ) {

                addMessage(
                    message.content,
                    "bruce"
                );

            }

        }


        // Si no hay historial,
        // mostramos mensaje inicial.

        if (
            data.history.length === 0
        ) {

            addMessage(
                "Buenas. Soy Bruce. ¿En qué puedo ayudarte?",
                "bruce"
            );

        }


    } catch (error) {

        console.error(
            "No se pudo cargar el historial:",
            error
        );

    }
}


// =====================================================
// BORRAR CONVERSACIÓN
// =====================================================

async function clearConversation() {

    const confirmed =
        confirm(
            "¿Quieres borrar toda la conversación?"
        );


    if (!confirmed) {
        return;
    }


    try {

        const response =
            await fetch(
                HISTORY_URL +
                "?sessionId=" +
                encodeURIComponent(
                    sessionId
                ),
                {
                    method: "DELETE"
                }
            );


        const data =
            await response.json();


        if (!response.ok) {

            throw new Error(
                data.error ||
                "No se pudo borrar la conversación."
            );

        }


        // Limpiar pantalla

        chat.innerHTML = "";


        // Mensaje inicial

        addMessage(
            "Buenas. Soy Bruce. ¿En qué puedo ayudarte?",
            "bruce"
        );


        console.log(
            "Conversación eliminada."
        );


    } catch (error) {

        console.error(
            "Error borrando conversación:",
            error
        );


        addMessage(
            "No se pudo borrar la conversación.",
            "bruce"
        );

    }
}


// =====================================================
// FORMULARIO
// =====================================================

if (inputArea) {

    inputArea.addEventListener(
        "submit",
        function(event) {

            event.preventDefault();

            sendMessage();

        }
    );

}


// =====================================================
// BOTÓN BORRAR
// =====================================================

if (clearButton) {

    clearButton.addEventListener(
        "click",
        clearConversation
    );

}


// =====================================================
// INICIO
// =====================================================

loadHistory();

