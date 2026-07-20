import React, { useState } from 'react';
import { Member, AppetiteLevel, ActivityLevel } from '../../types';
import { Button, Input, Select, Badge } from '../common/UI';

const APPETITE_LABELS: Record<AppetiteLevel, string> = {
  very_small: 'Very small eater',
  small: 'Small eater',
  normal: 'Normal appetite',
  big: 'Big eater',
  very_big: 'Very big eater',
};

const ACTIVITY_LABELS: Record<ActivityLevel, string> = {
  sedentary: 'Sedentary (little exercise)',
  light: 'Light (1-3 days/week)',
  moderate: 'Moderate (3-5 days/week)',
  active: 'Active (6-7 days/week)',
  very_active: 'Very active (physical job)',
};

interface Props {
  member: Partial<Member>;
  onSave: (data: Partial<Member>) => void;
  onCancel: () => void;
  loading?: boolean;
}

export const MemberForm: React.FC<Props> = ({ member, onSave, onCancel, loading }) => {
  const [form, setForm] = useState<Partial<Member>>({
    name: '',
    age: undefined,
    gender: undefined,
    height_cm: undefined,
    weight_kg: undefined,
    activity_level: 'moderate',
    appetite_level: 'normal',
    is_vegetarian: false,
    is_vegan: false,
    is_pregnant: false,
    is_athlete: false,
    is_elderly: false,
    ...member,
  });

  const set = (field: keyof Member, value: unknown) =>
    setForm(prev => ({ ...prev, [field]: value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(form);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="Name *"
        value={form.name ?? ''}
        onChange={e => set('name', e.target.value)}
        required
        placeholder="e.g. Dad, Maria, Grandma"
      />

      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Age"
          type="number"
          min={0}
          max={120}
          value={form.age ?? ''}
          onChange={e => set('age', e.target.value ? parseInt(e.target.value) : undefined)}
          placeholder="Years"
        />
        <Select
          label="Gender"
          value={form.gender ?? ''}
          onChange={e => set('gender', e.target.value || undefined)}
        >
          <option value="">Prefer not to say</option>
          <option value="male">Male</option>
          <option value="female">Female</option>
          <option value="other">Other</option>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Weight (kg)"
          type="number"
          min={1}
          max={500}
          step={0.1}
          value={form.weight_kg ?? ''}
          onChange={e => set('weight_kg', e.target.value ? parseFloat(e.target.value) : undefined)}
          placeholder="kg"
        />
        <Input
          label="Height (cm)"
          type="number"
          min={30}
          max={300}
          value={form.height_cm ?? ''}
          onChange={e => set('height_cm', e.target.value ? parseFloat(e.target.value) : undefined)}
          placeholder="cm"
        />
      </div>

      <Select
        label="Appetite level"
        value={form.appetite_level ?? 'normal'}
        onChange={e => set('appetite_level', e.target.value as AppetiteLevel)}
      >
        {Object.entries(APPETITE_LABELS).map(([val, label]) => (
          <option key={val} value={val}>{label}</option>
        ))}
      </Select>

      <Select
        label="Activity level"
        value={form.activity_level ?? 'moderate'}
        onChange={e => set('activity_level', e.target.value as ActivityLevel)}
      >
        {Object.entries(ACTIVITY_LABELS).map(([val, label]) => (
          <option key={val} value={val}>{label}</option>
        ))}
      </Select>

      <div>
        <p className="text-sm font-medium text-slate-700 mb-2">Dietary & Health</p>
        <div className="grid grid-cols-2 gap-2">
          {([
            ['is_vegetarian', '🥦 Vegetarian'],
            ['is_vegan', '🌱 Vegan'],
            ['is_pregnant', '🤰 Pregnant'],
            ['is_athlete', '🏃 Athlete'],
            ['is_elderly', '👴 Elderly'],
          ] as [keyof Member, string][]).map(([field, label]) => (
            <label key={field} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={!!(form[field])}
                onChange={e => set(field, e.target.checked)}
                className="rounded border-slate-300 text-emerald-500 focus:ring-emerald-400"
              />
              <span className="text-sm text-slate-700">{label}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="flex gap-2 pt-2">
        <Button type="submit" loading={loading} fullWidth>Save</Button>
        <Button type="button" variant="secondary" onClick={onCancel} fullWidth>Cancel</Button>
      </div>
    </form>
  );
};

interface MemberCardProps {
  member: Member;
  onEdit: () => void;
  onDelete: () => void;
  selected?: boolean;
  onSelect?: () => void;
}

export const MemberCard: React.FC<MemberCardProps> = ({
  member, onEdit, onDelete, selected, onSelect,
}) => {
  const appetiteEmoji: Record<AppetiteLevel, string> = {
    very_small: '🔵', small: '🟢', normal: '⚪', big: '🟡', very_big: '🔴',
  };

  return (
    <div
      onClick={onSelect}
      className={[
        'relative p-4 rounded-2xl border transition-all',
        onSelect ? 'cursor-pointer' : '',
        selected
          ? 'border-emerald-400 bg-emerald-50 ring-2 ring-emerald-200'
          : 'border-slate-200 bg-white hover:border-slate-300',
      ].join(' ')}
    >
      {selected && (
        <div className="absolute top-3 right-3 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center">
          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        </div>
      )}

      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
          {member.name.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-slate-800">{member.name}</p>
          <p className="text-sm text-slate-500">
            {[
              member.age ? `${member.age}y` : null,
              member.weight_kg ? `${member.weight_kg}kg` : null,
              member.gender,
            ].filter(Boolean).join(' · ')}
          </p>
          <div className="flex flex-wrap gap-1 mt-1">
            <Badge color="green">
              {appetiteEmoji[member.appetite_level]} {APPETITE_LABELS[member.appetite_level]}
            </Badge>
            {member.is_vegetarian && <Badge color="green">🥦 Veg</Badge>}
            {member.is_vegan && <Badge color="green">🌱 Vegan</Badge>}
            {member.is_athlete && <Badge color="blue">🏃 Athlete</Badge>}
            {member.is_pregnant && <Badge color="orange">🤰 Pregnant</Badge>}
          </div>
        </div>
      </div>

      {!onSelect && (
        <div className="flex gap-2 mt-3">
          <Button size="sm" variant="ghost" onClick={onEdit}>Edit</Button>
          <Button size="sm" variant="danger" onClick={e => { e.stopPropagation(); onDelete(); }}>Remove</Button>
        </div>
      )}
    </div>
  );
};
