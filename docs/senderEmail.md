# senderEmail.md — Configuración de envío de correos (Brevo)

> Última actualización: **2026-08-18**

## Estado actual

DuoBalance envía correos transaccionales vía **[Brevo](https://www.brevo.com)** (antes Sendinblue). El proveedor se deja de usar Resend.

| Proveedor | Estado |
|-----------|--------|
| **Brevo** | ✅ Configurado y funcionando (validado con envío real) |
| Resend | ⚠️ Código presente pero **inactivo** (se conserva como respaldo) |

## Qué se está consumiendo

- **API**: Brevo REST API v3 (SMTP relay `smtp-relay.mailin.fr`).
- **Cuenta Brevo**: `doubalanceinfo@gmail.com` — plan **free (300 créditos)**, SMTP relay habilitado.
- **Remitente (sender)**: `doubalanceinfo@gmail.com` — el email de la cuenta Brevo es el remitente autorizado por defecto en el plan free.
- **Endpoints de Brevo usados**:
  - `POST /v3/smtp/email` — envío transaccional (usado por `sendTransacEmail`).
  - `GET /v3/account` — solo validación manual de la API key (no se usa en la app).
- **SDK**: `@getbrevo/brevo` v6 (`BrevoClient`).

## Archivos involucrados

| Archivo | Rol |
|---------|-----|
| `src/mail/mail.module.ts` | Módulo global. Fábrica que elige el proveedor según `MAIL_PROVIDER` (`brevo` → `BrevoProvider`, caso contrario `ResendProvider`) |
| `src/mail/mail.service.ts` | Única puerta de salida de correos (`mailService.send`). Lee `MAIL_FROM` y `FRONTEND_URL` |
| `src/mail/providers/brevo.provider.ts` | Implementación con el SDK de Brevo (`sendTransacEmail`) |
| `src/mail/providers/resend.provider.ts` | Implementación con Resend (inactiva, se conserva) |
| `src/mail/interfaces/mail-provider.interface.ts` | Contrato `MailProvider` + token `MAIL_PROVIDER_TOKEN` |
| `src/mail/interfaces/mail.interface.ts` | Tipos `MailPayload`, `SentMailResult` |
| `src/mail/templates/welcome.html` | Template HTML con `{{name}}` y `{{url}}` |
| `src/mail/controller.ts` + `src/mail/dto/test-mail.dto.ts` | Endpoint temporal `POST /mail/test` para validar la integración |
| `src/config/env.config.ts` | Validación Joi de `MAIL_PROVIDER`, `BREVO_API_KEY`, `RESEND_API_KEY`, `MAIL_FROM`, `FRONTEND_URL` |
| `.env` | Variables de entorno reales (ver abajo) |

## Variables de entorno (`.env`)

```env
MAIL_PROVIDER=brevo
BREVO_API_KEY=xkeysib-...                       # API key de Brevo (v3)
RESEND_API_KEY=re_...                           # Conservada (inactiva, respaldo)
MAIL_FROM=doubalanceinfo@gmail.com              # Remitente (email de la cuenta Brevo)
FRONTEND_URL=http://localhost:8081
```

### Reglas de validación (Joi en `env.config.ts`)

- `MAIL_PROVIDER` solo acepta `resend` | `brevo` (default `resend`).
- `BREVO_API_KEY` es **requerida** si `MAIL_PROVIDER=brevo`.
- `RESEND_API_KEY` es **requerida** si `MAIL_PROVIDER=resend`.

## Cómo se configuró (paso a paso)

1. **Se agregó soporte Brevo en código** (ya existía desde antes, no fue parte de esta sesión):
   - `BrevoProvider` con `BrevoClient({ apiKey })` y método `send()` que llama `client.transactionalEmails.sendTransacEmail(...)`.
   - La fábrica de `mail.module.ts` expone el interruptor `MAIL_PROVIDER=brevo`.

2. **Se activó Brevo en `.env`**:
   - `MAIL_PROVIDER=brevo`
   - `BREVO_API_KEY=xkeysib-TU_CLAVE_AQUI`
   - **Importante:** `MAIL_FROM` se cambió de `onboarding@resend.dev` a `doubalanceinfo@gmail.com`. El remitente `onboarding@resend.dev` es exclusivo de Resend y Brevo lo habría rechazado. En el plan free, el email de la cuenta es el sender válido.

3. **Se validó la API key** contra `https://api.brevo.com/v3/account` (resultado: **HTTP 200**, org `DuoBalance`, plan free).
   - Una key inválida devuelve `401 Unauthorized`; un `404` de ruta con `200`-auth significa que la key es válida pero el endpoint no existe.

4. **Se levantó la API y se probó el envío real** con `POST /mail/test`:
   ```bash
   curl -X POST http://localhost:3000/mail/test \
     -H "Content-Type: application/json" \
     -d '{"to":"destinatario@correo.com","name":"Emerson"}'
   ```
   - Respuesta esperada: `201` + `{"message":"Correo de prueba enviado correctamente","id":"<...@smtp-relay.mailin.fr>"}`.
   - Los correos salen por el relay de Brevo (`smtp-relay.mailin.fr`), lo que confirma que se usó Brevo y no Resend.

## Verificación de recepción

Se enviaron correos de prueba a:
- `doubalanceinfo@gmail.com` ✅ (HTTP 201)
- `reyesemerson643@gmail.com` ✅ (HTTP 201)
- `er293116@gmail.com` ✅ (HTTP 201)

> Recordar revisar también **spam**: remitentes nuevos puede caer ahí al inicio.

## Notas y pendientes

- ⚠️ `POST /mail/test` (en `src/mail/mail.controller.ts:10`) es un **endpoint temporal** — eliminarlo una vez validada la recepción en producción/desarrollo.
- ⚠️ La API key expuesta en este doc (y en `.env`) debe **rotarse** cuando el proyecto avance a beta; hasta que verifiquen, se mantiene operativa.
- El `.env` real no debe subirse a git (ya está en `.gitignore`). Este documento muestra solo valores de referencia.
- Si más adelante se verifica un dominio propio en Brevo, cambiar `MAIL_FROM` a un correo de ese dominio (p. ej. `hola@duobalance.com`).
- El plan free tiene límite de **300 créditos**; cuando se agoten, Brevo pausa los envíos hasta el siguiente ciclo.

## Flujo de un envío (resumen)

```
AuthService (registro/verificación)
  └─> MailService.send({
        from: MAIL_FROM,
        to: destinatario,
        subject,
        html: renderTemplate('welcome', { name, url }),
      })
        └─> BrevoProvider.send() → BrevoClient.sendTransacEmail()
              └─> POST /v3/smtp/email → smtp-relay.mailin.fr
                    └─> Inbox del destinatario
```