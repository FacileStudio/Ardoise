-- MEMBER is the role of every Facile SSO user. It is added on its own because
-- PostgreSQL cannot use a new enum value in the transaction that adds it.
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'MEMBER' BEFORE 'CLIENT';
