SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

CREATE SCHEMA IF NOT EXISTS public;

COMMENT ON SCHEMA public IS 'standard public schema';

SET default_tablespace = '';

SET default_table_access_method = heap;

CREATE TABLE public.__migration__ (
    "lastMigration" text NOT NULL,
    rollback json NOT NULL
);

ALTER TABLE ONLY public.__migration__ REPLICA IDENTITY FULL;

CREATE TABLE public.__test__ (
    id bigint NOT NULL,
    unindexed bigint NOT NULL,
    name character varying NOT NULL
);

ALTER TABLE ONLY public.__test__ REPLICA IDENTITY FULL;

CREATE TABLE public."ftueSeenTime" (
    id bigint NOT NULL,
    "userId" bigint NOT NULL,
    "ftueType" character varying(255) NOT NULL,
    "time" timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP(6) NOT NULL
);

ALTER TABLE ONLY public."ftueSeenTime" REPLICA IDENTITY FULL;

CREATE TABLE public."mzTest" (
    id bigint NOT NULL,
    version integer DEFAULT 0 NOT NULL
);

ALTER TABLE ONLY public."mzTest" REPLICA IDENTITY FULL;

CREATE TABLE public.notif (
    id bigint NOT NULL,
    scope text NOT NULL,
    "notifType" character varying(30) NOT NULL,
    "userId" bigint NOT NULL,
    "groupingId" bigint NOT NULL,
    "time" timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP(6) NOT NULL,
    params text NOT NULL,
    "hasRead" boolean DEFAULT false NOT NULL
);

ALTER TABLE ONLY public.notif REPLICA IDENTITY FULL;

CREATE TABLE public."notifSetting" (
    id bigint NOT NULL,
    "userId" bigint NOT NULL,
    channel character varying(255) NOT NULL,
    push boolean NOT NULL,
    email boolean NOT NULL
);

ALTER TABLE ONLY public."notifSetting" REPLICA IDENTITY FULL;

CREATE TABLE public."unsubEmail" (
    id bigint NOT NULL,
    email character varying(255) NOT NULL,
    "time" timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP(6) NOT NULL
);

ALTER TABLE ONLY public."unsubEmail" REPLICA IDENTITY FULL;

CREATE TABLE public."unsubNotif" (
    id bigint NOT NULL,
    "userId" bigint NOT NULL,
    "entityType" character varying(255) NOT NULL,
    "entityId" bigint NOT NULL,
    "time" timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP(6) NOT NULL
);

ALTER TABLE ONLY public."unsubNotif" REPLICA IDENTITY FULL;

CREATE TABLE public."user" (
    id bigint NOT NULL,
    "isDeleted" boolean DEFAULT false NOT NULL,
    role integer DEFAULT 0 NOT NULL,
    email character varying(255) NOT NULL,
    name character varying(50) NOT NULL,
    birthday date

);

ALTER TABLE ONLY public."user" REPLICA IDENTITY FULL;

CREATE TABLE public."userAuth" (
    id bigint NOT NULL,
    "userId" bigint NOT NULL,
    "isDeleted" boolean DEFAULT false NOT NULL,
    password character varying(255),
    "registerTime" timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP(6) NOT NULL,
    "isEmailVerified" boolean DEFAULT false NOT NULL
);

ALTER TABLE ONLY public."userAuth" REPLICA IDENTITY FULL;

CREATE TABLE public."userDevice" (
    id bigint NOT NULL,
    "userId" bigint NOT NULL,
    platform character varying(255) NOT NULL,
    "deviceId" character varying(255) NOT NULL,
    "lastSeenTime" timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP(6) NOT NULL,
    "userAgent" text,
    "registrationToken" character varying(255)
);

ALTER TABLE ONLY public."userDevice" REPLICA IDENTITY FULL;

CREATE TABLE public."userMeta" (
    id bigint NOT NULL,
    "userId" bigint NOT NULL,
    "metaKey" character varying(30) NOT NULL,
    "metaValue" text NOT NULL
);

ALTER TABLE ONLY public."userMeta" REPLICA IDENTITY FULL;

ALTER TABLE ONLY public.__test__ ADD CONSTRAINT __test___pkey PRIMARY KEY (id);

ALTER TABLE ONLY public."ftueSeenTime" ADD CONSTRAINT "ftueSeenTime_id_idx" PRIMARY KEY (id);

ALTER TABLE ONLY public."mzTest" ADD CONSTRAINT "mzTest_id_idx" PRIMARY KEY (id);

