let sessionId = localStorage.getItem("bruce_session_id");

if (!sessionId) {
sessionId = crypto.randomUUID();
localStorage.setItem("bruce_session_id", sessionId);
}

const WORKER_URL = "https://brucewayne.aleixruto.workers.dev/api/chat";

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

console.log("Bruce respondió:", responseText);

let data;

try {
  data = JSON.parse(responseText);
} catch (error) {
  addMessage(
    "Bruce ha devuelto una respuesta inesperada: " + responseText,
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

addMessage(
  data.response,
  "bruce"
);


} catch (error) {

  addMessage(
    "Error de conexión: " + error.message,
    "bruce"
  );

  console.error(error);
}
}

inputArea.addEventListener(
"submit",
function(event) {
event.preventDefault();
sendMessage();
}
);
