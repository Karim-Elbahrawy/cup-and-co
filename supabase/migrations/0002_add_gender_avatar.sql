-- Add gender and personality-avatar selection to users.
-- avatar_id maps to the 7 personality character set (1–7).
alter table users
  add column gender text check (gender in ('male', 'female', 'prefer_not_to_say')),
  add column avatar_id smallint check (avatar_id between 1 and 7);
