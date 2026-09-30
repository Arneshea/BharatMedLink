-- Migration 004: Core Hospital Referral Flow, Verifications, and Clinical Details

-- 1. Extend hospitals table with verification and trust columns
alter table hospitals add column if not exists is_verified boolean not null default true;
alter table hospitals add column if not exists verification_status text not null default 'VERIFIED';
alter table hospitals add column if not exists last_verified_at timestamptz not null default now();
alter table hospitals add column if not exists verification_source text not null default 'NABH / State Health Authority';
alter table hospitals add column if not exists trust_status text not null default 'CONFIRMED';
alter table hospitals add column if not exists why_points jsonb not null default '[]';
alter table hospitals add column if not exists city_region text not null default 'Delhi NCR';
alter table hospitals add column if not exists on_call_specialists jsonb not null default '[]';
alter table hospitals add column if not exists bed_capacity_total integer not null default 40;
alter table hospitals add column if not exists bed_capacity_occupied integer not null default 12;

-- 2. Extend patients table with clinical profile, vitals, allergies, UHID
alter table patients add column if not exists uhid text null;
alter table patients add column if not exists blood_group text null default 'Unknown';
alter table patients add column if not exists emergency_contact_name text null;
alter table patients add column if not exists emergency_contact_phone text null;
alter table patients add column if not exists allergies text null default 'None reported';
alter table patients add column if not exists medical_history text null;
alter table patients add column if not exists current_medications text null;
alter table patients add column if not exists previous_surgeries text null;
alter table patients add column if not exists vitals jsonb null default '{"hr": 78, "bp": "120/80", "spo2": 98, "temp": 98.6}';
alter table patients add column if not exists reports jsonb null default '[]';
alter table patients add column if not exists consent_given boolean not null default true;

-- 3. Extend referrals table
alter table referrals add column if not exists emergency_category text not null default 'CARDIAC';
alter table referrals add column if not exists patient_vitals jsonb not null default '{"hr": 112, "bp": "90/60", "spo2": 92, "temp": 98.6}';
alter table referrals add column if not exists preferred_requirements jsonb not null default '[]';
alter table referrals add column if not exists assigned_ambulance text null default 'KA-01-M-9283';
alter table referrals add column if not exists eta_minutes integer null default 8;
alter table referrals add column if not exists receiving_doctor_name text null;
alter table referrals add column if not exists audit_trail jsonb not null default '[]';
alter table referrals add column if not exists consent_confirmed boolean not null default true;

-- 4. User accounts table for role-based authentication (Patient, Hospital Staff, Admin)
create table if not exists user_accounts (
  id uuid primary key default uuid_generate_v4(),
  email text unique not null,
  password_hash text not null default '',
  role text not null, -- 'PATIENT', 'HOSPITAL_STAFF', 'NETWORK_ADMIN'
  display_name text not null,
  hospital_id uuid null references hospitals(id) on delete set null,
  details jsonb not null default '{}',
  created_at timestamptz not null default now()
);

