-- Remove "Assign PM" and "Assign A1" task templates (these roles are now set at event creation)
DELETE FROM "task_templates" WHERE "name" IN ('Assign PM', 'Assign A1');