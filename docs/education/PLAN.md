# Yemoda for Education — Plan de diseño (v2.1, auditado ×2)

> Documento de diseño del **módulo educativo** de Yemoda: la capa que convierte el motor de
> análisis de código (ya existente) en una plataforma para hackathones de IA por materia, con
> alumnos, profesores y dirección — para el Tec de Monterrey como cliente ancla y diseñada para
> escalar a otras universidades.
>
> **v2** incorporó una auditoría adversarial (5 lentes) contra el código real. **v2.1** incorpora
> una segunda verificación (3 lentes) que cazó un error real —no hacer `password_hash` nullable,
> rompería `check_password` (§2.3)— y aclaró que el refactor del motor (§4) es *diseño decidido,
> implementación de Fase A*. Toda afirmación del plan sobre el código fue verificada como correcta.
>
> **Alcance:** toca ambos repos — `YeMoDa_FrontEndActualizado` (React) y `Yemoda_Backend`
> (Django + FastAPI). Rutas de backend relativas a `Yemoda_Backend/`.

---

## 0. Objetivo y principios

**Objetivo del demo (Fase A):** mostrar al Tec el flujo completo **alumno → profesor → dirección**
con el **motor de análisis real**: un alumno vincula un repo de GitHub, Yemoda lo analiza con IA,
el profesor ve el resultado + pone su nota, y la dirección ve los agregados por carrera/semestre
mapeados a una taxonomía de 6 niveles.

**Visión (Fase B+):** SaaS multi-institución donde cada universidad entra por su propio SSO
federado y/o desde su LMS (Canvas vía LTI 1.3), con calificaciones que regresan al gradebook.

**Principios (no negociables):**

1. **Reusar el motor, no reinventarlo.** El análisis lo hace `audit_service.py` (FastAPI). El
   módulo educativo es *vocabulario + vistas + identidad*.
2. **No tocar el core de proyectos.** App nueva, rutas nuevas, área "Aulas". No modifica
   `Project`/`Task`/kanban.
3. **Seguridad y privacidad primero.** Aislamiento heredado del patrón probado de
   `permissions.py`. El LLM **solo ve código**, nunca PII.
4. **Identidad federada desde el diseño.** Un adaptador de identidad común; login propio, OIDC
   institucional y LTI son implementaciones — **pero con las diferencias reales de cada protocolo
   modeladas** (ver §2, corregido en v2).
5. **Marca Yemoda.** Púrpura único acento, hairlines, tipografía editorial; co-branding sutil del
   logo de la institución.

---

## 1. Decisiones tomadas (registro de producto)

| # | Decisión | Valor |
|---|---|---|
| D1 | Unidad de entrega | **Ambos** (individual o equipo, el profesor elige por reto) |
| D2 | Roles del demo | **Alumno + Profesor + Dirección** |
| D3 | Papel del score de IA | **Insumo** (la IA no califica sola); `ai_score` y `grade` separados |
| D4 | Taxonomía 6 niveles | **El profesor etiqueta cada reto** con su nivel objetivo |
| D5 | Reenvíos | **Múltiples intentos con historial** (`attempt_number`) |
| D6 | Identidad | **Federada** (3 vías) + JIT provisioning; **simulada en demo** |
| D7 | Jerarquía | **Institución → Materia → Reto**; carrera/semestre = **campos** de la Materia (CharField ≤50; agregación `GROUP BY carrera, semestre` sin joins) — **resuelto** |
| D8 | Privacidad | El LLM solo ve código; PII nunca al modelo |

**Estado de seguridad base (verificado en código, no en el AUDIT.md viejo):** los 3 críticos del
`AUDIT.md` **ya están corregidos**: C1 `chat.py:27` (`dependencies=[Depends(require_internal_token)]`),
C2 `serializers.py:113` (`read_only_fields` con `plan`/`stripe_subscription_id`), C3 `webhook.py:515`
(`_process_push` es `def`). El módulo educativo **no debe reintroducirlos** (ver §8).

