// =====================================================
// SESIÓN
// =====================================================

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

const micButton =
    document.getElementById("micButton");


// =====================================================
// MOSTRAR MENSAJE
// =====================================================

function addMessage(
    text,
    type
) {

    if (!chat) {
        return;
    }

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

async function speak(text) {

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

    let finalAction = action;

    if (
        action.type === "website" &&
        action.target
    ) {

        finalAction = {
            type: "command",
            command: "abre " + action.target
        };

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
                AGENT_URL,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify(
                            finalAction
                        )
                }
            );


        const responseText =
            await response.text();


        console.log(
            "Respuesta HTTP del agente:",
            responseText
        );


        let data;

        try {

            data =
                JSON.parse(
                    responseText
                );

        } catch {

            data = {
                success: false,
                message:
                    "Respuesta inválida del Bruce Agent."
            };
        }


        console.log(
            "Bruce Agent:",
            data
        );


        if (!response.ok) {

            console.error(
                "Bruce Agent HTTP:",
                response.status,
                data
            );

            return;
        }


        if (!data.success) {

            console.error(
                "El agente rechazó:",
                data.message
            );

        } else {

            console.log(
                "Acción ejecutada correctamente:",
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
        data &&
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


    /*
     * Compatibilidad con respuestas antiguas
     * que todavía puedan enviar `action`.
     */

    if (
        data &&
        data.action
    ) {

        await executeAction(
            data.action
        );
    }
}


// =====================================================
// ENVIAR MENSAJE
// =====================================================

async function sendMessage() {

    if (!input) {
        return;
    }


    const text =
        input.value.trim();


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


        // =============================================
        // ERROR DEL WORKER
        // =============================================

        if (data.error) {

            addMessage(
                "Error: " +
                data.error,
                "bruce"
            );

            return;
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


        // =============================================
        // VOZ
        // =============================================

        await speak(
            reply
        );


        // =============================================
        // ACCIONES
        // =============================================

        await executeActions(
            data
        );


    } catch (error) {

        console.error(
            "Error enviando mensaje:",
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

    if (!chat) {
        return;
    }


    try {

        const response =
            await fetch(
                HISTORY_URL +
                "?sessionId=" +
                encodeURIComponent(
                    sessionId
                )
            );


        if (!response.ok) {

            throw new Error(
                "HTTP " +
                response.status
            );
        }


        const data =
            await response.json();


        console.log(
            "Historial recibido:",
            data
        );


        if (
            !Array.isArray(
                data.history
            )
        ) {

            return;
        }


        // Limpiar conversación visual
        chat.innerHTML = "";


        // Cargar mensajes
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


        // Si no hay historial
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
// ENTER
// =====================================================

if (input) {

    input.addEventListener(
        "keydown",
        function(event) {

            if (
                event.key === "Enter" &&
                !event.shiftKey
            ) {

                event.preventDefault();

                sendMessage();
            }
        }
    );
}


// =====================================================
// MICRÓFONO
// =====================================================

if (micButton) {

    micButton.addEventListener(
        "click",
        function() {

            /*
             * Reconocimiento de voz del navegador.
             *
             * Si el navegador no lo soporta,
             * no hacemos nada.
             */

            const SpeechRecognition =
                window.SpeechRecognition ||
                window.webkitSpeechRecognition;


            if (!SpeechRecognition) {

                console.error(
                    "Este navegador no soporta reconocimiento de voz."
                );

                return;
            }


            const recognition =
                new SpeechRecognition();


            recognition.lang =
                "es-ES";


            recognition.continuous =
                false;


            recognition.interimResults =
                false;


            recognition.onresult =
                function(event) {

                    const transcript =
                        event.results[0][0]
                            .transcript;


                    input.value =
                        transcript;


                    sendMessage();
                };


            recognition.onerror =
                function(error) {

                    console.error(
                        "Error de reconocimiento de voz:",
                        error
                    );
                };


            recognition.start();
        }
    );
}


// =====================================================
// INICIO
// =====================================================

loadHistory();
