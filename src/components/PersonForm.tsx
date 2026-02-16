import { useState, useEffect } from 'react';
import type { Person, Role, EmployeeType, Location } from '../types/org';
import { ROLE_LABELS, LOCATION_LABELS, TYPE_LABELS } from '../types/org';

interface PersonFormProps {
  person?: Person;
  allowedRoles?: Role[];
  onSave: (person: Omit<Person, 'id'>, quantity?: number) => void;
  onCancel: () => void;
  title: string;
  allowBulkAdd?: boolean;
}

const ALL_ROLES: Role[] = [
  'engineer',
  'senior_engineer',
  'staff_engineer',
  'engineering_manager',
  'head_of_engineering',
  'principal_engineer',
];

const ALL_LOCATIONS: Location[] = ['onshore', 'nearshore', 'offshore'];
const ALL_TYPES: EmployeeType[] = ['employee', 'contractor'];

export function PersonForm({ person, allowedRoles = ALL_ROLES, onSave, onCancel, title, allowBulkAdd = false }: PersonFormProps) {
  const [name, setName] = useState(person?.name || '');
  const [role, setRole] = useState<Role>(person?.role || allowedRoles[0]);
  const [type, setType] = useState<EmployeeType>(person?.type || 'employee');
  const [vendor, setVendor] = useState(person?.vendor || '');
  const [location, setLocation] = useState<Location | ''>(person ? (person.type === 'employee' ? 'onshore' : (person.location || '')) : 'onshore');
  const [quantity, setQuantity] = useState(1);

  const isContractor = type === 'contractor';

  // Employees are always onshore; reset contractor-specific fields when switching to employee
  useEffect(() => {
    if (!isContractor) {
      setVendor('');
      setLocation('onshore');
    }
  }, [isContractor]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!location) {
      alert('Location is required');
      return;
    }

    if (isContractor && !vendor) {
      alert('Vendor is required for contractors');
      return;
    }

    const personData: Omit<Person, 'id'> = {
      role,
      type,
      ...(location && { location: location as Location }),
      ...(name && { name }),
      ...(isContractor && vendor && { vendor }),
    };

    onSave(personData, allowBulkAdd ? quantity : undefined);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
        <h2 className="text-lg font-semibold mb-4">{title}</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Quantity (for bulk add) */}
          {allowBulkAdd && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Quantity <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="1"
                max="50"
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {quantity > 1 && (
                <p className="text-xs text-gray-500 mt-1">
                  Adding {quantity} people with the same role, type, and location
                </p>
              )}
            </div>
          )}

          {/* Name (optional, especially for bulk add) */}
          {(!allowBulkAdd || quantity === 1) && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Name <span className="text-gray-400">(optional)</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter name"
              />
            </div>
          )}

          {/* Role */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Role <span className="text-red-500">*</span>
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {allowedRoles.map(r => (
                <option key={r} value={r}>{ROLE_LABELS[r]}</option>
              ))}
            </select>
          </div>

          {/* Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Type <span className="text-red-500">*</span>
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as EmployeeType)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {ALL_TYPES.map(t => (
                <option key={t} value={t}>{TYPE_LABELS[t]}</option>
              ))}
            </select>
          </div>

          {/* Location (required for everyone) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Location <span className="text-red-500">*</span>
            </label>
            <select
              value={location}
              onChange={(e) => setLocation(e.target.value as Location)}
              className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${!isContractor ? 'bg-gray-100 text-gray-500' : ''}`}
              required
              disabled={!isContractor}
            >
              <option value="">Select location</option>
              {ALL_LOCATIONS.map(l => (
                <option key={l} value={l}>{LOCATION_LABELS[l]}</option>
              ))}
            </select>
          </div>

          {/* Vendor (contractor-specific) */}
          {isContractor && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Vendor <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={vendor}
                onChange={(e) => setVendor(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Acme Corp"
                required
              />
            </div>
          )}

          {/* Buttons */}
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