**Distinción que el plan mantiene siempre separada:**
- **6 categorías de *scoring*** (del motor): `security, performance, robustness, correctness,
  maintainability, tdd`. → `Assignment.rubric` (pesos suman 100).
- **6 niveles de *taxonomía de adopción de IA*** (pedagógico, Bloom por defecto): →
  `Assignment.taxonomy_level` (1..6) + `Institution.taxonomy_labels`.
Son campos distintos; nunca se mezclan.

---

## 2. Arquitectura de identidad

### 2.1 El adaptador de identidad (corregido en v2)

Todas las vías producen un **`AuthenticatedPrincipal`** interno:

```
AuthenticatedPrincipal = {
  user,                 # UserAccount
  institution?,         # Institution (null para login propio sin institución)
  role,                 # admin | professor | student (resuelto server-side, §2.5)
  lti_context?          # SOLO en launch LTI: {course_id, assignment_id, enrollment_id, custom_claims}
}
```

> **Corrección de v1 (hallazgo alta):** v1 decía que login-propio, OIDC y LTI eran "intercambiables".
> Es impreciso. **LTI 1.3 *usa* OIDC para autenticar, pero añade CONTEXTO** (curso, reto,
> enrollment, roles) que OIDC solo no trae. Por eso el principal tiene `lti_context?` opcional: en
> un launch LTI se llena y el frontend puede auto-navegar a `/aulas/retos/{assignment_id}`; en
> login OIDC/propio queda `null`.

Las tres vías:

```
A. Login propio (existe)         email+password → JWT Yemoda
B. OIDC institucional (NUEVO)    elige universidad → IdP (Entra del Tec) → id_token firmado
                                 → validar JWKS+iss+aud+exp+nonce+tenant → JIT → JWT Yemoda
C. LTI 1.3 (NUEVO, Fase B)       Canvas → OIDC login + LTI launch JWT (con contexto)
                                 → validar → JIT/roster → JWT Yemoda (+lti_context)
```

### 2.2 Qué se reusa y qué es código NUEVO (corregido en v2)

> **Corrección de v1 (hallazgo alta):** v1 decía que el OAuth de Google/GitHub
> (`views.py:1847-2217`) era "base sólida para OIDC". **Preciso:** ese flujo aporta el *patrón de
> auto-provisión* (proveedor externo → encontrar/crear usuario → emitir JWT) y el manejo de
> `state`, pero **NO hace validación OIDC**: no descarga/cachea el **JWKS** del IdP, no verifica la
> **firma** del `id_token`, ni `iss/aud/tenant`. Eso es **código nuevo** (Fase B), no reuse.

- **Reusa (patrón):** auto-provisión de usuario, manejo de `state` ligado a sesión
  (`views.py:381-391`), emisión de JWT propio (`views.py:148-174`).
- **Nuevo (Fase B):** `apps/education/identity.py` con: cliente OIDC, **caché de JWKS** (con TTL +
  rotación de llaves + HTTPS-only + rate-limit del refresh), validación de firma del `id_token`,
  validación de `iss/aud/exp/nonce/tenant`, y para LTI: deep-linking, **AGS** (grade passback),
  **NRPS** (roster), registro de la herramienta (tool key pairs / platform registration).

### 2.3 Just-in-time provisioning (shadow accounts)

- **Usuarios federados NO usan `password_hash` nullable.** *(Corrección v2.1: hacerlo nullable
  rompería `check_password`, que hace `identify_hasher(None).split()` → `AttributeError`.)* En su
  lugar se usa el **patrón que el código ya aplica para OAuth** (`views.py:1967, 2167`):
  `password_hash = make_password(None)` → hash **inutilizable** (empieza con `!`) que falla de
  forma segura en el login email/password. El campo se queda **non-null**.
