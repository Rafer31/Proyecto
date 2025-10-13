# Sistema de Notificaciones Push - Implementación Completada

## Resumen de Cambios

Se ha implementado exitosamente el sistema de notificaciones push para la aplicación Transporte Illapa. Este sistema envía notificaciones automáticas a los usuarios en momentos clave del viaje.

## Características Implementadas

### 1. Notificaciones Pre-Viaje (15 minutos antes)
- Se programa automáticamente cuando se crea un viaje
- Se envía 15 minutos antes de la hora de partida
- Informa al usuario que su viaje está próximo

### 2. Notificaciones Post-Viaje
- Se envía automáticamente cuando el conductor marca la llegada
- Solicita al usuario que califique el servicio
- Ayuda a recopilar feedback de los viajes

### 3. Persistencia de Notificaciones
- Las notificaciones programadas se guardan en la base de datos
- Se cargan automáticamente al iniciar la aplicación
- Sistema tolerante a reinicios de la aplicación

## Archivos Creados/Modificados

### Nuevos Archivos:
1. **`src/app/shared/services/notification.service.ts`**
   - Servicio principal de notificaciones
   - Maneja permisos, programación y envío de notificaciones
   - Gestiona la persistencia en base de datos

2. **`supabase/migrations/20250113_add_scheduled_notifications.sql`**
   - Migración para crear la tabla `notificacion_programada`
   - Incluye políticas RLS para seguridad
   - Índices para mejorar rendimiento

### Archivos Modificados:
1. **`src/app/app.ts`**
   - Inicializa el sistema de notificaciones al arrancar la app
   - Solicita permisos de notificación al usuario
   - Carga notificaciones pendientes

2. **`src/app/users/pages/admin-page/services/trip-planning.service.ts`**
   - Programa notificación pre-viaje al crear viajes
   - Maneja tanto viajes simples como viajes con retorno

3. **`src/app/users/pages/bus-driver-page/services/driver.service.ts`**
   - Envía notificación post-viaje al marcar llegada
   - Se integra con el flujo de finalización de viajes

4. **`src/app/users/pages/admin-page/pages/trip-planning-page/components/create-from-template-dialog/`**
   - Soporte completo para crear viajes de retorno desde plantillas
   - Formularios separados para viaje de ida y retorno
   - Validaciones independientes para cada viaje
   - Integración con el sistema de notificaciones

## Pasos para Activar el Sistema

### 1. Ejecutar la Migración de Base de Datos

Debes ejecutar la migración SQL en tu base de datos Supabase:

```bash
# Opción 1: Usando Supabase CLI (recomendado)
supabase db reset

# Opción 2: Ejecutar manualmente
# Copia el contenido de supabase/migrations/20250113_add_scheduled_notifications.sql
# y ejecútalo en el SQL Editor de Supabase Dashboard
```

### 2. Verificar Permisos de Notificación

Al iniciar la aplicación, el navegador solicitará permiso para mostrar notificaciones. Los usuarios deben aceptar este permiso para recibir notificaciones.

### 3. Probar el Sistema

#### Probar Notificación Pre-Viaje:
1. Crea un viaje con fecha/hora dentro de las próximas 24 horas
2. Espera a que falten 15 minutos para la partida
3. Deberías recibir una notificación automática

#### Probar Notificación Post-Viaje:
1. Como conductor, inicia un viaje
2. Marca la hora de llegada al finalizar
3. Los pasajeros recibirán una notificación para calificar el servicio

## Estructura de la Tabla `notificacion_programada`

```sql
CREATE TABLE notificacion_programada (
  id TEXT PRIMARY KEY,
  tipo TEXT NOT NULL, -- 'pre-trip' | 'post-trip'
  idplanificacion UUID NOT NULL,
  fechahora_programada TIMESTAMP WITH TIME ZONE NOT NULL,
  titulo TEXT NOT NULL,
  mensaje TEXT NOT NULL,
  datos JSONB,
  estado TEXT NOT NULL DEFAULT 'pendiente', -- 'pendiente' | 'enviada' | 'expirada'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Flujo de Notificaciones

### Notificación Pre-Viaje:
```
1. Admin crea viaje →
2. Sistema programa notificación (15 min antes) →
3. Guarda en BD + setTimeout (si es < 24h) →
4. Envía notificación a la hora programada
```

### Notificación Post-Viaje:
```
1. Conductor marca llegada →
2. Sistema actualiza horarealllegada →
3. Envía notificación inmediata a pasajeros →
4. Pasajeros pueden calificar el servicio
```

## Consideraciones Técnicas

### Limitaciones del Navegador:
- Las notificaciones requieren que la app esté instalada como PWA o que el navegador tenga permisos
- `setTimeout` tiene un límite de ~24.8 días, por lo que viajes muy lejanos se programan desde la BD
- Las notificaciones solo funcionan si el usuario ha dado permisos

### Tolerancia a Fallos:
- Si falla la programación de notificación, no interrumpe la creación del viaje
- Los errores se registran en consola para debugging
- Las notificaciones se recargan automáticamente al reiniciar la app

### Seguridad (RLS):
- Los usuarios solo pueden ver notificaciones de sus propios viajes
- El sistema puede crear/actualizar todas las notificaciones
- Las políticas RLS protegen datos sensibles

## Mejoras Futuras Potenciales

1. **Push Notifications con Service Worker:**
   - Implementar notificaciones que funcionen incluso con la app cerrada
   - Requiere configuración de servidor push y VAPID keys

2. **Notificaciones Personalizadas:**
   - Permitir a los usuarios configurar cuándo quieren recibir notificaciones
   - Opciones de silenciar notificaciones

3. **Historial de Notificaciones:**
   - Vista en la app de notificaciones recibidas
   - Marcar como leídas/no leídas

4. **Notificaciones Adicionales:**
   - Cambios en horarios de viaje
   - Cancelaciones
   - Recordatorios de reserva

## Soporte

Si encuentras algún problema con el sistema de notificaciones:

1. Verifica que la migración se ejecutó correctamente
2. Confirma que el usuario ha dado permisos de notificación
3. Revisa la consola del navegador para mensajes de error
4. Verifica que los viajes se están creando correctamente en la BD

## Resumen de Funcionalidades Completadas

✅ Fix overflow del diálogo de crear desde plantilla
✅ Soporte completo para crear retornos desde plantillas
✅ Sistema de notificaciones push implementado
✅ Notificaciones 15 minutos antes del viaje
✅ Notificaciones al finalizar viaje para calificación
✅ Persistencia de notificaciones en base de datos
✅ Inicialización automática al arrancar la app
✅ Integración con flujo de creación y finalización de viajes

---

**Nota:** Recuerda ejecutar la migración de base de datos antes de usar el sistema de notificaciones.
