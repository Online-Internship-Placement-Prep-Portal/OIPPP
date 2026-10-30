# ADR-4: Routes, service and model per module, no controller layer

**Status:** Accepted. Amends SAD 4.1.

**Date:** 30 Oct 2026

## Context

SAD 4.1 gives every module four files: `routes.js` (paths and roles), `controller.js` (read the request, shape the response), `service.js` (rules) and `model.js` (schema). Once the modules were written, the controllers were one line each: take `req.params` and `req.body`, call the service, send the result.

## Decision

Each module keeps three layers:

| Layer | File | Holds |
|:--|:--|:--|
| Routes | `*.routes.js` | Path, `authenticate`, `allow(...roles)`, Joi `validate(...)`, then a short handler that calls the service and sends the response |
| Service | `*.service.js` | Every business rule, ownership check and database write; throws `AppError` |
| Model | `*.model.js` | Mongoose schema, indexes and model-level guards |

Handlers are wrapped in `utils/wrap.js`, which passes any rejected promise to the single error middleware. Large modules split their service by concern, for example `listing.service.js`, `listing.search.service.js` and `recommendation.service.js`.

## Consequences

- One fewer file per route and no pass-through code.
- Rules stay in services, so the unit tests call services directly with an in-memory database (QA-4).
- A handler must stay short. If it starts doing more than calling one service and shaping its result, that logic belongs in the service.
- The SAD's "controllers never call models directly" rule still holds: handlers call services, and only services touch models.
