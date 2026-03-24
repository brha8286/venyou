-- Reassign load-in and load-out task templates from event_manager to driver (Transportation Lead)
UPDATE "TaskTemplate"
SET "defaultRole" = 'driver'
WHERE "name" IN ('Organize load-in hands', 'Organize load-out hands', 'Load-in')
  AND "defaultRole" = 'event_manager';
