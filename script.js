let sessionId = localStorage.getItem("bruce_session_id");

if (!sessionId) {
  sessionId = crypto.randomUUID();
  localStorage.setItem("bruce_session_id", sessionId);
}

const WORKER_URL = "https://brucewayne.aleixruto.workers.dev/api/chat";
const AGENT_URL = "http://127.0.0.1:8765/action";

const chat = document.getElementById("chat");
const inputArea = document.getElementById("inputArea");
const input = document.getElementById("messageInput");

function addMessage(text, type) {
  const message = document.createElement("div");

  message.className = "message " + type;
  message.textContent = text;

  chat.appendChild(message);
  chat.scrollTop = chat.scrollHeight;
}

// =========================
// EJECUTAR ACCIÓN EN EL PC
// =========================

async function executeAction(action) {
  if (!action) {
    return;
  }

  try {
    const response = await fetch(AGENT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        action: action
      })
    });

    const data = await response.json();

    console.log("Bruce Agent:", data);

    if (!data.success) {
      console.error("El agente rechazó la acción:", data.message);
    }

  } catch (error) {
    console.error(
      "No se pudo conectar con Bruce Agent:",
      error
    );
  }
}

// =========================
// ENVIAR MENSAJE
// =========================

async function sendMessage() {
  const text = input.value.trim();

  if (!text) {
    return;
  }

  addMessage(text, "user");

  input.value = "";

  try {
    const response = await fetch(WORKER_URL, {
      method: "POST",

      headers: {
        "Content-Type": "application/json"
      },

      body: JSON.stringify({
        message: text,
        sessionId: sessionId
      })
    });

    const responseText = await response.text();

    console.log(
      "Bruce respondió:",
      responseText
    );

    let data;

    try {
      data = JSON.parse(responseText);

    } catch (error) {

      addMessage(
        "Bruce ha devuelto una respuesta inesperada: " +
        responseText,
        "bruce"
      );

      return;
    }

    if (data.error) {

      addMessage(
        "Error: " + data.error,
        "bruce"
      );

      return;
    }

    // Mostrar respuesta de Bruce

    addMessage(
      data.response,
      "bruce"
    );

    // Ejecutar acción si Bruce la ha solicitado

    if (data.action) {
      await executeAction(data.action);
    }

  } catch (error) {

    addMessage(
      "Error de conexión: " +
      error.message,
      "bruce"
    );

    console.error(error);
  }
}

// =========================
// HISTORIAL
// =========================

async function loadHistory() {

  try {

    const response = await fetch(
      WORKER_URL.replace("/api/chat", "/api/history") +
      "?sessionId=" +
      encodeURIComponent(sessionId)
    );

    const data = await response.json();

    if (!data.messages) {
      return;
    }

    for (const message of data.messages) {

      if (message.role === "user") {
        addMessage(
          message.content,
          "user"
        );
      }

      if (message.role === "assistant") {
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

// =========================
// FORMULARIO
// =========================

inputArea.addEventListener(
  "submit",
  function(event) {

    event.preventDefault();

    sendMessage();

  }
);

loadHistory();
