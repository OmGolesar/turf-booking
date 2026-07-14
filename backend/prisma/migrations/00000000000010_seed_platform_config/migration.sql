-- app_settings (Nashik MVP defaults; Part 2.5.3 Table 7)
INSERT INTO "app_settings" ("key", "value", "value_type", "description", "is_secret") VALUES
  ('booking.session_ttl_minutes',       '10'::jsonb,                   'NUMBER',  'Booking session TTL in minutes',                       FALSE),
  ('booking.advance_window_days',       '30'::jsonb,                   'NUMBER',  'Max advance booking window in days',                   FALSE),
  ('booking.min_notice_minutes',        '30'::jsonb,                   'NUMBER',  'Minimum notice (minutes) before booking start',        FALSE),
  ('booking.cancellation_window_hours', '4'::jsonb,                    'NUMBER',  'Customer cancellation window (hours before start)',    FALSE),
  ('platform.support_phone',            '"+91-XXXX-XXXXXX"'::jsonb,    'STRING',  'Public support phone number',                          FALSE),
  ('platform.support_email',            '"support@turfx.in"'::jsonb,   'STRING',  'Public support email',                                 FALSE),
  ('platform.currency',                 '"INR"'::jsonb,                'STRING',  'Platform currency (single-currency MVP)',              FALSE),
  ('platform.timezone',                 '"Asia/Kolkata"'::jsonb,       'STRING',  'Platform timezone (single-timezone MVP)',              FALSE),
  ('platform.city_scope',               '"NASHIK"'::jsonb,             'STRING',  'MVP city scope',                                       FALSE),
  ('features.whatsapp_bookings',        'false'::jsonb,                'BOOLEAN', 'WhatsApp bookings feature flag',                       FALSE),
  ('features.walk_in_offline_payments', 'true'::jsonb,                 'BOOLEAN', 'Offline / walk-in payments feature flag',              FALSE),
  ('payments.razorpay.key_id',          '""'::jsonb,                   'SECRET',  'Razorpay Key ID (set at deploy)',                      TRUE),
  ('payments.razorpay.key_secret',      '""'::jsonb,                   'SECRET',  'Razorpay Key Secret (set at deploy)',                  TRUE);

-- background_jobs (Nashik MVP registry; Part 2.5.3 Table 8)
INSERT INTO "background_jobs" ("job_name", "job_type", "schedule_cron", "status", "next_run_at") VALUES
  ('ExpireBookingSessions',       'SCHEDULED', '*/1 * * * *', 'IDLE', NOW()),
  ('SendBookingReminders',        'SCHEDULED', '*/5 * * * *', 'IDLE', NOW()),
  ('DispatchNotifications',       'SCHEDULED', '* * * * *',   'IDLE', NOW()),
  ('PublishOutbox',               'SCHEDULED', '* * * * *',   'IDLE', NOW()),
  ('RecalculateVenueRatings',     'SCHEDULED', '0 * * * *',   'IDLE', NOW()),
  ('ArchivePublishedOutbox',      'SCHEDULED', '0 3 * * *',   'IDLE', NOW()),
  ('PurgeInactiveDeviceTokens',   'SCHEDULED', '0 4 * * 0',   'IDLE', NOW()),
  ('VerifyPaymentReconciliation', 'SCHEDULED', '0 2 * * *',   'IDLE', NOW());
