create or replace function public.is_valid_cpf(_cpf text)
returns boolean
language plpgsql
immutable
security invoker
set search_path = public
as $$
declare
  digits text;
  i int;
  sum int;
  check_digit int;
begin
  if _cpf is null then return false; end if;
  digits := regexp_replace(_cpf, '\D', '', 'g');
  if length(digits) <> 11 then return false; end if;
  if digits ~ '^(\d)\1{10}$' then return false; end if;

  sum := 0;
  for i in 1..9 loop
    sum := sum + cast(substring(digits from i for 1) as int) * (11 - i);
  end loop;
  check_digit := 11 - (sum % 11);
  if check_digit >= 10 then check_digit := 0; end if;
  if check_digit <> cast(substring(digits from 10 for 1) as int) then return false; end if;

  sum := 0;
  for i in 1..10 loop
    sum := sum + cast(substring(digits from i for 1) as int) * (12 - i);
  end loop;
  check_digit := 11 - (sum % 11);
  if check_digit >= 10 then check_digit := 0; end if;
  if check_digit <> cast(substring(digits from 11 for 1) as int) then return false; end if;

  return true;
end;
$$;

alter table public.athletes
  drop constraint if exists athletes_cpf_valid;

alter table public.athletes
  add constraint athletes_cpf_valid
  check (cpf is null or public.is_valid_cpf(cpf));