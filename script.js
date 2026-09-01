let sessionId = localStorage.getItem("bruce_session_id");

if (!sessionId) {
    sessionId = crypto.randomUUID();

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


// =====================================================
// ELEMENTOS
// =====================================================

const chat =
    document.getElementById("chat");

const inputArea =
    document.getElementById("inputArea");

const input =
    document.getElementById("messageInput");


// =====================================================
// MOSTRAR MENSAJE
// =====================================================

function addMessage(text, type) {

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
// EJECUTAR UNA ACCIÓN
// =====================================================

async function executeAction(action) {

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
            "Respuesta de Bruce Agent:",
            data
        );


        if (!data.success) {

            console.error(
                "Bruce Agent rechazó la acción:",
                data.message
            );
        }


    } catch (error) {

        console.error(
            "Error conectando con Bruce Agent:",
            error
        );
    }
}


// =====================================================
// EJECUTAR TODAS LAS ACCIONES
// =====================================================

async function executeActions(data) {

    // Nuevo sistema: varias acciones

    if (
        Array.isArray(
            data.actions
        )
    ) {

        console.log(
            "Acciones recibidas:",
            data.actions
        );

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


    // Sistema antiguo: una acción

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

        console.log(
            "Enviando a Bruce:",
            text
        );


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
            "Respuesta completa de Bruce:",
            responseText
        );


        let data;


        try {

            data =
                JSON.parse(
                    responseText
                );

        } catch (error) {

            addMessage(
                "Bruce ha devuelto una respuesta inesperada: " +
                responseText,
                "bruce"
            );

            return;
        }


        // =================================================
        // ERROR
        // =================================================

        if (data.error) {

            addMessage(
                "Error: " +
                data.error,
                "bruce"
            );

            return;
        }


        // =================================================
        // RESPUESTA DE BRUCE
        // =================================================

        addMessage(
            data.response ||
            "He recibido tu mensaje.",
            "bruce"
        );


        // =================================================
        // EJECUTAR ACCIONES
        // =================================================

        await executeActions(
            data
        );


    } catch (error) {

        console.error(
            "Error general:",
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
// HISTORIAL
// =====================================================

async function loadHistory() {

    try {

        const historyURL =
            WORKER_URL.replace(
                "/api/chat",
                "/api/history"
            ) +
            "?sessionId=" +
            encodeURIComponent(
                sessionId
            );


        const response =
            await fetch(
                historyURL
            );


        const data =
            await response.json();


        if (!data.messages) {
            return;
        }


        for (
            const message
            of data.messages
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


    } catch (error) {

        console.error(
            "No se pudo cargar el historial:",
            error
        );
    }
}


// =====================================================
// FORMULARIO
// =====================================================

inputArea.addEventListener(
    "submit",
    function(event) {

        event.preventDefault();

        sendMessage();
    }
);


// =====================================================
// INICIO
// =====================================================

loadHistory();