- **Guarda de login:** antes de `check_password` (`views.py:1584`), si el usuario tiene un registro
  `ExternalIdentity`, rechazar el login email/password con mensaje claro ("Usa el acceso de tu
  institución"). Cierra la confusión y la superficie de ataque.
- Nuevo modelo `ExternalIdentity(user, provider, issuer, subject, email_normalized,
  raw_claims_cache)`, `unique_together(issuer, subject)`.
- Primer login federado → crea `UserAccount` (sin password) + `ExternalIdentity` +
  `InstitutionMember`. Siguientes → lookup por `(issuer, subject)`.
- **Normalización de email** entre proveedores (Entra/Google/GitHub pueden diferir en case/alias):
  guardar `email_normalized` (lowercase, sin alias) para de-dup, pero la identidad canónica es
  `(issuer, subject)`, NO el email.

### 2.4 Seguridad del flujo federado y del dev-login

- Validar firma `id_token` contra JWKS del IdP; validar `iss/aud/exp/nonce/tenant`; `state` ligado
  a sesión; restringir por `Institution.allowed_domains` (ej. `@tec.mx`).
- **dev-login (demo):** endpoint `POST /api/education/auth/dev-login/` que emite un principal de
  prueba con claim `is_demo_token=true`. **Gating duro:** `if not settings.DEBUG → PermissionDenied`;
  en prod (`DJANGO_DEBUG=false`) responde 403. Los tokens `is_demo_token=true` se rechazan contra
  instituciones no-demo. Se elimina antes de Fase B.

### 2.5 Resolución de rol (corregido en v2)

Orden, **nunca confiando en un rol enviado por el cliente**:
1. **Fase A (demo):** rol viene del seed de dev-login.
2. **Fase B con LTI:** rol del claim LTI / **NRPS** (roster que Canvas expone); verificado contra
   `Enrollment`/`Course.professor` en DB.
3. **Fase B con OIDC sin LTI:** rol derivado de la DB — `professor` si es `Course.professor`,
   `student` si tiene `Enrollment`; si no, sin acceso a esa institución.
- **Revocación:** al borrar `InstitutionMember` (des-inscripción) se incrementa
  `UserAccount.token_version` (invalida JWTs). En login se rechaza si no hay `InstitutionMember`
  activo para la institución reclamada.

---

## 3. Modelo de datos (Django, **app nueva** `apps/education`)

App nueva (requiere `apps/education/__init__.py` + alta en `INSTALLED_APPS`, `config/settings.py`).
Modelos con `BigAutoField`, `created_at`, `created_by` donde aplique.

### 3.1 Entidades

```
Institution
  id, name, slug (único), short_name
  identity_provider (enum: none|oidc|saml|lti)      # 'none' = solo login propio (demo)
  identity_config   (JSONB: issuer, tenant_id, client_id, jwks_uri, allowed_domains[])
  branding          (JSONB: logo_url)
  taxonomy_labels   (JSONB: 6 etiquetas; default Bloom; configurable por institución)
  grading_config    (JSONB: escala nativa del profe → mapeo a canónico 0-100)   # §3.1b
  created_by (nullable), created_at

ExternalIdentity                                    # §2.3
  id, user (FK), provider, issuer, subject, email_normalized, raw_claims_cache (JSONB)
  unique_together(issuer, subject)

InstitutionMember                                   # join: scoping + rol (espeja ProjectMember)
  id, institution (FK), user (FK), role (enum: admin|professor|student)
  external_subject (char, nullable)
  unique_together(institution, user)

Course                                              # "Materia"
  id, institution (FK), name, code
  carrera (char ≤50), semestre (char ≤50)           # CAMPOS, no entidades (D7)
  professor (FK UserAccount), created_at

Enrollment
  id, course (FK), student (FK UserAccount), created_at
  unique_together(course, student)

Assignment                                          # "Reto / hackathon de materia"
  id, course (FK), title, description
  submission_type (enum: individual|team)           # D1
  rubric (JSONB)              # 6 categorías de SCORING, pesos suman 100 — validado (§3.1a)
  taxonomy_level (int 1..6)   # nivel de adopción (D4) — INMUTABLE tras crear (anti-gaming)
  processing_mode (enum: normal|batch)
  verify_findings (bool)
  due_date (datetime, nullable)
  repo_template (char, nullable)                     # plantilla institucional (Fase B)
  created_at

Team / TeamMember                                   # solo si submission_type=team
  Team: id, assignment (FK), name
  TeamMember: id, team (FK), student (FK), unique_together(team, student)

Submission                                          # una entrega = un intento (D5)
  id, assignment (FK)
  student (FK, nullable), team (FK, nullable)        # XOR — §3.1c
  attempt_number (int)                               # §3.1d
  repo_url (char), ref (char default 'main')
  status (enum: pending|running|batch_pending|done|failed)
  ai_score (int, nullable), score_breakdown (JSONB, nullable)
  findings (JSONB, nullable), summary (text, nullable)
  anonymized (bool default false)                    # FERPA: §8
  created_at

Grade                                               # nota del profesor (separada del ai_score, D3)
  id, submission (OneToOne)
  professor (FK), graded_by (FK)                     # graded_by = quién calificó (FERPA audit)
  grade_value (decimal 0-100, canónico — §3.1b)
  feedback (text, nullable), graded_at (datetime)
```

**Reglas de integridad (añadidas en v2 por la auditoría):**
- **§3.1a — `rubric`:** dict `{category: weight}` con las 6 categorías de `audit_service.py:44-51`,
  weights enteros que **suman 100**. Validado en `Model.clean()` → `ValidationError`. **Jamás**
  contiene PII ni nombres de curso/alumno (solo pesos).
- **§3.1b — `grade_value`:** SIEMPRE decimal **0-100 canónico**. `Institution.grading_config`
  define la escala nativa del profe (p.ej. 0-10) y el frontend convierte a canónico antes de POST.
  Dirección agrega solo canónico. **Independiente de `taxonomy_level`:** la nota es evaluación; el
  nivel de taxonomía es etiqueta curricular (Bloom). Dirección puede cruzarlos (banda de nota ×
  nivel) pero no se alimentan entre sí.
- **§3.1c — `student` XOR `team`:** exactamente uno no-nulo. Enforzar con `CheckConstraint`
  (DB-level) + validación en serializer.
- **§3.1d — `attempt_number`:** `unique_together` con `(assignment, student)` o `(assignment, team)`.
  Incremento seguro bajo concurrencia: `select_for_update()` sobre las submissions previas del
  par, o `IntegrityError`-retry; nunca contar-luego-insertar sin lock. Si dos envíos compiten por el
  mismo `attempt_number`, el segundo recibe **409 Conflict** ("Ya se está procesando otro intento;
  recarga e inténtalo") y el frontend lo maneja sin duplicar.

### 3.2 Aislamiento (scoping) — patrón exacto de `apps/core`

`get_queryset()` filtra SIEMPRE por membresía; el no-miembro recibe **queryset vacío** (no 403),
siguiendo `ProjectViewSet.get_queryset` (`views.py:560-564`:
`filter(Q(members__user=user) | Q(created_by=user)).distinct()`).

- **Alumno:** `Submission.objects.filter(Q(student=user) | Q(team__members__student=user))`; ve
  assignments de cursos donde tiene `Enrollment`.
- **Profesor:** todo lo de `Course.objects.filter(professor=user)`; **no** ve cursos de otro
  profesor aunque compartan institución (override explícito en `CourseViewSet.get_queryset`).
- **Dirección (institution admin):** agregados de **su** institución; nunca datos crudos de otra.
- **Cross-institution:** imposible por construcción.

**Permisos por acción** vía `require_edu_perm(user, obj, perm)` (análogo a `require_perm`,
`permissions.py:95-105`): `can_create_course, can_manage_enrollment, can_create_assignment,
can_grade, can_view_course_submissions, can_view_institution_analytics`. Enforcement en `perform_*`
(servidor = verdad; frontend solo sugiere).

**Agregados server-side (no client-side):** endpoint
`GET /api/education/courses/{id}/aggregates/` calcula `avg_ai_score`, `findings_histogram`,
`taxonomy_coverage` con agregaciones ORM (no traer 500 filas al cliente — evita el N+1 que el
`AUDIT.md` ya señaló en core). TTL opcional 5 min.

**Paginación:** todos los ViewSets nuevos usan `LimitOffsetPagination` (PAGE_SIZE 50). El core no
la tiene; el módulo educativo **no hereda esa deuda**.

### 3.3 Privacidad / FERPA-like

- El payload a `audit_service` es **solo** `submission_id + repo_url + ref + rubric` (pesos). El
  LLM jamás recibe nombre/matrícula/email.
- `submission_id` es **server-only**: nunca en mensajes de error al cliente, logs expuestos, ni
  respuestas de API de cara al alumno (que devuelven solo score/findings/feedback agregados).
- **Retención/borrado:** al des-inscribir un alumno, `Submission.anonymized=True` + limpiar PII;
  política de borrado masivo a definir con legal del Tec antes de Fase B.
- **Exports:** alumno solo lo suyo; profesor lista por ID (no email); dirección solo agregados.
  Todo export se registra en un `ActivityLog`.

---

## 4. Integración con el motor (FastAPI) — **diseño decidido, implementación en Fase A**

> **Estado (v2.1):** la *decisión de diseño* está cerrada; la *implementación* es trabajo de Fase A
> (NO existe aún en el código). Hoy `audit.py::_run_audit` **hardcodea** `HackathonSubmission`
> (firma `_run_audit(submission_id, repo_url, ref, rubric, processing_mode, verify)`; lee/escribe
> esa tabla en `audit.py:43-142`). No hay endpoint educativo. El refactor de abajo es lo PRIMERO
> que se construye en Fase A.

**Decisión de diseño:** refactorizar `_run_audit` para aceptar el **modelo destino** como parámetro
y exponer un **endpoint hermano**:

```
# backend_fastapi/app/routers/audit.py
_run_audit(target_model, submission_id, repo_url, ref, rubric, processing_mode, verify_findings)
POST /api/audit/submission/             → target_model = HackathonSubmission   (existente)
POST /api/audit/education-submission/   → target_model = EducationSubmission   (nuevo)
```

**Contrato de columnas (crítico):** el FastAPI usa **SQLAlchemy** (su `HackathonSubmission` vive en
`backend_fastapi/app/models/models.py`, `__tablename__='hackathon_submission'`), distinto del ORM de
Django. El nuevo modelo SQLAlchemy `EducationSubmission` (tabla `education_submission`) debe exponer
**exactamente los mismos nombres de columna** que `_run_audit` escribe
(`status, ai_score, score_breakdown, findings, summary`) — si Django usa `ai_score` y SQLAlchemy
`score`, el refactor falla en silencio. Fijar el contrato con un comentario en ambos archivos.

Pros del enfoque: cero duplicación de la lógica de scoring; aislamiento por endpoint; mismo
`require_internal_token`. (Alternativa descartada: un solo endpoint con `table_name` en el body —
acopla y abre superficie de error.)

**Flujo:** Alumno crea `Submission` (Django) → `_trigger_education_audit_async` (espeja
`views.py:3838-3856`) → llama FastAPI con `X-Internal-Token` → FastAPI corre en **threadpool**
(no event loop — respeta C3) → escribe resultados en `education_submission` → frontend hace polling.

**Validación de `repo_url` antes de encolar (SSRF — hallazgo media):** **Fase A MVP** — parsear URL
+ validar estructura owner/repo (el parser ya existe, `audit_service.py:86-99`). **Fase B
hardening** — whitelist `github.com`, rechazar `localhost`/IPs privadas/URLs con credenciales, y un
`HEAD /repos/{owner}/{repo}` para validar existencia y dar feedback inmediato. (Hoy el código solo
valida no-vacío; la whitelist es trabajo nuevo.)

**Rate-limiting (hallazgo media):** límite por alumno-por-reto (p.ej. 3 envíos/hora) para evitar
flood/DoS y consumo fraudulento de cuota.

**Costo/modo:** **Fase A = `normal`** (feedback inmediato para el "wow" del demo) + un caso
**pre-cacheado** (`status=done`, score sembrado) para no depender de la API en vivo durante la
llamada con el Tec. **`batch`** (Anthropic Message Batches, ~50% más barato) se habilita en Fase B
para volumen de semestre 1–2. IA local (Nemotron) = Fase C.

---

## 5. Frontend — área nueva "Aulas"

### 5.1 Inserción (anclas exactas)

- **Rutas** en `src/app/routes.tsx`, anidadas bajo `AppLayout` (`routes.tsx:78`), lazy + Skeleton:
  `/aulas` (home según rol), `/aulas/materias/:courseId`, `/aulas/retos/:assignmentId`,
  `/aulas/entregas/:submissionId`, `/aulas/direccion`.
- **Sidebar** (`Sidebar.tsx`, grupos `main/analytics/user`): añadir grupo `"education"`, visible
  **solo si** el usuario tiene `InstitutionMember` (gated por membresía, no por rol de proyecto).
- **AuthContext** se extiende con `institution_member_roles: {institutionId, role}[]` (devuelto en
  login). El gating del sidebar y el routing por rol lo usan.
- **Permisos UI:** **hook NUEVO** `useEducationPermissions(institutionId, courseId?)` que devuelve
  `EducationCapabilities {canViewCourse, canGrade, canViewAnalytics, canManageCourse,
  canCreateAssignments, ...}` consumiendo `GET /api/education/.../my-permissions/`.
  > **Corrección v2:** NO es reuse de `useProjectPermissions` (ese resuelve roles de proyecto:
  > projectManager/productOwner). Es un hook nuevo que *espeja el patrón*, no el contenido.

### 5.2 Las tres vistas

**Alumno:** "Mis materias" → reto → vincular repo (URL pública) → su reporte (`ai_score` +
breakdown + findings legibles + feedback del profe + **historial de intentos**, Paso 23).

**Profesor:** su materia → lista alumnos/equipos (status, score) → detalle de entrega (reporte +
**poner nota** + retroalimentación) → **vista agregada de la materia** (promedio, hallazgos comunes,
cobertura por nivel) servida por el endpoint de agregados (§3.2).

**Dirección:** agregados por **carrera/semestre** + distribución por nivel de taxonomía; tablero
institucional (la vista que justifica el licenciamiento).

### 5.3 Login federado (UI)

Pantalla con las 3 vías (D6); vía institución → selector de universidad → "Entrar con
[Universidad]". Demo: `dev-login` simulado (§2.4). Co-branding del logo de la institución.

---

## 6. Reportes (cierra gaps del análisis previo)

Reusar `reportExport.ts` (jsPDF + xlsx, probado en proyectos):
- **Reporte por alumno/equipo** descargable (PDF/XLSX) — Paso 22c. Filtrado por rol (§3.3).
- **Reporte consolidado por materia** (promedios, hallazgos comunes, distribución por nivel) —
  Paso 7b/22d.
- **Export institucional** (dirección) por carrera/semestre.
- **Executive summary legible para no-técnicos** (Paso 11): lenguaje llano + remediación
  (ej.: no "SQL injection en query builder" sino "posible exposición de datos: entrada del usuario
  usada en consultas sin escapar. Recomendación: usar consultas parametrizadas").
- **Branding:** los reportes siguen la marca Yemoda (§0) con co-branding del logo de la institución
  en el encabezado; pie con materia/semestre/fecha. PDF A4 (landscape para tablas anchas); XLSX con
  la misma estructura.

---

## 7. Taxonomía de 6 niveles

- **Modelo:** `Assignment.taxonomy_level` (1..6, **inmutable tras crear** — anti-gaming de
  analíticas); etiquetas en `Institution.taxonomy_labels` (cada institución define sus 6 nombres).
- **UI:** al crear un reto, el profesor **selecciona** el nivel de una lista (las labels de la
  institución), no teclea un número suelto.
- **Default (ajustable):** Bloom — `1 Recordar · 2 Comprender · 3 Aplicar · 4 Analizar ·
  5 Evaluar · 6 Crear`.
- **Dashboard dirección:** barras apiladas, x = nivel (1-6), y = #retos/entregas, color por banda
  de `ai_score` (0-25/25-50/50-75/75-100). Etiqueta: "Adopción de IA por nivel", **no** "scoring
  por taxonomía" (son cosas distintas, §1).
- **Pendiente externo:** nombres/definiciones reales de los 6 niveles del Tec.

---

## 8. Seguridad y privacidad (bloqueante para venta institucional)

- **Scoping** server-side, cero IDOR (patrón §3.2, anclado a `views.py:560-564`).
- **Serializers nuevos:** `read_only_fields` explícitos SIEMPRE (id, created_at, created_by,
  submission_id, ai_score, status...). **Nunca `fields="__all__"` sin read_only** (lección C2).
- **Federación:** validación JWKS/iss/aud/exp/nonce/tenant (§2.4); dev-login gated por `DEBUG`.
- **SSRF:** validación de `repo_url` (§4). **Rate-limit** de envíos (§4).
- **Revocación:** `token_version++` al des-inscribir (§2.5).
- **Privacidad:** LLM solo código; PII solo en Django; `rubric` sin PII (§3.1a, §3.3).
- **Token interno** `FASTAPI_INTERNAL_TOKEN` distinto del `GITHUB_APP_WEBHOOK_SECRET` (≥32 chars),
  presente en ambos servicios.
- **Críticos AUDIT.md:** C1/C2/C3 **verificados como corregidos** (§1). El módulo no los
  reintroduce. Checklist pre-Fase B (OWASP/FERPA): IDOR, SSRF, XSS, CSRF, SQLi, mass-assignment,
  rate-limit, retención de datos.

---

## 9. Fases de entrega

**Fase A — Demo-ready** (lo que construimos ahora; **shippable sin dependencias del Tec**)
- App `apps/education` + modelos + migraciones + `INSTALLED_APPS`.
- Endpoint `/api/audit/education-submission/` (refactor `_run_audit` parametrizado).
- 3 vistas (alumno/profesor/dirección) con flujo completo.
- Login **simulado** (`dev-login`, gated `DEBUG`) + datos sembrados de un semestre + **un caso real
  en vivo** (`normal` mode) y **uno pre-cacheado** de respaldo.
- Reporte por alumno + agregado por materia (PDF/XLSX).
- Serializers con `read_only_fields`; scoping y validación de `repo_url` desde el día 1.

**Fase B — Piloto** (con compromiso del Tec)
- **OIDC real** (Entra del Tec): JWKS, validación de firma, tenant. **LTI 1.3** (Canvas): launch +
  `lti_context` + **AGS** (grade passback) + **NRPS** (roster).
- Repos privados (GitHub App en la org del Tec) + plantilla institucional.
- `batch` mode; paginación/colas para escala; checklist de seguridad pre-piloto.

**Fase C — Escala / SaaS**
- Multi-institución self-service; IA local (Nemotron) para costo; modos ligero/avanzado por
  semestre; expansión a otras escuelas/campus.

---

## 10. Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| `audit_service` acoplado a hackathon | **Resuelto:** endpoint hermano + `_run_audit(target_model)` (§4) |
| OIDC ≠ OAuth existente | **Reconocido:** OIDC es código nuevo Fase B (§2.2) |
| LTI sin contexto | **Resuelto:** `lti_context` en el principal + AGS/NRPS (§2.1) |
| Escala (N+1, sin paginación) | Agregados server-side + paginación en viewsets nuevos (§3.2) |
| SSRF / flood de envíos | Validación `repo_url` + rate-limit (§4) |
| Demo depende de API en vivo | `normal` + caso pre-cacheado (§4, §9) |
| Fuga de PII al LLM | `rubric` solo pesos; `submission_id` server-only (§3.3) |
| Confundir scoring vs taxonomía | Campos distintos + UI etiquetada (§1, §7) |
| dev-login en prod | Gated por `DEBUG` + claim `is_demo_token` (§2.4) |

---

## 11. Decisiones resueltas (antes "abiertas") + lo que falta del Tec

**Resueltas en v2:**
- **D7 jerarquía:** carrera/semestre = campos (no entidades).
- **Integración motor (diseño):** endpoint hermano `/api/audit/education-submission/` +
  `_run_audit(target_model)` — *decisión* cerrada; *implementación* es la primera tarea de Fase A.
- **Modo del demo:** `normal` + caso pre-cacheado.
- **Identidad:** OIDC/LTI son código nuevo (Fase B); demo con dev-login.
- **`useEducationPermissions`:** hook nuevo (no reuse).

**Pendiente del usuario (no bloquea Fase A):** confirmar si en algún momento querrá "Carrera" como
entidad (hoy es campo).

**Pendiente del Tec (externo):** nombres/definiciones reales de los 6 niveles de taxonomía;
protocolo IdP exacto (hipótesis: Entra OIDC); política de repos privados; política legal de
retención/borrado de datos de alumnos.

---

## Apéndice A — Trazabilidad vs. la propuesta al Tec (24 pasos)

| Paso (producto) | Requisito | Cubierto en |
|---|---|---|
| 6 | Flujo: repo → análisis → reporte profe/juez → evidencia | §4, §5.2 |
| 7a | Dashboard por equipo/repo (calidad/riesgo/mantenibilidad) | §5.2, §6 |
| 7b | Reporte consolidado por hackathon/materia | §6 |
| 7c | Datos agregados por carrera/semestre + taxonomía | §5.2 (dirección), §7 |
| 7d | Modo ligero/avanzado | §4 (normal/batch), Fase C |
| 11 | Reportes legibles para no-DevOps | §6 (executive summary) |
| 22a | Integración GitHub (plantilla institucional) | §4, Fase B (`repo_template`) |
| 22b | Análisis automatizado de calidad/mantenibilidad | §4 (motor) |
| 22c | Reporte simple descargable por equipo/repo | §6 |
| 22d | Resumen agregado por hackathon | §6, §5.2 |
| 23 | Mejoras observables entre intentos | §3 (D5, `attempt_number`) |

## Apéndice B — Anclas en el código real

- Auth/JWT: `apps/core/views.py:148-174`, `1565-1691`. OAuth/state: `views.py:1847-2217`, `381-391`.
- Scoping/permisos: `apps/core/permissions.py:72-166`; querysets `views.py:560-564, 1216-1219`.
- Motor: `backend_fastapi/app/services/audit_service.py` (categorías `:44-51`); endpoint
  `app/routers/audit.py:144-171`; trigger `views.py:3838-3856`.
- Críticos verificados corregidos: `chat.py:27`, `serializers.py:113`, `webhook.py:515`.
- Hackathon a espejar: `apps/core/models.py:889-981`.
- Frontend: `routes.tsx:78` (AppLayout), `Sidebar.tsx` (navItems), `useProjectPermissions.ts`
  (patrón), `reportExport.ts`, `services/*.service.ts` + `api.ts`.

## Apéndice C — Notas de migración / cambios de esquema

1. `UserAccount.password_hash` se mantiene **non-null**; los usuarios federados llevan
   `make_password(None)` (hash inutilizable, patrón OAuth existente). **NO** se hace nullable
   (rompería `check_password`). Guarda de login vía `ExternalIdentity` (§2.3).
2. Nueva app `apps/education` → alta en `INSTALLED_APPS` (`config/settings.py`).
3. Nuevos modelos **Django** (`apps/education`): `Institution, ExternalIdentity, InstitutionMember,
   Course, Enrollment, Assignment, Team, TeamMember, Submission, Grade`. Nuevo modelo **SQLAlchemy**
   (FastAPI): `EducationSubmission` — el `Submission` de Django y el `EducationSubmission` de FastAPI
   mapean a la MISMA tabla `education_submission`, con nombres de columna idénticos (contrato §4).
4. `CheckConstraint` para `Submission` student-XOR-team; `unique_together` de `attempt_number`.
5. FastAPI: tabla `education_submission` (SQLAlchemy) compatible con el escritor de `_run_audit`.
6. Serializers nuevos con `read_only_fields` explícitos (sin `fields="__all__"` desprotegido).
7. `LimitOffsetPagination` en los viewsets de `apps/education`.
