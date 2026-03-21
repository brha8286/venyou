-- Delete existing generated "Assign PM" and "Assign A1" tasks from all events
DELETE FROM "tasks" WHERE "name" IN ('Assign PM', 'Assign A1');
