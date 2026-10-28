-- OR-K WORK — the obra/labor description is contract data (HR-only).

create or replace function public.work_guard_hr_profile()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if not public.work_is_hr() and (
    tg_op = 'INSERT' and (new.salary is not null or new.start_date is not null or new.end_date is not null
                          or new.contract_value is not null or new.bank_account_number <> '')
    or tg_op = 'UPDATE' and (
      new.contract_type is distinct from old.contract_type or new.start_date is distinct from old.start_date or
      new.end_date is distinct from old.end_date or new.salary is distinct from old.salary or
      new.salary_period is distinct from old.salary_period or new.eps is distinct from old.eps or
      new.pension_fund is distinct from old.pension_fund or new.arl is distinct from old.arl or
      new.compensation_fund is distinct from old.compensation_fund or new.notes is distinct from old.notes or
      new.document_number is distinct from old.document_number or new.document_type is distinct from old.document_type or
      new.work_schedule is distinct from old.work_schedule or new.arl_risk_level is distinct from old.arl_risk_level or
      new.severance_fund is distinct from old.severance_fund or new.transport_allowance is distinct from old.transport_allowance or
      new.contract_value is distinct from old.contract_value or new.payment_frequency is distinct from old.payment_frequency or
      new.pays_own_social_security is distinct from old.pays_own_social_security or new.tax_id is distinct from old.tax_id or
      new.bank_name is distinct from old.bank_name or new.bank_account_type is distinct from old.bank_account_type or
      new.bank_account_number is distinct from old.bank_account_number or
      new.work_description is distinct from old.work_description
    )
  ) then
    raise exception 'Solo Talento humano puede cambiar contrato, pago, banco o seguridad social';
  end if;
  new.updated_at := now();
  new.updated_by := auth.uid();
  return new;
end;
$$;
