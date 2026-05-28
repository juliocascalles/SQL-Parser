import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import cors from "cors";
import axios from "axios";

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

      console.log(`Translating SQL with axios to: ${language}`);

      const URL_API = 'https://fix-sql.onrender.com/translate';

      const response = await axios.post(
        URL_API,
        null,
        {
          params: { text: text, language: language },
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      const status_code = await response.status

      if (status_code === 200) {
        const data = await response.data
        return res.status(200).json({
          result: data.result
        });
      }

      return res.status(response.status || 400).json({
        error: "Erro na API externa de tradução",
        detail: response.data.detail || "Descrição do erro não fornecida pela API."
      });
    } catch (error: any) {
      console.error("Tradução falhou:", error);
      if (error.response) {
        return res.status(error.response.status || 400).json({
          error: "Erro na API externa de tradução",
          detail: error.response.data?.detail || error.response.data || "Erro retornado pela API de tradução."
        });
      }
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
