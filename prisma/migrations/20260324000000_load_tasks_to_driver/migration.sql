-- Reassign load-in and load-out task templates from event_manager to driver (Transportation Lead)
UPDATE task_templates
SET default_role = 'driver'
WHERE name IN ('Organize load-in hands', 'Organize load-out hands', 'Load-in')
  AND default_role = 'event_manager';
