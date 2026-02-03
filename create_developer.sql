INSERT INTO "User" (id, username, email, password, role, "isActive", "createdAt", "updatedAt")
VALUES (
  gen_random_uuid(),
  'developer',
  'developer@fuelstation.com',
  '$2b$10$uyqWdi.IYu1Xl6Kg3XC50uE97YfnKjbw5SMlCx4FAjUUXDVD11FNe',
  'DEVELOPER',
  true,
  NOW(),
  NOW()
);
