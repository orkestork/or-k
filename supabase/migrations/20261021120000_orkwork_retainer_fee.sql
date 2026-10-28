-- OR-K WORK — for a retainer the billing value is the monthly fee, so each
-- installment is the full fee (it used to be split across the months).

create or replace function public.work_generate_installments(cid uuid, pid uuid default null)
returns int
language plpgsql security definer set search_path = public
as $$
declare
  b public.client_billing;
  has_split boolean;
  n_total int;
  billed_count int;
  billed_sum numeric;
  contract_total numeric;
  remaining numeric;
  n_new int;
  weights numeric[];
  weight_sum numeric;
  i int;
  k int;
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

  select count(*), coalesce(sum(amount), 0) into billed_count, billed_sum
  from public.fin_income
  where client_id = cid and installment_no is not null and status <> 'scheduled'
    and (pid is null or project_id is not distinct from pid);

  -- A retainer's value is the monthly fee: the contract is fee × months.
  contract_total := b.contract_value * case when b.model = 'retainer' then greatest(1, b.installments) else 1 end;
  remaining := contract_total - billed_sum;
  if remaining <= 0 then
    return 0;
  end if;

  has_split := b.model <> 'retainer' and coalesce(array_length(b.installment_split, 1), 0) > 0;
  n_total := case when has_split then array_length(b.installment_split, 1) else b.installments end;
  n_new := greatest(1, n_total - billed_count);

  -- weights for the installments still to come
  weights := array[]::numeric[];
  for i in 1..n_new loop
    k := billed_count + i;
    weights := weights || case when has_split and k <= array_length(b.installment_split, 1) then b.installment_split[k] else 1 end;
  end loop;
  select sum(x) into weight_sum from unnest(weights) x;

  for i in 1..n_new loop
    k := billed_count + i;
    due := case b.installment_frequency
      when 'biweekly' then b.first_due_on + (k - 1) * 15
      else (b.first_due_on + make_interval(months => k - 1))::date
    end;
    insert into public.fin_income (issued_on, client_id, project_id, description, amount, status,
                                   installment_no, installment_of, created_by)
    values (due, cid, pid, format('Cuota %s de %s', k, billed_count + n_new),
            round(remaining * weights[i] / weight_sum, 0), 'scheduled', k, billed_count + n_new, auth.uid());
    created := created + 1;
  end loop;
  return created;
end;
$$;
