import { useState } from 'react';
import { Person, ROLE_LABELS, LOCATION_LABELS } from '../types/org';

interface NameFormProps {
  title: string;
  label: string;
  initialValue?: string;
  members?: Person[];
  onSave: (name: string) => void;
  onCancel: () => void;
}

export function NameForm({ title, label, initialValue = '', members, onSave, onCancel }: NameFormProps) {
  const [name, setName] = useState(initialValue);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Name is required');
      return;
    }
    onSave(name.trim());
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
        <h2 className="text-lg font-semibold mb-4">{title}</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {label} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder={`Enter ${label.toLowerCase()}`}
              autoFocus
            />
          </div>

          {members && members.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Team Members</label>
              <div className="border border-gray-200 rounded-md divide-y divide-gray-100 max-h-60 overflow-y-auto">
                {members.map((m) => (
                  <div key={m.id} className="px-3 py-2 text-sm flex justify-between items-center">
                    <span className="font-medium text-gray-900">{m.name || 'Unnamed'}</span>
                    <span className="text-gray-500 text-xs">
                      {ROLE_LABELS[m.role]}
                      {m.vendor ? ` · ${m.vendor}` : ''}
                      {m.location ? ` · ${LOCATION_LABELS[m.location]}` : ''}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700"
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
