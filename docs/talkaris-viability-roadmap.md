# Talkaris: roadmap para un producto viable

Fecha de referencia: 22 de octubre de 2026.
Estado: **M0 completado (G0 GO); M1-M8 pendientes**.
Este documento sustituye como plan de ejecución al roadmap histórico V1/V1.5/V2/V3. No certifica como terminadas las funcionalidades que ese documento marcaba con un check.

## 1. Objetivo y definición de producto viable

Entregar una plataforma de chat con conocimiento propio que un cliente pueda configurar, publicar y operar sin intervención continua del desarrollador, con aislamiento entre empresas y resultados verificables.

El recorrido mínimo que debe funcionar es:

1. Un administrador accede con Google o contraseña, crea un workspace e invita a un compañero.
2. Crea un bot desde una web, confirma idioma y páginas y observa el avance real de la ingesta.
3. Prueba respuestas con referencias y publica el snippet en un dominio autorizado.
4. Un visitante conversa, deja un lead, valora la respuesta o solicita atención humana.
5. El equipo consulta conversaciones/documentos, atiende la escalación, recibe avisos y exporta sus datos.
6. Puede actualizar fuentes manualmente o programarlas y conectar su backend mediante API keys/webhooks.
7. La operación dispone de límites de consumo, diagnóstico, copia de seguridad y restauración probada.

**Alcance comercial inicial propuesto:** SaaS asistido para pequeñas empresas, centrado en widget web, webs públicas y documentos. Alta de clientes, selección de plan y cobro pueden gestionarse manualmente durante el piloto. No se exige desarrollar suscripciones automáticas para validar el producto.

**Regla para capacidades avanzadas:** una integración solo se ofrece como disponible cuando existe una prueba completa con su proveedor. Las que no la tengan se identifican como experimentales o se ocultan de la oferta estable. Esto no permite aplazar seguridad ni dejar un botón estable que falle silenciosamente.

## 2. Línea base y reglas de ejecución

La auditoría del 22 de octubre identificó 26 hallazgos: 15 P1 y 11 P2. Se inspeccionaron 27 rutas y se realizaron 100 comprobaciones. Hay 22 pruebas automatizadas que pasan, pero no cubren los fallos encontrados. La plataforma existente y su arquitectura son el punto de partida: **no se plantea reescribirla**.

Fuente detallada: informe `auditoria-2026-10-22/INFORME.md` del workspace de Talkaris. Los IDs F01–F26 de este plan corresponden a ese informe.

- Mantener el sistema actual de PostgreSQL, API Express, worker y portal Angular.
- Añadir la menor implementación que complete cada flujo; reutilizar servicios y dependencias existentes.
- Corregir los endpoints realmente registrados: `main.ts` antepone algunos handlers a los de `runtime-base.ts`.
- Crear una prueba de regresión que reproduzca el fallo antes de corregirlo cuando exista lógica o seguridad implicada.
- Separar diagnóstico en producción de pruebas con escrituras en un entorno aislado.
- No usar copias con secretos reales en CI ni subir fixtures con datos de clientes.
- Un hito termina con evidencias de aceptación, no porque compile o tenga un formulario.
- Mantener un único estado de tareas en este documento hasta que exista una herramienta de seguimiento adoptada. Cada tarea puede convertirse en issue conservando su ID.

## 3. Hitos, dependencias y esfuerzo

Estimación inicial para **una persona full stack con dedicación completa**, acceso al servidor y disponibilidad de las cuentas de proveedores. Un día significa una jornada de ingeniería, no tiempo de espera de terceros. Los rangos se revisarán al terminar M0 y M1; no son fechas comprometidas.

