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

const micButton =
    document.getElementById("micButton");


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
// BRUCE HABLA
// =====================================================

function speak(text) {

    if (!("speechSynthesis" in window)) {
        console.warn(
            "Este navegador no soporta síntesis de voz."
        );
        return;
    }

    speechSynthesis.cancel();

    const utterance =
        new SpeechSynthesisUtterance(text);

    // Español
    utterance.lang = "es-ES";

    // Voz más lenta y grave
    utterance.rate = 0.88;
    utterance.pitch = 0.65;
    utterance.volume = 1.0;

    const voices =
        speechSynthesis.getVoices();

    // Intentar encontrar una voz masculina española
    const preferredNames = [
        "Microsoft Jorge",
        "Microsoft Pablo",
        "Microsoft Alvaro",
        "Google español",
        "Google español de España"
    ];

    let selectedVoice = null;

    for (const name of preferredNames) {

        selectedVoice =
            voices.find(
                voice =>
                    voice.name
                        .toLowerCase()
                        .includes(
                            name.toLowerCase()
                        )
            );

        if (selectedVoice) {
            break;
        }
    }

    // Si no encontramos una concreta,
    // buscar cualquier voz española
    if (!selectedVoice) {

        selectedVoice =
            voices.find(
                voice =>
                    voice.lang &&
                    voice.lang
                        .toLowerCase()
                        .startsWith("es")
            );
    }

    if (selectedVoice) {

        utterance.voice =
            selectedVoice;

        console.log(
            "Voz de Bruce:",
            selectedVoice.name
        );
    }

    speechSynthesis.speak(
        utterance
    );
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

    // Sistema nuevo
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


    // Compatibilidad con el sistema antiguo
    if (data.action) {

        await executeAction(
            data.action
        );
    }
}


// =====================================================
// ENVIAR MENSAJE
// =====================================================

async function sendMessage(text = null) {

    if (text === null) {

        text =
            input.value.trim();
    }


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
        // RESPUESTA
        // =================================================

        const bruceResponse =
            data.response ||
            "He recibido tu mensaje.";


        addMessage(
            bruceResponse,
            "bruce"
        );


        // =================================================
        // HACER QUE BRUCE HABLE
        // =================================================

        speak(
            bruceResponse
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
// RECONOCIMIENTO DE VOZ
// =====================================================

const SpeechRecognition =
    window.SpeechRecognition ||
    window.webkitSpeechRecognition;


let recognition = null;


if (SpeechRecognition) {

    recognition =
        new SpeechRecognition();


    recognition.lang =
        "es-ES";


    recognition.interimResults =
        false;


    recognition.continuous =
        false;


    recognition.maxAlternatives =
        1;


    recognition.onstart =
        function() {

            console.log(
                "Bruce está escuchando..."
            );


            if (micButton) {

                micButton.textContent =
                    "🔴";

                micButton.title =
                    "Bruce está escuchando...";
            }
        };


    recognition.onresult =
        function(event) {

            const transcript =
                event
                    .results[0][0]
                    .transcript
                    .trim();


            console.log(
                "Has dicho:",
                transcript
            );


            input.value =
                transcript;


            sendMessage(
                transcript
            );
        };


    recognition.onerror =
        function(event) {

            console.error(
                "Error de reconocimiento:",
                event.error
            );


            if (micButton) {

                micButton.textContent =
                    "🎙️";

                micButton.title =
                    "Hablar con Bruce";
            }
        };


    recognition.onend =
        function() {

            if (micButton) {

                micButton.textContent =
                    "🎙️";

                micButton.title =
                    "Hablar con Bruce";
            }
        };


    if (micButton) {

        micButton.addEventListener(
            "click",
            function() {

                try {

                    recognition.start();

                } catch (error) {

                    console.error(
                        "No se pudo iniciar el micrófono:",
                        error
                    );
                }
            }
        );
    }


} else {

    console.warn(
        "SpeechRecognition no está disponible."
    );


    if (micButton) {

        micButton.disabled =
            true;

        micButton.title =
            "Tu navegador no soporta reconocimiento de voz";
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
// VOCES
// =====================================================

if (
    "speechSynthesis" in window
) {

    speechSynthesis.onvoiceschanged =
        function() {

            console.log(
                "Voces disponibles:",
                speechSynthesis
                    .getVoices()
                    .length
            );
        };
}


// =====================================================
// HISTORIAL
// =====================================================

loadHistory();
