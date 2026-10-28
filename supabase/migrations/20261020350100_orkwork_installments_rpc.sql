-- OR-K WORK — (re)generate a client's installment plan in finance income.
-- Only installments still "scheduled" are replaced; invoiced/paid ones stay.

create or replace function public.work_generate_installments(cid uuid, pid uuid default null)
returns int
language plpgsql security definer set search_path = public
as $$
declare
  b public.client_billing;
  n int;
  i int;
  pct numeric;
  total_pct numeric;
  due date;
  created int := 0;
begin
  if not (public.work_sees_all() or public.work_sees_finance()) then
    raise exception 'Sin permiso para generar el plan de pagos';
  end if;
  select * into b from public.client_billing where client_id = cid;
  if b.client_id is null or coalesce(b.contract_value, 0) <= 0 or b.first_due_on is null then
    return 0;
  end if;

  delete from public.fin_income
  where client_id = cid and status = 'scheduled' and installment_no is not null
    and (pid is null or project_id is not distinct from pid);

  n := case when array_length(b.installment_split, 1) > 0 then array_length(b.installment_split, 1) else b.installments end;
  total_pct := case when array_length(b.installment_split, 1) > 0 then (select sum(x) from unnest(b.installment_split) x) else 100 end;

  for i in 1..n loop
    pct := case when array_length(b.installment_split, 1) > 0 then b.installment_split[i] / total_pct else 1.0 / n end;
    due := case b.installment_frequency
      when 'biweekly' then b.first_due_on + (i - 1) * 15
      else (b.first_due_on + make_interval(months => i - 1))::date
    end;
    insert into public.fin_income (issued_on, client_id, project_id, description, amount, status,
                                   installment_no, installment_of, created_by)
    values (due, cid, pid, format('Cuota %s de %s', i, n), round(b.contract_value * pct, 0), 'scheduled',
            i, n, auth.uid());
    created := created + 1;
  end loop;
  return created;
end;
$$;

grant execute on function public.work_generate_installments(uuid, uuid) to authenticated;
