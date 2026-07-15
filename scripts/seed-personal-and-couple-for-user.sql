-- Script: crea grupos PERSONAL, COUPLE y GROUP para el usuario indicado
-- Uso:
--   PGPASSWORD='Room911123*' psql -h localhost -U duobalance -d duobalance \
--     -v user_email='reyes@gmail.com' \
--     -f scripts/seed-personal-and-couple-for-user.sql

\set ON_ERROR_STOP on
BEGIN;

DO $$
DECLARE
  v_user_id           uuid;
  v_personal_id       uuid;
  v_couple_id         uuid;
  v_group_id          uuid;
  v_personal_invite   text;
  v_couple_invite     text;
  v_group_invite      text;
  v_user_email        text := current_setting('user_email', true);
BEGIN
  IF v_user_email IS NULL OR v_user_email = '' THEN
    RAISE EXCEPTION 'Debes pasar -v user_email=<correo>';
  END IF;

  SELECT id INTO v_user_id FROM "User" WHERE email = v_user_email;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario % no existe', v_user_email;
  END IF;

  v_personal_invite := upper(substring(md5(random()::text) from 1 for 6));
  v_couple_invite   := upper(substring(md5(random()::text) from 1 for 6));
  v_group_invite    := upper(substring(md5(random()::text) from 1 for 6));

  INSERT INTO "Group" (id, name, type, "inviteCode", "createdAt")
  VALUES (gen_random_uuid(), 'Espacio personal', 'PERSONAL', v_personal_invite, now())
  RETURNING id INTO v_personal_id;

  INSERT INTO "Group" (id, name, type, "inviteCode", "createdAt")
  VALUES (gen_random_uuid(), 'Pareja', 'COUPLE', v_couple_invite, now())
  RETURNING id INTO v_couple_id;

  INSERT INTO "Group" (id, name, type, "inviteCode", "createdAt")
  VALUES (gen_random_uuid(), 'Grupo', 'GROUP', v_group_invite, now())
  RETURNING id INTO v_group_id;

  INSERT INTO "GroupMember" (id, role, "joinedAt", "userId", "groupId")
  VALUES
    (gen_random_uuid(), 'OWNER', now(), v_user_id, v_personal_id),
    (gen_random_uuid(), 'OWNER', now(), v_user_id, v_couple_id),
    (gen_random_uuid(), 'OWNER', now(), v_user_id, v_group_id);

  RAISE NOTICE 'Personal: % (invite %)', v_personal_id, v_personal_invite;
  RAISE NOTICE 'Couple:   % (invite %)', v_couple_id,   v_couple_invite;
  RAISE NOTICE 'Group:    % (invite %)', v_group_id,    v_group_invite;
END $$;

COMMIT;