ALTER TABLE ONLY public."notifSetting" ADD CONSTRAINT "notifSetting_id_idx" PRIMARY KEY (id);

ALTER TABLE ONLY public.notif ADD CONSTRAINT notif_id_idx PRIMARY KEY (id);

ALTER TABLE ONLY public."unsubEmail" ADD CONSTRAINT "unsubEmail_id_idx" PRIMARY KEY (id);

ALTER TABLE ONLY public."unsubNotif" ADD CONSTRAINT "unsubNotif_id_idx" PRIMARY KEY (id);

ALTER TABLE ONLY public."userAuth" ADD CONSTRAINT "userAuth_id_idx" PRIMARY KEY (id);

ALTER TABLE ONLY public."userDevice" ADD CONSTRAINT "userDevice_id_idx" PRIMARY KEY (id);

ALTER TABLE ONLY public."userMeta" ADD CONSTRAINT "userMeta_id_idx" PRIMARY KEY (id);

ALTER TABLE ONLY public."user" ADD CONSTRAINT user_id_idx PRIMARY KEY (id);

CREATE UNIQUE INDEX "ftueSeenTime_userId_ftueType_idx" ON public."ftueSeenTime" USING btree ("userId" DESC NULLS LAST, "ftueType") NULLS NOT DISTINCT;

CREATE UNIQUE INDEX "notifSetting_userId_channel_idx" ON public."notifSetting" USING btree ("userId" DESC NULLS LAST, channel) NULLS NOT DISTINCT;

CREATE UNIQUE INDEX "notif_notifType_userId_groupingId_idx" ON public.notif USING btree ("notifType", "userId" DESC NULLS LAST, "groupingId" DESC NULLS LAST);

CREATE INDEX "notif_userId_idx" ON public.notif USING btree ("userId" DESC NULLS LAST);

CREATE INDEX "notif_userId_time_idx" ON public.notif USING btree ("userId" DESC NULLS LAST, "time" DESC NULLS LAST);

CREATE UNIQUE INDEX "unsubEmail_email_idx" ON public."unsubEmail" USING btree (email) NULLS NOT DISTINCT;

CREATE UNIQUE INDEX "unsubNotif_entityType_entityId_userId_idx" ON public."unsubNotif" USING btree ("entityType", "entityId" DESC NULLS LAST, "userId" DESC NULLS LAST) NULLS NOT DISTINCT;

CREATE UNIQUE INDEX "userAuth_userId_idx" ON public."userAuth" USING btree ("userId" DESC NULLS LAST) NULLS NOT DISTINCT;

CREATE UNIQUE INDEX "userDevice_userId_deviceId_idx" ON public."userDevice" USING btree ("userId" DESC NULLS LAST, "deviceId") NULLS NOT DISTINCT;

CREATE UNIQUE INDEX "userMeta_userId_metaKey_idx" ON public."userMeta" USING btree ("userId" DESC NULLS LAST, "metaKey");

CREATE UNIQUE INDEX user_email_idx ON public."user" USING btree (email);

ALTER TABLE ONLY public."ftueSeenTime" ADD CONSTRAINT "ftueSeenTime_userId_fk" FOREIGN KEY ("userId") REFERENCES public."user"(id) ON UPDATE RESTRICT ON DELETE RESTRICT;

ALTER TABLE ONLY public."notifSetting" ADD CONSTRAINT "notifSetting_userId_fk" FOREIGN KEY ("userId") REFERENCES public."user"(id) ON UPDATE RESTRICT ON DELETE RESTRICT;

ALTER TABLE ONLY public.notif ADD CONSTRAINT "notif_userId_fk" FOREIGN KEY ("userId") REFERENCES public."user"(id) ON UPDATE RESTRICT ON DELETE RESTRICT;

ALTER TABLE ONLY public."userAuth" ADD CONSTRAINT "userAuth_userId_fk" FOREIGN KEY ("userId") REFERENCES public."user"(id) ON UPDATE RESTRICT ON DELETE RESTRICT;

ALTER TABLE ONLY public."userDevice" ADD CONSTRAINT "userDevice_userId_fk" FOREIGN KEY ("userId") REFERENCES public."user"(id) ON UPDATE RESTRICT ON DELETE RESTRICT;

ALTER TABLE ONLY public."userMeta" ADD CONSTRAINT "userMeta_userId_fk" FOREIGN KEY ("userId") REFERENCES public."user"(id) ON UPDATE RESTRICT ON DELETE RESTRICT;

REVOKE USAGE ON SCHEMA public FROM PUBLIC;
