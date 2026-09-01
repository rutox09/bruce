const WORKER_URL = "https://brucewayne.aleixruto.workers.dev/";

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

inputArea.addEventListener("submit", async function(event) {

event.preventDefault();

const text = input.value.trim();

if (!text) {
return;
}

addMessage(text, "user");

input.value = "";

try {

```
const response = await fetch(WORKER_URL, {
  method: "POST",

  headers: {
    "Content-Type": "application/json"
  },

  body: JSON.stringify({
    message: text
  })
});

const data = await response.json();

if (data.error) {

  addMessage(
    "Error: " + data.error,
    "bruce"
  );

  return;
}

let answer = data.response;

if (
  typeof answer === "object" &&
  answer.response
) {
  answer = answer.response;
}

addMessage(answer, "bruce");
```

} catch (error) {

```
addMessage(
  "No puedo conectar con Bruce.",
  "bruce"
);

console.error(error);
```

}

});

