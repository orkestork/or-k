import { ROLE_GROUPS, ROLE_LABEL } from "./roles";

/** `<option>`s for a role `<select>`, grouped by area. */
export function RoleOptions() {
  return ROLE_GROUPS.map((g) => (
    <optgroup key={g.label} label={g.label}>
      {g.roles.map((r) => (
        <option key={r} value={r}>
          {ROLE_LABEL[r]}
        </option>
      ))}
    </optgroup>
  ));
}
