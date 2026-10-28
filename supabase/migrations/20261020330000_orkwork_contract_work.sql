-- OR-K WORK — "obra o labor" employment contracts.

alter table public.hr_profiles drop constraint if exists hr_profiles_contract_type_check;
alter table public.hr_profiles add constraint hr_profiles_contract_type_check
  check (contract_type in ('indefinite', 'fixed', 'work', 'services', 'apprentice', 'freelance'));

-- What the obra/labor contract covers (it ends when that work is done).
alter table public.hr_profiles add column if not exists work_description text not null default '';
