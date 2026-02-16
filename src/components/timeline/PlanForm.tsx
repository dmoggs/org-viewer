import { useState } from 'react';

interface PlanFormProps {
  onSave: (name: string, granularity: 'monthly' | 'quarterly', startYear: number, startMonth: number, endYear: number, endMonth: number) => void;
  onCancel: () => void;
}

export function PlanForm({ onSave, onCancel }: PlanFormProps) {
  const now = new Date();
  const [name, setName] = useState('');
  const [granularity, setGranularity] = useState<'monthly' | 'quarterly'>('quarterly');
  const [startYear, setStartYear] = useState(now.getFullYear());
  const [startMonth, setStartMonth] = useState(now.getMonth() + 1);
  const [endYear, setEndYear] = useState(now.getFullYear() + 1);
  const [endMonth, setEndMonth] = useState(now.getMonth() + 1);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSave(name.trim(), granularity, startYear, startMonth, endYear, endMonth);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <form onSubmit={handleSubmit} className="bg-white rounded-lg p-6 w-96 space-y-4">
        <h2 className="text-lg font-semibold">New Timeline Plan</h2>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Plan Name</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            className="w-full border rounded px-3 py-2 text-sm"
            placeholder="e.g. 2025 Ramp Plan"
            autoFocus
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Granularity</label>
          <select
            value={granularity}
            onChange={e => setGranularity(e.target.value as 'monthly' | 'quarterly')}
            className="w-full border rounded px-3 py-2 text-sm"
          >
            <option value="quarterly">Quarterly</option>
            <option value="monthly">Monthly</option>
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start</label>
            <div className="flex gap-2">
              <select value={startMonth} onChange={e => setStartMonth(Number(e.target.value))} className="flex-1 border rounded px-2 py-2 text-sm">
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i} value={i + 1}>{['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][i]}</option>
                ))}
              </select>
              <input type="number" value={startYear} onChange={e => setStartYear(Number(e.target.value))} className="w-20 border rounded px-2 py-2 text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End</label>
            <div className="flex gap-2">
              <select value={endMonth} onChange={e => setEndMonth(Number(e.target.value))} className="flex-1 border rounded px-2 py-2 text-sm">
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i} value={i + 1}>{['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][i]}</option>
                ))}
              </select>
              <input type="number" value={endYear} onChange={e => setEndYear(Number(e.target.value))} className="w-20 border rounded px-2 py-2 text-sm" />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onCancel} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded">Cancel</button>
          <button type="submit" className="px-4 py-2 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700">Create Plan</button>
        </div>
      </form>
    </div>
  );
}
