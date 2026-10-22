# Agent Job

Agente de IA para ayudarte a buscar trabajo IT, pensado para funcionar de manera local, sin necesidad de pasar por otro *harness* como claude code, codex, opencode, etc.

Hecho con Nuxt 4, Tanstack/AI, Drizzle ORM, SQLite.

El agente usa openai-compatible, por lo que puedes usar tanto modelos locales (ollama, llama.cpp), como servicios en la nube (nvidia nim, openrouter) 

## NOTAS
*Requiere NodeJS 22 o superior

Internamente usa el MCP de Tavily para realizar la busqueda y extracción de ofertas. Por lo que es necesario tener una api key.

Puedes conseguir tu api key en https://www.tavily.com


## Setup

Copia el .env.example y renombralo a .env y coloca tus apis de tavily, nombre de tu bd de sqlite, url del endpoint de tu servicio de llm.

*Nota:* Si usas un modelo local, puedes colocar cualquier texto en NUXT_MODEL_API_KEY y NUXT_MODEL, pero debe contener un string para que funcione.


---
Instala las dependencias:

```bash
pnpm install
```

Puedes correr el proyecto en desarrollo y verlo en `http://localhost:3000`
```bash
pnpm dev
```
---
Tambien puedes correr el proyecto en producción con:

```bash
pnpm build
```

Y correr el siguiente comando para visualizarlo en `http://localhost:3000`

```bash
pnpm start
```