-- Seed realistic hospitals matching the demo UI
insert into hospitals (id, name, address, latitude, longitude, type, is_synthetic, is_verified, verification_status, verification_source, trust_status, why_points, city_region, bed_capacity_total, bed_capacity_occupied)
values
(
  'a1111111-1111-1111-1111-111111111111',
  'Max Super Specialty Hospital',
  '1 2 Press Enclave Marg, Saket, New Delhi',
  28.5273, 77.2155,
  'TERTIARY_CARDIAC_HUB',
  true, true, 'VERIFIED', 'NABH / Delhi Health Dept', 'CONFIRMED',
  '["Primary Percutaneous Center", "24/7 Cardiac OT & Cath Lab", "NABH Accredited Tertiary Center"]',
  'Delhi NCR', 60, 42
),
(
  'b2222222-2222-2222-2222-222222222222',
  'Apollo Hospital',
  'Delhi-Mathura Road, Sarita Vihar, New Delhi',
  28.5385, 77.2982,
  'COMPREHENSIVE_STROKE_CENTER',
  true, true, 'VERIFIED', 'JCI / NABH Accredited', 'CONFIRMED',
  '["Comprehensive Stroke & Neuro Center", "24/7 Dedicated MRI & CT", "Level-1 Critical Care Unit"]',
  'Delhi NCR', 75, 68
),
(
  'c3333333-3333-3333-3333-333333333333',
  'Fortis Memorial Research Institute',
  'Sector 44, Opposite HUDA City Centre, Gurugram',
  28.4595, 77.0726,
  'LEVEL_1_TRAUMA_CARDIAC',
  true, true, 'VERIFIED', 'NABH / Green OT Certified', 'CONFIRMED',
  '["Level-1 Trauma & Emergency Hub", "Dedicated Pediatric & Cardiac ICU", "On-Call ECMO & Cath Lab"]',
  'Delhi NCR', 80, 56
),
(
  'd4444444-4444-4444-4444-444444444444',
  'BLK-Max Super Specialty Hospital',
  'Pusa Road, Radha Soami Satsang, Rajendra Place, New Delhi',
  28.6433, 77.1793,
  'MULTI_SPECIALTY',
  true, true, 'VERIFIED', 'NABH / NABL Accredited', 'CONFIRMED',
  '["Advanced Critical Care & Respiratory Unit", "24/7 Rapid Response Team", "Dedicated Sepsis Management Unit"]',
  'Delhi NCR', 50, 38
),
(
  'e5555555-5555-5555-5555-555555555555',
  'Artemis Hospital',
  'Sector 51, Gurugram, Haryana',
  28.4357, 77.0782,
  'ORTHOPEDIC_SURGICAL',
  true, true, 'VERIFIED', 'NABH Accredited', 'UNABLE_TO_ACCEPT',
  '["Ortho & Joint Reconstruction Center", "Critical bed capacity constrained"]',
  'Delhi NCR', 45, 45
),
(
  'f6666666-6666-6666-6666-666666666666',
  'Global Health City',
  '439 Cheran Nagar, Perumbakkam, Chennai',
  12.9063, 80.1982,
  'MULTI_SPECIALTY',
  true, false, 'PENDING', 'State Licensing Board Pending', 'UNVERIFIED',
  '["Multi-organ transplant unit", "Documentation under review"]',
  'Chennai', 120, 95
),
(
  'a7777777-7777-7777-7777-777777777777',
  'Narayana Health Hub',
  '258/A Bommasandra Industrial Area, Bangalore',
  12.8152, 77.6874,
  'CARDIAC_CENTER',
  true, false, 'PENDING', 'Quality Audit In-Progress', 'UNVERIFIED',
  '["Advanced Pediatric & Adult Cardiac Center", "Re-certification audit scheduled"]',
  'Bangalore', 150, 110
)
on conflict (id) do update set
  name = excluded.name,
  address = excluded.address,
  type = excluded.type,
  why_points = excluded.why_points,
  trust_status = excluded.trust_status,
  is_verified = excluded.is_verified,
  verification_status = excluded.verification_status,
  verification_source = excluded.verification_source,
  city_region = excluded.city_region,
  bed_capacity_total = excluded.bed_capacity_total,
  bed_capacity_occupied = excluded.bed_capacity_occupied;

-- Seed Capabilities
insert into hospital_capabilities (hospital_id, capability) values
('a1111111-1111-1111-1111-111111111111', 'CARDIOLOGY'),
('a1111111-1111-1111-1111-111111111111', 'ICU'),
('a1111111-1111-1111-1111-111111111111', 'CATH_LAB'),
('a1111111-1111-1111-1111-111111111111', 'CARDIAC_OT'),
('a1111111-1111-1111-1111-111111111111', 'EMERGENCY'),
('a1111111-1111-1111-1111-111111111111', 'CT'),
('a1111111-1111-1111-1111-111111111111', 'VENTILATOR'),

('b2222222-2222-2222-2222-222222222222', 'NEUROLOGY'),
('b2222222-2222-2222-2222-222222222222', 'CT'),
('b2222222-2222-2222-2222-222222222222', 'MRI'),
('b2222222-2222-2222-2222-222222222222', 'ICU'),
('b2222222-2222-2222-2222-222222222222', 'STROKE_UNIT'),
('b2222222-2222-2222-2222-222222222222', 'CARDIOLOGY'),
('b2222222-2222-2222-2222-222222222222', 'CATH_LAB'),
('b2222222-2222-2222-2222-222222222222', 'EMERGENCY'),

('c3333333-3333-3333-3333-333333333333', 'TRAUMA_CARE'),
('c3333333-3333-3333-3333-333333333333', 'CARDIOLOGY'),
('c3333333-3333-3333-3333-333333333333', 'ICU'),
('c3333333-3333-3333-3333-333333333333', 'PICU'),
('c3333333-3333-3333-3333-333333333333', 'NICU'),
('c3333333-3333-3333-3333-333333333333', 'BLOOD_BANK'),
('c3333333-3333-3333-3333-333333333333', 'OT'),
('c3333333-3333-3333-3333-333333333333', 'EMERGENCY'),
('c3333333-3333-3333-3333-333333333333', 'CATH_LAB'),

('d4444444-4444-4444-4444-444444444444', 'SURGICAL'),
('d4444444-4444-4444-4444-444444444444', 'ICU'),
('d4444444-4444-4444-4444-444444444444', 'RESPIRATORY'),
('d4444444-4444-4444-4444-444444444444', 'VENTILATOR'),
('d4444444-4444-4444-4444-444444444444', 'EMERGENCY'),

