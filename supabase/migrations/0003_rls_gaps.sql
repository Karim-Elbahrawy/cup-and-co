-- Enable RLS on tables that were missing it

alter table prizes enable row level security;
create policy prizes_own_read on prizes for select using (auth.uid() = user_id);

alter table leaderboard_weeks enable row level security;
create policy leaderboard_weeks_no_anon on leaderboard_weeks for select using (false);

alter table audit_log enable row level security;
create policy audit_log_no_anon on audit_log for select using (false);
