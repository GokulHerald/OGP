import { Button } from '../ui/Button.jsx';
import { Input } from '../ui/Input.jsx';

export function TournamentFilters({ values, onChange, onReset }) {
  return (
    <div className="card-surface mb-8 flex flex-col gap-4 p-5 sm:flex-row sm:flex-wrap sm:items-end">
      <div className="min-w-[140px] flex-1">
        <label className="mb-1.5 block text-sm font-medium text-brand-light">Game</label>
        <select
          className="input"
          value={values.game || ''}
          onChange={(e) => onChange({ ...values, game: e.target.value || undefined, page: 1 })}
        >
          <option value="">All</option>
          <option value="PUBG">PUBG</option>
          <option value="FreeFire">Free Fire</option>
        </select>
      </div>
      <div className="min-w-[140px] flex-1">
        <label className="mb-1.5 block text-sm font-medium text-brand-light">Status</label>
        <select
          className="input"
          value={values.status || ''}
          onChange={(e) => onChange({ ...values, status: e.target.value || undefined, page: 1 })}
        >
          <option value="">All</option>
          <option value="registration">Registration</option>
          <option value="ongoing">Ongoing</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>
      <div className="w-full min-w-[100px] sm:w-28">
        <Input
          label="Page"
          type="number"
          min={1}
          value={values.page || 1}
          onChange={(e) => onChange({ ...values, page: Number(e.target.value) || 1 })}
        />
      </div>
      <Button type="button" variant="secondary" onClick={onReset}>
        Reset
      </Button>
    </div>
  );
}
