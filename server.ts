import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import cors from "cors";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Utilize the cors middleware with standard configuration
  app.use(cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  }));

  // Fix: express.json must be called to return the middleware function
  app.use(express.json());

  // API Route for SQL translation proxy
  app.post("/api/translate", async (req, res) => {
    try {
      const { text, language } = req.body;

      if (!text || !language) {
        return res.status(400).json({ error: "Parâmetros 'text' e 'language' são obrigatórios." });
      }

      console.log(`Translating SQL SQL-Parser to: ${language}`);

      // const response = await fetch(
      //   `https://fix-sql.onrender.com/translate?text=${text}&language=${language}`, {
      //        method: "POST"
      // });

      const URL_API = 'https://fix-sql.onrender.com/translate'

      const queryParams = new URLSearchParams({text: text, language: language});

      const response = await fetch(
        `${URL_API}?${queryParams.toString()}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            // body: JSON.stringify({text: text, language: language}),
            mode: 'cors', // Garante o suporte a Cross-Origin
            credentials: 'omit' // Ou 'same-origin' / 'include'
      });

      if (!response.ok) {
        // Fallback or read raw text
        const errorText = await response.text();
        return res.status(response.status).json({
          error: "Erro na API externa de tradução",
          details: errorText || response.statusText,
        });
      }

      // Read response content (can be JSON or plain text depending on target API format, let's read as text or JSON safely)
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        const data = await response.json();
        return res.json(data);
      } else {
        const textResult = await response.text();
        // Pack into JSON structure so it's consistent
        return res.json({ result: textResult });
      }
    } catch (error: any) {
      console.error("Tradução falhou:", error);
      return res.status(500).json({
        error: "Falha na comunicação com o servidor de tradução.",
        message: error.message,
      });
    }
  });

  // Serve static files / Vite middleware
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
