create table public.scans (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  file_name text not null check (char_length(file_name) between 1 and 255),
  file_type text not null check (file_type in ('csv', 'txt')),
  size_bytes bigint not null check (size_bytes between 1 and 1048576),
  classification text not null check (
    classification in ('None', 'Low', 'Medium', 'High', 'Critical')
  ),
  total_findings integer not null check (total_findings >= 0),
  created_at timestamptz not null default now(),
  unique (id, owner_id)
);

create table public.findings (
  id uuid primary key default gen_random_uuid(),
  scan_id uuid not null,
  owner_id uuid not null,
  finding_type text not null check (
    finding_type in ('email', 'ukPhone', 'ukNino', 'paymentCard')
  ),
  risk text not null check (risk in ('Low', 'Medium', 'High', 'Critical')),
  occurrence_count integer not null check (occurrence_count > 0),
  masked_example text not null check (
    char_length(masked_example) between 1 and 320
  ),
  created_at timestamptz not null default now(),
  check (
    (finding_type = 'email' and risk = 'Low'
      and masked_example ~ '^[^@]\*{3}@[A-Za-z0-9.-]+$')
    or (finding_type = 'ukPhone' and risk = 'Medium'
      and masked_example ~ '^[0-9]{2}\*+[0-9]{3}$')
    or (finding_type = 'ukNino' and risk = 'High'
      and masked_example ~ '^[A-Z]{2}\*{6}[A-D]?$')
    or (finding_type = 'paymentCard' and risk = 'Critical'
      and masked_example ~ '^\*{9,15}[0-9]{4}$')
  ),
  unique (scan_id, finding_type),
  foreign key (scan_id, owner_id)
    references public.scans(id, owner_id)
    on delete cascade
);

create index findings_owner_id_idx on public.findings(owner_id);
create index findings_scan_id_idx on public.findings(scan_id);
create index scans_owner_created_at_idx on public.scans(owner_id, created_at desc);

alter table public.scans enable row level security;
alter table public.findings enable row level security;

create policy "Users read their own scans"
  on public.scans
  for select
  to authenticated
  using (owner_id = (select auth.uid()));

create policy "Users read findings for their own scans"
  on public.findings
  for select
  to authenticated
  using (
    owner_id = (select auth.uid())
    and exists (
      select 1
      from public.scans
      where scans.id = findings.scan_id
        and scans.owner_id = (select auth.uid())
    )
  );

create or replace function public.create_scan_with_findings(
  p_file_name text,
  p_file_type text,
  p_size_bytes bigint,
  p_classification text,
  p_total_findings integer,
  p_findings jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner_id uuid := auth.uid();
  v_scan_id uuid;
  v_finding jsonb;
  v_count integer;
  v_count_sum integer := 0;
  v_risk_rank integer;
  v_highest_risk text := 'None';
  v_highest_risk_rank integer := 0;
begin
  if v_owner_id is null then
    raise exception 'Authentication required';
  end if;

  if jsonb_typeof(p_findings) <> 'array' then
    raise exception 'Findings must be a JSON array';
  end if;

  for v_finding in select value from jsonb_array_elements(p_findings)
  loop
    v_count := (v_finding ->> 'count')::integer;
    if v_count <= 0 then
      raise exception 'Finding count must be positive';
    end if;

    if (v_finding ->> 'type') not in ('email', 'ukPhone', 'ukNino', 'paymentCard')
      or (v_finding ->> 'risk') not in ('Low', 'Medium', 'High', 'Critical')
      or coalesce(v_finding ->> 'maskedExample', '') = ''
    then
      raise exception 'Invalid finding';
    end if;

    if not (
      ((v_finding ->> 'type') = 'email'
        and (v_finding ->> 'risk') = 'Low'
        and (v_finding ->> 'maskedExample') ~ '^[^@]\*{3}@[A-Za-z0-9.-]+$')
      or ((v_finding ->> 'type') = 'ukPhone'
        and (v_finding ->> 'risk') = 'Medium'
        and (v_finding ->> 'maskedExample') ~ '^[0-9]{2}\*+[0-9]{3}$')
      or ((v_finding ->> 'type') = 'ukNino'
        and (v_finding ->> 'risk') = 'High'
        and (v_finding ->> 'maskedExample') ~ '^[A-Z]{2}\*{6}[A-D]?$')
      or ((v_finding ->> 'type') = 'paymentCard'
        and (v_finding ->> 'risk') = 'Critical'
        and (v_finding ->> 'maskedExample') ~ '^\*{9,15}[0-9]{4}$')
    ) then
      raise exception 'Finding must contain the expected masked representation';
    end if;

    v_count_sum := v_count_sum + v_count;
    v_risk_rank := case v_finding ->> 'risk'
      when 'Critical' then 4
      when 'High' then 3
      when 'Medium' then 2
      when 'Low' then 1
      else 0
    end;

    if v_risk_rank > v_highest_risk_rank then
      v_highest_risk := v_finding ->> 'risk';
      v_highest_risk_rank := v_risk_rank;
    end if;
  end loop;

  if v_count_sum <> p_total_findings or v_highest_risk <> p_classification then
    raise exception 'Scan summary does not match findings';
  end if;

  insert into public.scans (
    owner_id,
    file_name,
    file_type,
    size_bytes,
    classification,
    total_findings
  )
  values (
    v_owner_id,
    p_file_name,
    p_file_type,
    p_size_bytes,
    p_classification,
    p_total_findings
  )
  returning id into v_scan_id;

  for v_finding in select value from jsonb_array_elements(p_findings)
  loop
    insert into public.findings (
      scan_id,
      owner_id,
      finding_type,
      risk,
      occurrence_count,
      masked_example
    )
    values (
      v_scan_id,
      v_owner_id,
      v_finding ->> 'type',
      v_finding ->> 'risk',
      (v_finding ->> 'count')::integer,
      v_finding ->> 'maskedExample'
    );
  end loop;

  return v_scan_id;
end;
$$;

revoke all on table public.scans from anon, authenticated;
revoke all on table public.findings from anon, authenticated;
grant select on table public.scans to authenticated;
grant select on table public.findings to authenticated;

revoke all on function public.create_scan_with_findings(
  text,
  text,
  bigint,
  text,
  integer,
  jsonb
) from public, anon;
grant execute on function public.create_scan_with_findings(
  text,
  text,
  bigint,
  text,
  integer,
  jsonb
) to authenticated;