| Hito | Resultado | Esfuerzo | Dependencias |
|---|---|---:|---|
| M0 | Entorno reproducible y pruebas de los fallos | 2–3 días | Ninguna |
| M1 | Aislamiento y superficies de acceso seguros | 4–6 días | M0 |
| M2 | Dashboard utilizable, errores visibles y móvil | 4–6 días | M0; M1 antes de publicar |
| M3 | Crear bot, ingerir y desplegar de extremo a extremo | 5–7 días | M1, M2 |
| M4 | Conversaciones, leads, CSAT y atención humana operables | 4–7 días | M1, M2; M3 para aceptación completa |
| M5 | Equipos y API programática funcionales | 3–5 días | M1, M2 |
| M6 | Ingestas programadas, webhooks y avisos ejecutándose | 5–8 días | M1, M3, M4, M5 |
| M7 | Preparación de producción y candidato de lanzamiento | 3–5 días | M1–M6 |
| M8 | Piloto con clientes y decisión de lanzamiento | 2–3 días de ingeniería + 10 laborables de observación | M7 |

**Total estimado: 32–50 días de ingeniería**, más la ventana del piloto. Con la hipótesis anterior, reservar aproximadamente **9–12 semanas naturales** para el recorrido completo; cambios de alcance, disponibilidad parcial y verificaciones externas pueden ampliarlo. Reestimar tras los dos primeros hitos con tiempos observados.

M2 puede prepararse mientras se cierran casos de M1. M4 y M5 no dependen entre sí. Con una sola persona, estas posibilidades no implican capacidad adicional. M7 contiene verificaciones finales; sus tareas de observabilidad y despliegue empiezan desde M0.

Responsabilidad por defecto: ingeniería implementa y verifica; producto/operación valida los recorridos y decide alcance comercial. No se presuponen personas adicionales asignadas.

## 4. M0 — Base reproducible y cobertura de regresión

