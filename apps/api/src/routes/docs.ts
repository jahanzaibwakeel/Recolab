import { Router } from "express";
import { openApiDocument } from "../docs/openapi.js";

export const docsRouter = Router();

docsRouter.get("/openapi.json", (_req, res) => {
  res.json(openApiDocument);
});

docsRouter.get("/docs", (_req, res) => {
  res.type("html").send(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>RecoLab API Docs</title>
    <style>
      body { margin: 0; font-family: Inter, system-ui, sans-serif; background: #fbfaf6; color: #171a1f; }
      header { padding: 24px 28px; background: #13231f; color: #f8f4ea; }
      main { max-width: 1100px; margin: 0 auto; padding: 24px; }
      section { background: white; border: 1px solid #ddd8cb; border-radius: 8px; padding: 16px; margin-bottom: 12px; }
      code { background: #f1f6f4; padding: 2px 5px; border-radius: 4px; }
      a { color: #24745a; }
      .method { display: inline-block; min-width: 58px; font-weight: 800; color: #24745a; }
    </style>
  </head>
  <body>
    <header>
      <strong>RecoLab API Docs</strong>
      <p>OpenAPI JSON: <a href="/openapi.json">/openapi.json</a></p>
    </header>
    <main>
      <section>
        <h2>Auth</h2>
        <p><span class="method">POST</span><code>/auth/login</code> with <code>ada@recolab.local</code> and <code>recolab-demo</code>.</p>
        <p>Use <code>Authorization: Bearer &lt;token&gt;</code> for protected admin routes.</p>
      </section>
      ${Object.entries(openApiDocument.paths).map(([path, methods]) => `
        <section>
          <h3><code>${path}</code></h3>
          ${Object.entries(methods).map(([method, spec]: [string, any]) => `
            <p><span class="method">${method.toUpperCase()}</span>${spec.summary ?? ""}</p>
          `).join("")}
        </section>
      `).join("")}
    </main>
  </body>
</html>`);
});

