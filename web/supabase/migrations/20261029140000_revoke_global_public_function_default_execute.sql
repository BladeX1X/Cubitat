-- PostgreSQL grants EXECUTE on new functions to PUBLIC globally by default.
-- A per-schema REVOKE cannot remove that global grant.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres
  REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
