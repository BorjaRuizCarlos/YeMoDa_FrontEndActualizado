# ABCDH Project Intelligence Platform

Una plataforma de gestión de proyectos y seguimiento de tareas diseñada para ayudar a los equipos a planificar, organizar y monitorear su trabajo de manera eficiente.

La aplicación permite crear y administrar proyectos, tareas e incidencias, asignarlas a miembros del equipo y dar seguimiento a su progreso a lo largo del flujo de trabajo. Su objetivo es centralizar la gestión del trabajo en un solo lugar, facilitando la colaboración, la visibilidad del progreso y la organización de las actividades del equipo.

---

## Tech Stack

Esta aplicación está construida con el siguiente stack tecnológico:

* **Frontend:** React
* **Backend:** Django
* **Base de datos:** PostgreSQL

---

## Arquitectura

La aplicación sigue una arquitectura cliente-servidor:

* **React** se encarga de la interfaz de usuario y la experiencia en el navegador.
* **Django** provee la API y la lógica de negocio del backend.
* **PostgreSQL** almacena y gestiona los datos de la aplicación.

```
React (Frontend)
       │
       ▼
Django API (Backend)
       │
       ▼
PostgreSQL (Database)
```

---

## Stack Detallado

| Capa     | Tecnología | Descripción                                                 |
| -------- | ---------- | ----------------------------------------------------------- |
| Frontend | React      | Framework para construir interfaces de usuario interactivas |
| Backend  | Django     | Framework web en Python para APIs y lógica del servidor     |
| Database | PostgreSQL | Sistema de base de datos relacional robusto                 |

---

## Diagrama de Componentes

![Diagrama de Componentes](DiagramaComp.png)

---

## Variables de entorno (build-time, públicas)

Todo lo que empieza con `VITE_` se incrusta en el bundle del navegador — **nunca pongas secretos ahí**. Ver `.env.example`.

| Variable | Descripción |
|----------|-------------|
| `VITE_API_TARGET` | Origen del backend Django (prod: `https://api.yemoda.site/api`; dev local: `http://127.0.0.1:8001`). El proxy de Vite en desarrollo reescribe `/api`. |
| `VITE_GOOGLE_AUTH_START_URL` | URL del backend que inicia el OAuth de Google. |

---

## Seguridad y endurecimiento

Tras una auditoría de seguridad/calidad del cliente, se aplicaron los siguientes controles. **El backend es la autoridad de autorización**; el frontend solo refleja esas reglas en la UI.

### Cabeceras de seguridad (CSP) — `vercel.json`
Se entregan en todas las rutas:
- **Content-Security-Policy**: `default-src 'self'`; `script-src 'self'` (sin inline); `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`; `img-src 'self' data: https:`; `font-src 'self' data: https: https://fonts.gstatic.com`; `connect-src 'self' https://api.yemoda.site https://fast.yemoda.site`; `object-src 'none'`; `base-uri 'self'`; `frame-ancestors 'none'`.
- **X-Frame-Options: DENY**, **X-Content-Type-Options: nosniff**, **Referrer-Policy: strict-origin-when-cross-origin**.
> Si agregas un origen externo (analytics, CDN, fuentes, un dominio de API nuevo) debes añadirlo a la directiva correspondiente de la CSP o el navegador lo bloqueará. Verifica siempre en un *preview* de Vercel antes de producción.

### Manejo de tokens y sesión
- **El refresh token vive en una cookie `HttpOnly`** que pone el backend (no legible por JS → no exfiltrable por XSS). El frontend solo guarda el **access token** (corto) en `localStorage` y envía `credentials: 'include'` en las llamadas. El refresh y el logout pasan por la cookie (`POST /api/auth/logout/` la borra).
- En los callbacks OAuth, **solo el access token llega en el fragmento de URL**; el refresh nunca aparece en la URL (lo entrega la cookie).
- Al cargar la app: si el access token está vigente se restaura la sesión; si falta o expiró, se intenta un **refresh silencioso vía la cookie** y solo si falla se cierra sesión. Se valida también la forma de `pip_user`.
- Al **cerrar sesión o expirar la sesión** se barren todas las claves `pip_*` (access token, usuario, nickname, caché de repos) y el backend borra la cookie de refresh.
- El stream de chat reusa la misma lógica central de refresh/401 + evento de sesión expirada.
- **Migración sin re-login:** el `/auth/refresh/` acepta el refresh por cookie o, como fallback, en el body (clientes con un token antiguo en `localStorage`); tras el primer refresh se migra a la cookie y se borra el valor legacy. Para que la cookie funcione, el backend necesita `CORS_ALLOWED_ORIGINS` explícito + `CORS_ALLOW_CREDENTIALS=true` (ya configurado).

### Gating de RBAC en la UI
La UI respeta las capacidades reales del proyecto (vía `GET /api/projects/{id}/my-permissions/`): `can_comment`, `can_trigger_ai`, `can_manage_board`, `can_delete_tasks`, `can_manage_project`, y el tope `max_move_column` (no se puede arrastrar una tarea más allá de la columna permitida). Se eliminaron los heurísticos legacy por nombre de rol (IDs adivinados / coincidencia por substring).

### Higiene de datos y build
- En el build de producción se **eliminan `console`/`debugger`** (`vite.config.ts`); los errores de API ya no vuelcan el cuerpo de la respuesta a la consola.
- Las exportaciones **CSV y XLSX neutralizan fórmulas** (prefijo `'` en celdas que empiezan con `= + - @`) para evitar inyección de fórmulas en Excel/Sheets.
- Los tokens de OAuth y de verificación de email se limpian de la URL (`history.replaceState`).
- Los `href` derivados de datos validan el esquema (`https?:`) antes de renderizarse.

---

## Educación / Aprendizaje

La sección de aprendizaje vive en la ruta `/education` y está pensada para que el equipo pueda añadir contenido sin escribir HTML cada vez.

- El contenido principal está en `src/app/data/educationContent.ts`.
- Cada tema tiene su lista de subtemas y cada subtema incluye un bloque de texto en formato markdown simple.
- Para agregar una lección, basta con añadir un nuevo objeto dentro de `educationTopics`.
- La UI renderiza automáticamente títulos, listas, citas y bloques de código, así que el equipo solo se encarga del contenido.

Ejemplo de estructura:

```ts
{
  id: 'javascript',
  title: 'JavaScript moderno',
  description: 'Conceptos clave para la web.',
  subtopics: [
    {
      id: 'async-await',
      title: 'Async / Await',
      summary: 'Cómo manejar tareas asíncronas.',
      content: '## Async / Await\n\n...'
    }
  ]
}
```

Cuando quieras evolucionar esto hacia un CMS real, la siguiente fase ideal es mover ese contenido a Markdown/JSON en un backend o un panel administrativo.