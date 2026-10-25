// A hospital/company picker fed by the clinic's lists. Keeps a patient's saved value selectable
// even if the admin has since removed it from the list.
export function OptionSelect({ id, name, label, options, current }: { id: string; name: string; label: string; options: string[]; current?: string | null }) {
  const list = current && !options.includes(current) ? [...options, current] : options;
  return (
    <div>
      <label htmlFor={id} className="lbl">{label}</label>
      <select id={id} name={name} className="field" defaultValue={current ?? ""} disabled={list.length === 0}>
        <option value="">{list.length === 0 ? "לא הוגדרו אפשרויות" : "לא נבחר"}</option>
        {list.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}
