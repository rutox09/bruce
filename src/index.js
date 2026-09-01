export default {
  async fetch(request, env) {
    if (request.method === "POST") {
      return new Response(
        JSON.stringify({
          response: "Prueba correcta. Bruce recibe mensajes."
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*"
          }
        }
      );
    }

    return env.ASSETS.fetch(request);
  }
};
