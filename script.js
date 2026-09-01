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
// MOSTRAR MENSAJES
// =====================================================

function addMessage(text, type) {

    const message =
        document.createElement("div");

    message.className =
        "message " + type;

    message.textContent =
        text;

    chat.appendChild(message);

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

    utterance.lang =
        "es-ES";

    utterance.rate =
        1;

    utterance.pitch =
        1;

    utterance.volume =
        1;

    const voices =
        speechSynthesis.getVoices();

    const spanishVoice =
        voices.find(
            voice =>
                voice.lang &&
                voice.lang.toLowerCase()
                    .startsWith("es")
        );

    if (spanishVoice) {
        utterance.voice =
            spanishVoice;
    }

    speechSynthesis.speak(
        utterance
    );
}


// =====================================================
// EJECUTAR ACCIÓN EN EL PC
// =====================================================

async function executeAction(action) {

    if (!action) {
        return;
    }

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
                "El agente rechazó la acción:",
                data.message
            );
        }

    } catch (error) {

        console.error(
            "No se pudo conectar con Bruce Agent:",
            error
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


    // Mostrar mensaje del usuario

    addMessage(
        text,
        "user"
    );


    // Limpiar entrada

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
                        message: text,
                        sessionId: sessionId
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

        } catch (error) {

            addMessage(
                "Bruce ha devuelto una respuesta inesperada: " +
                responseText,
                "bruce"
            );

            return;
        }


        // Error del Worker

        if (data.error) {

            addMessage(
                "Error: " +
                data.error,
                "bruce"
            );

            return;
        }


        // Respuesta de Bruce

        const responseTextBruce =
            data.response ||
            "No tengo ninguna respuesta.";


        addMessage(
            responseTextBruce,
            "bruce"
        );


        // Bruce habla

        speak(
            responseTextBruce
        );


        // Ejecutar acción

        if (data.action) {

            await executeAction(
                data.action
            );
        }


    } catch (error) {

        addMessage(
            "Error de conexión: " +
            error.message,
            "bruce"
        );

        console.error(
            error
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
            "No se pudo cargar la conversación:",
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

            micButton.textContent =
                "🔴";

            micButton.title =
                "Bruce está escuchando...";
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

            micButton.textContent =
                "🎙️";

            micButton.title =
                "Hablar con Bruce";
        };


    recognition.onend =
        function() {

            micButton.textContent =
                "🎙️";

            micButton.title =
                "Hablar con Bruce";
        };


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


} else {

    console.warn(
        "SpeechRecognition no está disponible."
    );


    micButton.disabled =
        true;


    micButton.title =
        "Tu navegador no soporta reconocimiento de voz";
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
// CARGAR VOCES
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
