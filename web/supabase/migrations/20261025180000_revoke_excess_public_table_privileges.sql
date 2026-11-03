-- API clients never need to create triggers or foreign-key constraints on
-- application tables. Remove legacy grants from existing public relations;
-- new objects are already covered by the hardened default privileges.
REVOKE TRIGGER, REFERENCES ON ALL TABLES IN SCHEMA public
  FROM PUBLIC, anon, authenticated, service_role;