('e5555555-5555-5555-5555-555555555555', 'SURGICAL'),
('e5555555-5555-5555-5555-555555555555', 'ORTHOPEDICS'),
('e5555555-5555-5555-5555-555555555555', 'ICU'),
('e5555555-5555-5555-5555-555555555555', 'EMERGENCY')
on conflict do nothing;

-- Seed resources & operational state
insert into hospital_resources (hospital_id, resource_type, measurement_type, total_count_optional) values
('a1111111-1111-1111-1111-111111111111', 'ICU', 'COUNT', 10),
('a1111111-1111-1111-1111-111111111111', 'CATH_LAB', 'BINARY_SERVICE', null),
('a1111111-1111-1111-1111-111111111111', 'CARDIOLOGY_SPECIALIST', 'PERSONNEL_AVAILABILITY', null),
('a1111111-1111-1111-1111-111111111111', 'CT', 'BINARY_SERVICE', null),

('b2222222-2222-2222-2222-222222222222', 'ICU', 'COUNT', 12),
('b2222222-2222-2222-2222-222222222222', 'CATH_LAB', 'BINARY_SERVICE', null),
('b2222222-2222-2222-2222-222222222222', 'NEUROLOGY_SPECIALIST', 'PERSONNEL_AVAILABILITY', null),
('b2222222-2222-2222-2222-222222222222', 'CT', 'BINARY_SERVICE', null),
('b2222222-2222-2222-2222-222222222222', 'MRI', 'BINARY_SERVICE', null),

('c3333333-3333-3333-3333-333333333333', 'ICU', 'COUNT', 15),
('c3333333-3333-3333-3333-333333333333', 'PICU', 'COUNT', 6),
('c3333333-3333-3333-3333-333333333333', 'NICU', 'COUNT', 5),
('c3333333-3333-3333-3333-333333333333', 'BLOOD_BANK', 'BINARY_SERVICE', null),

('d4444444-4444-4444-4444-444444444444', 'ICU', 'COUNT', 8),
('d4444444-4444-4444-4444-444444444444', 'VENTILATOR', 'COUNT', 8),

('e5555555-5555-5555-5555-555555555555', 'ICU', 'COUNT', 10)
on conflict do nothing;

insert into hospital_state (hospital_id, resource_type, measurement_type, status, available_count_optional, total_count_optional, source_event_id, updated_at) values
('a1111111-1111-1111-1111-111111111111', 'ICU', 'COUNT', 'AVAILABLE', 4, 10, 'seed-a1', now()),
('a1111111-1111-1111-1111-111111111111', 'CATH_LAB', 'BINARY_SERVICE', 'OPERATIONAL', null, null, 'seed-a2', now()),
('a1111111-1111-1111-1111-111111111111', 'CARDIOLOGY_SPECIALIST', 'PERSONNEL_AVAILABILITY', 'AVAILABLE', null, null, 'seed-a3', now()),
('a1111111-1111-1111-1111-111111111111', 'CT', 'BINARY_SERVICE', 'OPERATIONAL', null, null, 'seed-a4', now()),

('b2222222-2222-2222-2222-222222222222', 'ICU', 'COUNT', 'AVAILABLE', 2, 12, 'seed-b1', now()),
('b2222222-2222-2222-2222-222222222222', 'CATH_LAB', 'BINARY_SERVICE', 'OPERATIONAL', null, null, 'seed-b2', now()),
('b2222222-2222-2222-2222-222222222222', 'NEUROLOGY_SPECIALIST', 'PERSONNEL_AVAILABILITY', 'AVAILABLE', null, null, 'seed-b3', now()),
('b2222222-2222-2222-2222-222222222222', 'CT', 'BINARY_SERVICE', 'OPERATIONAL', null, null, 'seed-b4', now()),

('c3333333-3333-3333-3333-333333333333', 'ICU', 'COUNT', 'AVAILABLE', 6, 15, 'seed-c1', now()),
('c3333333-3333-3333-3333-333333333333', 'PICU', 'COUNT', 'AVAILABLE', 3, 6, 'seed-c2', now()),
('c3333333-3333-3333-3333-333333333333', 'NICU', 'COUNT', 'AVAILABLE', 2, 5, 'seed-c3', now()),
('c3333333-3333-3333-3333-333333333333', 'BLOOD_BANK', 'BINARY_SERVICE', 'OPERATIONAL', null, null, 'seed-c4', now()),

('d4444444-4444-4444-4444-444444444444', 'ICU', 'COUNT', 'AVAILABLE', 3, 8, 'seed-d1', now()),
('d4444444-4444-4444-4444-444444444444', 'VENTILATOR', 'COUNT', 'AVAILABLE', 5, 8, 'seed-d2', now()),

('e5555555-5555-5555-5555-555555555555', 'ICU', 'COUNT', 'UNAVAILABLE', 0, 10, 'seed-e1', now())
on conflict do nothing;
