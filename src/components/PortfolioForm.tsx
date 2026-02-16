import { useState } from 'react';

interface PortfolioFormProps {
  title: string;
  initialName?: string;
  initialTarget?: number;
  onSave: (name: string, onshoreTargetPercentage: number) => void;
  onCancel: () => void;
}

export function PortfolioForm({
  title,
  initialName = '',
  initialTarget = 50,
  onSave,
  onCancel
}: PortfolioFormProps) {
  const [name, setName] = useState(initialName);
  const [target, setTarget] = useState(initialTarget.toString());

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Name is required');
      return;
    }
    const targetNum = parseInt(target);
    if (isNaN(targetNum) || targetNum < 0 || targetNum > 100) {
      alert('Target must be a number between 0 and 100');
      return;
    }
    onSave(name.trim(), targetNum);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
        <h2 className="text-lg font-semibold mb-4">{title}</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Portfolio Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter portfolio name"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Onshore Target (%)
            </label>
            <input
              type="number"
              min="0"
              max="100"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="50"
            />
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