Ejecución 2026-10-22: **M0 completado; Gate G0 GO para la base de ingeniería**, sin aprobación de seguridad/lanzamiento. Rama `codex/m0-baseline`, base `a23eab97df894e3ee3a4a9eaa7d9083b92be8788`, implementación verificada `fdababf429180af41478858c5d6e6577f2a49262`; cierre documental en commit posterior. [PR #1](https://github.com/manuelxose/tecnoria-chat-platform/pull/1) abierta, sin merge ni despliegue. Dos ejecuciones completas limpias aprobadas en el mismo SHA: [39824730685](https://github.com/manuelxose/tecnoria-chat-platform/actions/runs/39824730685) y [39824738406](https://github.com/manuelxose/tecnoria-chat-platform/actions/runs/39824738406). Cada una: 25 controles, 32 defectos conocidos exactos, 3 pruebas del harness, 20 existentes, migraciones fresh/repeat/populated, build completo, 163 observaciones de navegador equivalentes y limpieza correcta. Revisión independiente final: GO, sin bloqueadores de implementación M0. Evidencia, riesgos y comandos en `docs/m0/report.md`, `README.md` y `audit-source.md`. Versión/migraciones de producción y proveedores permanecen sin verificar por la regla localhost. Los defectos siguen pendientes; **M1 no ejecutado**.

**Resultado:** poder demostrar cada reparación sin arriesgar producción.

- [x] **M0.1 Inventario vigente.** Confirmar versión desplegada, migraciones aplicadas, rutas activas y configuración no secreta. Registrar qué funcionalidades están estables, incompletas o sin verificar.
- [x] **M0.2 Entorno de pruebas aislado.** Crear tenants A/B, usuarios superadmin/admin/editor/viewer y visitantes; bots, conversaciones, leads, documentos y jobs ficticios. Configurar receptores locales de correo y webhooks.
- [x] **M0.3 Regresiones críticas.** Convertir las reproducciones de F01–F12 y F16–F18 en pruebas ejecutables. Incluir datos en las tablas; no probar únicamente estados vacíos.
- [x] **M0.4 Navegador.** Preparar recorridos autenticados para las 27 rutas, enlaces directos, recarga y vistas de 390/768/1440 px. Capturar errores de consola y fallos de red.
- [x] **M0.5 Contrato de entrega.** Checklist por cambio: migración, compatibilidad, prueba, rollback y evidencia. Establecer baseline de errores y tiempos antes de fijar mejoras de rendimiento.

**Aceptación:** los casos de seguridad fallan contra la versión actual por la razón esperada; las tablas con registros reproducen los errores; las pruebas pueden ejecutarse de nuevo con los mismos resultados. Ningún correo ni webhook de prueba alcanza a terceros.

**Entregables:** fixtures sanitizados, comandos de ejecución y matriz de cobertura. **Gate G0:** se puede empezar a cerrar hallazgos con evidencia.

## 5. M1 — Seguridad y autorización coherente

**Hallazgos:** F01, F02, F03, F04 y F06. **Bloquea incorporar nuevos clientes.**

- [ ] **M1.1 Aislamiento de conversaciones.** Resolver conversación y proyecto dentro del tenant antes de leer/escribir handover o rating. Revisar todos los endpoints que reciben IDs de recursos.
- [ ] **M1.2 Roles.** Centralizar comprobaciones: superadmin tiene gestión global; admin gestiona equipo y credenciales; editor modifica bots/contenido y opera conversaciones; viewer solo lee datos permitidos. Denegar por defecto operaciones no definidas.
- [ ] **M1.3 Documentos privados.** Separar originales privados de assets públicos. Definir cómo los obtiene el worker y cómo descarga un miembro autorizado. Usar acceso autenticado o enlaces firmados de caducidad corta, según el consumidor; no URLs públicas permanentes.
- [ ] **M1.4 Migración de archivos existentes.** Inventariar originales privados, moverlos al almacenamiento protegido, actualizar referencias y comprobar que las URLs antiguas dejan de servirlos. Evaluar cachés si hubo exposición; no limitar el cambio a nuevas subidas.
- [ ] **M1.5 Crawler seguro.** Aplicar una política compartida a análisis, aprovisionamiento y fetch de fuentes: HTTP(S), resolución DNS, bloqueo de IP/red privada/loopback/link-local y validación de cada redirección. Incorporar timeout y límites de bytes/páginas.
- [ ] **M1.6 Secretos de conectores.** Redactar tokens y headers sensibles en respuestas. Mostrar `configured` en lugar del valor. Impedir lectura a viewers y acceso entre tenants. Revisar logs y almacenamiento de secretos.
- [ ] **M1.7 Pruebas negativas.** Ejecutar matriz de roles, tenant incorrecto, UUID ajeno, usuario deshabilitado, origen no autorizado y archivo privado sin sesión.

**Aceptación:** todos los casos F01–F04 quedan rechazados; los recursos ajenos devuelven una respuesta controlada sin datos; ningún viewer puede escribir ni obtener secretos. El superadmin puede realizar las operaciones legítimas de F06 sin asignarse membresías manuales. Web pública y logos siguen disponibles; los originales privados no.

**Evidencia de cierre:** resultados por rol/tenant y prueba de migración/rollback de archivos. **Gate G1:** cero hallazgos de seguridad conocidos sin corregir para el alcance estable.

## 6. M2 — Dashboard fiable y accesible

**Hallazgos:** F05, F17, F23, F24, F25 y F26.

- [ ] **M2.1 Renderizado.** Importar los pipes requeridos en cada componente standalone. Probar conversaciones, documentos, leads, ingestas, miembros, solicitudes, dashboard, API keys y gráficos con registros.
- [ ] **M2.2 Contexto de workspace.** Esperar o reaccionar a la disponibilidad del tenant en playground y detalle. Manejar recarga, URL directa, tenant vacío y recurso inexistente. Evitar respuestas tardías del workspace anterior al cambiar de empresa.
- [ ] **M2.3 Estados visibles.** Separar loading, vacío, éxito y error en las páginas. Añadir reintento donde proceda, evitar dobles envíos y mostrar confirmación real al guardar. Un 500 nunca debe presentarse como «no hay datos».
- [ ] **M2.4 Estado de plataforma.** Retirar el «Operational» fijo o sustituirlo por señales reales, timestamp y estado desconocido/degradado. No mostrar salud de búsqueda o worker si no se mide.
- [ ] **M2.5 Móvil.** Corregir anchos mínimos y rejillas, navegación y acciones fuera de pantalla. Tablas con desplazamiento contenido o presentación adaptable; formularios y modales operables a 390 px.
- [ ] **M2.6 Accesibilidad.** Labels asociados, nombres de controles, foco de modales, retorno del foco, teclado y mensajes anunciados. Ejecutar Playwright y axe con sesión autenticada; revisar manualmente teclado.
- [ ] **M2.7 Navegación coherente.** Alinear accesos a Live Queue y Playground, títulos, textos y traducciones de los recorridos principales; no anunciar como «Soon» un flujo ya disponible.

**Aceptación:** las 27 rutas se inspeccionan sin errores Angular no controlados; el número de filas coincide con el conjunto paginado recibido; las URLs directas cargan su recurso. No se ocultan acciones fuera del viewport de prueba. Cero incidencias axe críticas/graves en el alcance probado y recorrido principal completo por teclado.

**Gate G2:** dashboard apto para uso interno diario, aunque todavía no certifica todos los servicios de fondo.

## 7. M3 — Onboarding, conocimiento y publicación

**Hallazgos:** F18, F19, F21 y F22. Añade validación real del flujo principal.

- [ ] **M3.1 Asistente honesto.** Detectar y confirmar nombre, idioma y páginas. Persistir `language`/`languageMode`; guardar la selección de páginas como restricción efectiva de ingesta, no solo metadata.
- [ ] **M3.2 Análisis y guardado.** Manejar web inaccesible, sitemap inválido, errores parciales, cancelación y reintento. Eliminar temporizadores que sobrevivan a un error. No generar bots duplicados por reintentos.
- [ ] **M3.3 Estado de ingesta.** Diferenciar éxito, parcial, fallo y ausencia de cambios; mostrar páginas descubiertas/obtenidas/indexadas y errores. Un job con todas las URLs fallidas no termina en éxito.
- [ ] **M3.4 Cola recuperable.** Revisar exclusión al reclamar jobs, reinicio durante una ingesta, límites de trabajo y recuperación de jobs atascados. Mostrar fecha y causa del último estado.
- [ ] **M3.5 Listados completos.** Paginación y búsqueda en servidor de documentos; total real y filtros. Revisar también conversaciones, leads y jobs para que el límite de respuesta no se convierta en pérdida de acceso desde la interfaz.
- [ ] **M3.6 Fuentes estables.** Verificar sitemap/HTML y documentos TXT/Markdown/PDF con archivos y sitios controlados, actualización, deduplicación y contenido eliminado. Mantener separación de visibilidad y tenant.
- [ ] **M3.7 Fuentes avanzadas.** Verificar individualmente API Endpoint, YouTube, Notion y Gemini con cuentas de prueba y límites. Si no se validan, mostrarlas como experimentales o deshabilitadas en el lanzamiento estable.
- [ ] **M3.8 Publicación.** Validar snippet real en una web controlada, dominios autorizados, bots draft/disabled, cambios de configuración, caché y carga del widget. Mostrar «snippet generado», «contenido listo» e «instalación verificada» como estados diferentes.

**Aceptación:** un operador crea un bot desde cero, excluye una página, confirma idioma, termina la ingesta, encuentra un documento antiguo mediante búsqueda y conversa desde una web externa de prueba. La página excluida no aparece en el corpus. Reintentar no duplica bot ni documentos; deshabilitar el bot tiene efecto verificable.

**Objetivo de producto propuesto:** primer bot útil en menos de 15 minutos con una web pequeña y accesible, medido en el piloto. No incluye tiempos arbitrarios de proveedores o webs de gran volumen.

## 8. M4 — Conversaciones, leads y calidad verificables

**Hallazgos:** F08, F09, F10, F11 y F16.

- [ ] **M4.1 Historial y exportación.** Corregir consultas sobre el esquema actual; exportar conversaciones, leads y analítica con filtros y fechas. Validar CSV con comillas, saltos de línea, caracteres internacionales y neutralización de fórmulas.
- [ ] **M4.2 CSAT.** Reparar conflicto de inserción y agregación activa. Probar sin ratings, primer rating, actualización y varios scores; comprobar media/distribución/total contra un conjunto conocido.
- [ ] **M4.3 Handover.** Reparar cola y transiciones pendientes/asignadas/cerradas. Registrar actor y fechas; impedir dos asignaciones incompatibles y escrituras de viewers.
- [ ] **M4.4 Alcance de atención humana.** Para el MVP web, definir aviso al operador, toma de solicitud, respuesta humana visible al visitante y resolución. Puede usarse polling con límites; no hace falta añadir WebSockets. Si se decide ofrecer solo una solicitud asíncrona de contacto, cambiar explícitamente el contrato y los textos de «Live» antes de lanzar.
- [ ] **M4.5 Leads.** Verificar captura, validación, almacenamiento, consentimiento/copy, entrega y reintento; distinguir capturado de entregado. No perder el lead si falla el receptor.
- [ ] **M4.6 Playground y test-chat.** Elegir el runtime canónico ya utilizado por el widget. Reparar el endpoint de test existente si sigue formando parte del contrato, o retirarlo documentadamente sin mantener dos motores de respuesta. Identificar conversaciones de prueba para no contaminar métricas comerciales.
- [ ] **M4.7 Evaluación RAG.** Preparar al menos 30 preguntas por bot piloto: respondibles, fuera de alcance, ambiguas y con contenido adversarial. Evaluar respuesta, cita, fallback e idioma con un criterio reproducible.
- [ ] **M4.8 Analítica.** Contrastar contadores, resolución, duración y periodos con fixtures conocidos; distinguir cero de desconocido. Acordar qué cuenta como conversación resuelta y evitar equiparar automáticamente «sin fallback» a resolución real.

**Aceptación:** el visitante conversa, deja lead, puntúa y solicita atención; el operador ve el historial, recibe/gestiona la solicitud y obtiene exportaciones válidas. El score mostrado coincide con la base de prueba. Se comprueba el flujo humano acordado hasta su resultado, no solo el cambio de un badge.

**Objetivos RAG propuestos para el gate:** al menos 90% de respuestas evaluadas como correctas en preguntas cubiertas, cero invenciones críticas y al menos 90% de citas pertinentes cuando se incluyen. Son objetivos iniciales que se deben medir; no resultados ya alcanzados.

## 9. M5 — Equipos y API externa utilizables

**Hallazgos:** F07 y F12; autorización de M1 como prerequisito.

- [ ] **M5.1 Invitaciones.** Corregir el conflicto SQL; implementar envío, aceptación, caducidad, reenvío y revocación. No activar acceso de un correo distinto al invitado ni permitir que un token sea reutilizado.
- [ ] **M5.2 Identidades.** Verificar invitación con usuario nuevo y existente, Google y contraseña, email normalizado y usuario deshabilitado. Conservar identidad/roles al vincular proveedores; no duplicar usuarios para el mismo acceso legítimo.
- [ ] **M5.3 Gestión de miembros.** Proteger al último admin y evitar pérdida accidental de administración. Mostrar operaciones de acuerdo con el rol; validar permisos otra vez en servidor.
- [ ] **M5.4 Contrato de API keys.** Definir y documentar endpoints admitidos y nombres canónicos de scopes. Empezar por los accesos anunciados en el panel: lectura de conversaciones/leads/analítica y operaciones de conocimiento que se decida exponer.
- [ ] **M5.5 Autenticación de keys.** Resolver hash, tenant, scopes, caducidad y revocación; mostrar el secreto una sola vez. Diferenciar una key de un JWT de sesión y no aceptar una credencial como alternativa silenciosa a otra inválida.
- [ ] **M5.6 Ejemplos ejecutables.** Añadir un ejemplo de llamada por capacidad expuesta, más respuestas de error y límites. No crear un SDK antes de validar que la API básica se usa.

**Aceptación:** invitación aceptada desde una sesión nueva termina con acceso al workspace correcto; un token caducado/revocado/reutilizado se rechaza. Una key válida puede ejecutar su operación; key revocada, caducada, de otro tenant o sin scope falla. El superadmin puede gestionar todos estos recursos legítimamente.

## 10. M6 — Automatización que realmente ejecuta

**Hallazgos:** F13, F14, F15 y F20.

- [ ] **M6.1 Horarios válidos.** Validar cron y zona horaria, pertenencia de todas las fuentes y existencia de recursos. Persistir próxima/última ejecución. Usar una dependencia mantenida si las instaladas no resuelven el cron; no escribir un parser propio.
- [ ] **M6.2 Ejecutor de programaciones.** Integrarlo en el worker/proceso apropiado con reclamación atómica, una ejecución por vencimiento y política de recuperación tras reinicio. No añadir un sistema de colas nuevo si PostgreSQL cubre el volumen inicial.
- [ ] **M6.3 Catálogo de eventos.** Elegir nombres canónicos, versionar payloads y alinear selector, productores y documentación. Incluir los eventos ofrecidos; retirar nombres sin semántica definida, por ejemplo fin de conversación sin una regla de cierre.
- [ ] **M6.4 Entrega de webhooks.** Firmar con HMAC conforme al contrato, cifrar/proteger el secreto recuperable que requiera la firma, establecer timeout, reintentos persistidos, `eventId` y trazas por entrega. Proteger también destinos y redirecciones frente a SSRF.
- [ ] **M6.5 Notificaciones.** Conectar leads, fallos de ingesta y baja confianza a preferencias por tenant; implementar digest diario/semanal. Evitar duplicados, aplicar límites y mostrar estado de entrega sin registrar datos sensibles innecesarios.
- [ ] **M6.6 Diagnóstico.** Mostrar próxima ejecución, último resultado, próximos reintentos y prueba de configuración. Diferenciar «guardado» de «entregado» y «test recibido» de «evento real recibido».

**Aceptación:** pruebas con reloj controlado demuestran ejecución única, pausa, reanudación y recuperación de horarios; cron inválido y fuente ajena se rechazan. Un receptor que falla recibe el reintento y valida firma/eventId. Cada evento anunciado llega a un receptor de prueba. Alertas y digest llegan a un buzón de prueba según preferencias; desactivarlas evita el envío.

## 11. M7 — Candidato listo para producción

**Resultado:** poder vender y mantener el alcance definido, no solo realizar una demo.

- [ ] **M7.1 Proveedores externos.** Comprobar claves, cuotas, timeout y errores de cada proveedor LLM ofrecido. Verificar consumo por tenant/bot. Telegram y WhatsApp solo se anuncian estables tras pruebas reales de entrada/salida, firma/verificación y desconexión.
- [ ] **M7.2 Límites y coste.** Medir mensajes/tokens/ingestas/almacenamiento disponibles y completar lo que falte para límites mínimos por tenant. Aplicar límites en servidor, avisar al operador y definir comportamiento al agotarlos. Sin facturación automática en este hito.
- [ ] **M7.3 Operación.** Logs correlacionados, errores API/worker, jobs atascados, correo/webhooks fallidos, disco y disponibilidad. Notificar incidencias accionables; no generar avisos por cada estado normal.
- [ ] **M7.4 Copias y recuperación.** Verificar backup de DB, archivos y configuración protegida; restaurar en un entorno separado y medir pérdida máxima/tiempo de recuperación. Definir objetivos y procedimiento con esos datos.
- [ ] **M7.5 Entrega reversible.** CI ejecuta regresiones de API/UI, aislamiento, contratos y builds. Probar migración de una copia existente, smoke posterior al despliegue y rollback compatible. Validar la versión compilada que realmente se publica.
- [ ] **M7.6 Producto y soporte.** Alinear funcionalidades/precios/FAQ con lo implementado; documentar límites, privacidad/retención, tratamiento de datos y canal de soporte. Revisar requisitos legales con quien corresponda, sin dar por certificada la conformidad por tener una página pública.
- [ ] **M7.7 Repaso completo.** Repetir las 27 rutas y los 100 casos de auditoría, ampliados con nuevas regresiones. Revisar mensajes, pérdida de datos y errores silenciosos.

**Aceptación:** cero P1 conocidos abiertos dentro del alcance estable; ninguna capacidad estable ficticia. Restauración y rollback demostrados. El recorrido principal no depende de ejecutar SQL manual ni consultar logs para completar una tarea habitual.

**Gate G3:** candidato de lanzamiento apto para piloto externo. Cualquier integración sin validación queda fuera de la oferta estable, con estado explícito.

## 12. M8 — Piloto y lanzamiento

- [ ] **M8.1 Reclutar 2–3 organizaciones piloto** con contenido y necesidades distintas; no usar únicamente los bots internos.
- [ ] **M8.2 Onboarding observado.** Medir tiempo hasta primer bot útil, pasos con ayuda, errores y abandono. Registrar problemas reproducibles y priorizar bloqueo de tareas frente a retoques cosméticos.
- [ ] **M8.3 Diez días laborables.** Observar ingestas programadas, entregas, coste, respuestas RAG, conversaciones y uso del dashboard. Mantener un registro de incidencias y cambios de configuración relevantes.
- [ ] **M8.4 Validación de valor.** Confirmar que cada organización mantiene al menos un bot publicado y logra su objetivo acordado: soporte, captación o consulta de conocimiento. Registrar intención de pago o continuidad; no confundir ausencia de errores con validación comercial.
- [ ] **M8.5 Decisión.** Lanzar, prolongar piloto o reducir alcance según métricas y bloqueos. Dejar explícitos los defectos menores aceptados, su impacto y su fecha de revisión.

**Criterios de lanzamiento propuestos:**

- Cero incidentes de aislamiento o exposición de datos y cero P1 sin resolver.
- 100% de los recorridos críticos automatizados pasan en el candidato desplegado.
- Menos de 1% de respuestas HTTP 5xx en operaciones válidas del piloto, excluyendo sondeos negativos controlados. Si la muestra es pequeña, informar también recuentos absolutos y verificar cada caso.
- Al menos dos organizaciones terminan onboarding y usan un bot publicado sin intervención del desarrollador para tareas habituales.
- Cumplir el objetivo de primer bot útil y los criterios RAG acordados, con evidencias por organización.
- Entregas y trabajos finalizan o muestran fallo recuperable dentro del presupuesto de reintentos; ninguna pérdida silenciosa de leads.
- Coste observado compatible con la tarifa y límites propuestos; si aún no se puede medir, no declarar viabilidad económica.

**Gate G4:** producto viable para el alcance validado. Expansión comercial solo después de revisar operación, calidad y valor del piloto.

## 13. Trazabilidad completa de la auditoría

| Hallazgo | Corrección principal | Hito responsable |
|---|---|---|
| F01 | Aislamiento de handover/rating y escritura de viewers | M1 |
| F02 | Originales privados protegidos y migración de existentes | M1 |
| F03 | Crawler y fetch de URLs con protección SSRF | M1 |
| F04 | Redacción y permisos de secretos de fuentes | M1 |
| F05 | Pipes y tablas con datos reales | M2 |
| F06 | Autorización coherente de superadmin | M1 |
| F07 | Invitaciones completas | M5 |
| F08 | Persistencia de valoraciones | M4 |
| F09 | Agregación y visualización CSAT | M4 |
| F10 | Cola y operación de atención humana | M4 |
| F11 | Exportaciones de conversaciones/leads/analítica | M4 |
| F12 | Consumo real de API keys y scopes | M5 |
| F13 | Ejecutor de ingestas programadas | M6 |
| F14 | Alertas y digest enviados | M6 |
| F15 | Eventos y entregas reales de webhooks | M6 |
| F16 | Contrato de test-chat/runtime canónico | M4 |
| F17 | Contexto disponible en deep links y recargas | M2 |
| F18 | Fallo total/parcial de ingestas veraz | M3 |
| F19 | Paginación, totales y búsqueda completa | M3 |
| F20 | Cron válido y fuentes del tenant correcto | M6 |
| F21 | Selección de páginas aplicada al corpus | M3 |
| F22 | Idioma detectado/elegido persistido | M3 |
| F23 | Estados de error separados de vacíos | M2 |
| F24 | Salud de plataforma real o estado desconocido | M2 |
| F25 | Layout y navegación móvil utilizables | M2 |
| F26 | Nombres accesibles, teclado y foco | M2 |

M0 crea la cobertura inicial y M7 verifica el cierre integrado. Ningún hallazgo se considera corregido por aparecer asignado a un hito.

## 14. Mejoras posteriores al producto viable

Estas iniciativas no bloquean el MVP definido. Requieren demanda, uso medido y mantenimiento asumible.

| Prioridad posterior | Mejora | Condición de inicio |
|---|---|---|
| 1 | Facturación y suscripciones automáticas | Clientes que pagan y proceso manual con fricción demostrada |
| 1 | Telegram/WhatsApp estables si quedaron experimentales | Clientes piloto que necesitan el canal y prueba completa con proveedor |
| 2 | HubSpot nativo | Al menos dos clientes con necesidad concreta y mapeo de datos acordado |
| 2 | Nuevas fuentes como Google Drive/Zendesk | Corpus de clientes que no puede incorporarse con las fuentes estables |
| 2 | Analítica de conversión y evaluación RAG más profunda | Uso suficiente y preguntas de negocio que las métricas actuales no resuelven |
| 3 | SSO/SAML, auditoría avanzada y marca blanca completa | Contrato enterprise que justifique alcance y soporte |
| 3 | SDK, Zapier/Make, Slack/Teams | API y eventos estables, demanda y responsable de mantenimiento |
| Aplazar | Voz, constructor visual de flujos, marketplace y orquestación multiagente | Validación comercial independiente; no necesarios para reparar la plataforma |

El registro mínimo de actor y cambios sensibles de M1/M4/M7 sí forma parte de la operación inicial; la auditoría avanzada de esta tabla no lo sustituye.

## 15. Seguimiento y decisiones pendientes

Antes de ejecutar M0, el responsable puede adoptar este alcance propuesto o ajustar cuatro decisiones de producto: público objetivo, atención humana asíncrona frente a respuesta dentro del widget, fuentes/canales que se venderán como estables y modelo de cobro manual del piloto. Estas decisiones no bloquean iniciar las correcciones de seguridad y tablas.

Formato de cierre por tarea: **ID, estado, cambio, prueba ejecutada, evidencia, versión desplegada y riesgo pendiente**. Estados: pendiente, en curso, bloqueada por dependencia, en validación y completada. Una capacidad deshabilitada para el MVP se registra como aplazada, no como implementada.

Primer lote recomendado: M0.1–M0.3 y M1.1–M1.3. Después, M1.5–M1.7 y M2.1–M2.3. Evitar empezar nuevos conectores mientras esos bloqueos sigan abiertos.

## Regla de ejecución y entrega por milestone

Todas las pruebas de ingeniería de M0-M8 se realizarán en localhost, con servicios aislados, datos sintéticos y receptores locales de correo/webhooks. En CI, los servicios serán locales al runner. No se ejecutarán pruebas contra producción, staging ni sistemas de clientes; las verificaciones externas incompatibles con esta regla se registrarán como bloqueadas. La observación del piloto no autoriza pruebas sobre sistemas de clientes.

Cada milestone tendrá su propia rama codex/, commits acotados y al menos una PR con sus IDs de tareas, pruebas locales ejecutadas/resultados, revisión independiente, riesgos y rollback. Tras verificar localmente, se harán los commits, se publicará la rama y se creará/actualizará la PR; estas acciones quedan autorizadas por la instrucción del usuario. Antes de cerrar el hito se registrarán los SHA y la URL de la PR en este seguimiento y en el estado de ejecución. No se hará merge ni despliegue automático.
