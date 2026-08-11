-- AUTOMATIC FULL BACKUP RESTORE SCRIPT
-- Generated: 2026-08-11T11:09:37.089Z

-- --- DATA FOR TABLE: public.profiles ---
INSERT INTO public.profiles (id, full_name, email, phone, role, status, created_at) VALUES ('9dca1b27-0941-4045-a7b5-a179912cba1f', 'System User', 'admin@brook.com', NULL, 'admin', 'active', '2026-08-11T08:38:44.7097+00:00') ON CONFLICT DO NOTHING;
INSERT INTO public.profiles (id, full_name, email, phone, role, status, created_at) VALUES ('f039ebba-0f44-458d-b941-c7878a6964b8', 'shamna', 'shamna@gmail.com', '8589929880', 'manager', 'active', '2026-08-11T08:46:41.710422+00:00') ON CONFLICT DO NOTHING;
INSERT INTO public.profiles (id, full_name, email, phone, role, status, created_at) VALUES ('d1706714-b905-48e1-b451-dfbbc5a3cb47', 'reshma', 'reshma@gmail.com', '0000000000', 'employee', 'active', '2026-08-11T08:48:41.086933+00:00') ON CONFLICT DO NOTHING;

-- --- DATA FOR TABLE: public.employees ---
INSERT INTO public.employees (id, employee_id, user_id, full_name, email, phone, role, status, joined_date, notes, created_at, deleted_at) VALUES ('979e6545-2911-4d80-8f77-91055b91bf1c', 'EMP777777', '9dca1b27-0941-4045-a7b5-a179912cba1f', 'System Admin', 'admin@brook.com', '+1 555-0199', 'admin', 'active', '2026-08-11', 'System Administrator', '2026-08-11T08:39:44.206411+00:00', NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.employees (id, employee_id, user_id, full_name, email, phone, role, status, joined_date, notes, created_at, deleted_at) VALUES ('db8e15d1-49c1-4ddd-a287-fb55b5209cf8', 'EMP988748', 'f039ebba-0f44-458d-b941-c7878a6964b8', 'shamna', 'shamna@gmail.com', '8589929880', 'manager', 'active', '2026-08-11', '', '2026-08-11T08:46:41.710422+00:00', NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.employees (id, employee_id, user_id, full_name, email, phone, role, status, joined_date, notes, created_at, deleted_at) VALUES ('16f805e8-7bee-4d0d-aca7-3d104a20afb1', 'EMP540909', 'd1706714-b905-48e1-b451-dfbbc5a3cb47', 'reshma', 'reshma@gmail.com', '0000000000', 'employee', 'active', '2026-08-11', '', '2026-08-11T08:48:41.086933+00:00', NULL) ON CONFLICT DO NOTHING;

-- --- DATA FOR TABLE: public.room_types ---
INSERT INTO public.room_types (id, name, price, capacity, description, created_at, updated_at, deleted_at) VALUES ('3bh-premium-vila', '3bh premium vila', 15000, 9, '', '2026-08-11T08:49:52.463949+00:00', '2026-08-11T10:54:51.317+00:00', NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.room_types (id, name, price, capacity, description, created_at, updated_at, deleted_at) VALUES ('3bh-villa', '3bh villa', 13500, 9, '', '2026-08-11T08:51:33.362006+00:00', '2026-08-11T10:54:59.91+00:00', NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.room_types (id, name, price, capacity, description, created_at, updated_at, deleted_at) VALUES ('doormetry', 'Doormetry', 26000, 26, '', '2026-08-11T08:52:29.871861+00:00', '2026-08-11T10:55:07.148+00:00', NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.room_types (id, name, price, capacity, description, created_at, updated_at, deleted_at) VALUES ('hut-room', 'hut room', 5000, 3, '', '2026-08-11T08:51:49.575009+00:00', '2026-08-11T10:55:14.168+00:00', NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.room_types (id, name, price, capacity, description, created_at, updated_at, deleted_at) VALUES ('pool-delux-room', 'pool delux room', 4500, 3, '', '2026-08-11T08:52:17.751402+00:00', '2026-08-11T10:55:22.493+00:00', NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.room_types (id, name, price, capacity, description, created_at, updated_at, deleted_at) VALUES ('stream-delux-room', 'stream delux room', 4500, 3, '', '2026-08-11T08:52:05.983333+00:00', '2026-08-11T10:55:36.619+00:00', NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.room_types (id, name, price, capacity, description, created_at, updated_at, deleted_at) VALUES ('private-property', 'private property', 12000, 10, '', '2026-08-11T08:55:08.702308+00:00', '2026-08-11T10:56:55.432+00:00', NULL) ON CONFLICT DO NOTHING;

-- --- DATA FOR TABLE: public.rooms ---
INSERT INTO public.rooms (id, room_number, room_type_id, status, created_at, updated_at, deleted_at) VALUES ('f51f91c2-5d8b-4044-b029-8f66c041ef3b', '1', '3bh-premium-vila', 'available', '2026-08-11T08:52:49.554367+00:00', '2026-08-11T08:52:49.554367+00:00', NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.rooms (id, room_number, room_type_id, status, created_at, updated_at, deleted_at) VALUES ('b06adc0d-aebc-4672-9549-aab2e29be611', '2', '3bh-villa', 'available', '2026-08-11T08:52:59.045544+00:00', '2026-08-11T08:52:59.045544+00:00', NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.rooms (id, room_number, room_type_id, status, created_at, updated_at, deleted_at) VALUES ('3d1674b3-1938-4438-93f8-86f00e319dce', '3', 'stream-delux-room', 'available', '2026-08-11T08:53:10.225811+00:00', '2026-08-11T08:53:10.225811+00:00', NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.rooms (id, room_number, room_type_id, status, created_at, updated_at, deleted_at) VALUES ('ffa6676d-ce5c-43fb-aadb-bfdcc72f3588', '4', 'pool-delux-room', 'available', '2026-08-11T08:53:20.442389+00:00', '2026-08-11T08:53:20.442389+00:00', NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.rooms (id, room_number, room_type_id, status, created_at, updated_at, deleted_at) VALUES ('d5120778-03f3-4d06-a555-ca877bf370dd', '5', 'hut-room', 'available', '2026-08-11T08:53:30.465483+00:00', '2026-08-11T08:53:30.465483+00:00', NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.rooms (id, room_number, room_type_id, status, created_at, updated_at, deleted_at) VALUES ('0aa98c42-a3a2-4c88-aa7a-f8ca49f34fc1', '6', 'doormetry', 'available', '2026-08-11T08:53:39.77099+00:00', '2026-08-11T08:53:39.77099+00:00', NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.rooms (id, room_number, room_type_id, status, created_at, updated_at, deleted_at) VALUES ('50b8e215-533d-45ab-9cad-eaa3a91de5c5', 'p01', 'private-property', 'available', '2026-08-11T08:55:22.728397+00:00', '2026-08-11T08:55:22.728397+00:00', NULL) ON CONFLICT DO NOTHING;

-- --- DATA FOR TABLE: public.activity_logs ---
INSERT INTO public.activity_logs (id, action, details, user_id, user_name, user_role, created_at) VALUES ('45dffdb1-1f73-499e-a47e-d740b1295b3d', 'CLEAR_ALL_LOGS', 'Permanently cleared all activity logs', '9dca1b27-0941-4045-a7b5-a179912cba1f', 'System User', 'admin', '2026-08-11T10:59:22.893731+00:00') ON CONFLICT DO NOTHING;

