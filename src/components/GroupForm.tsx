import { useState } from 'react';

interface GroupFormProps {
  title: string;
  initialName?: string;
  initialManagedBy?: string;
  onSave: (name: string, managedBy: string | undefined) => void;
  onCancel: () => void;
}

export function GroupForm({ title, initialName = '', initialManagedBy = '', onSave, onCancel }: GroupFormProps) {
  const [name, setName] = useState(initialName);
  const [managedBy, setManagedBy] = useState(initialManagedBy);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Group name is required');
      return;
    }
    onSave(name.trim(), managedBy.trim() || undefined);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
        <h2 className="text-lg font-semibold mb-4">{title}</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Group Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter group name"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Managed by (external discipline)
            </label>
            <input
              type="text"
              value={managedBy}
              onChange={(e) => setManagedBy(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g. TPM, Product Manager"
            />
            <p className="text-xs text-gray-400 mt-1">
              Use this when no Engineering Manager is available and another discipline is covering the group.
              The external manager will count as a single direct report in span-of-control calculations.
            </p>
          </div>

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
