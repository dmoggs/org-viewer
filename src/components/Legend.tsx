import { LOCATION_COLORS } from '../styles/chartColors';

export function Legend() {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 text-sm">
      <h3 className="font-semibold mb-3 text-gray-900">Legend</h3>

      <div className="space-y-4">
        {/* Shape = Level */}
        <div>
          <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
            Shape = Level
          </h4>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <div className="flex items-center gap-1.5">
              <svg width="16" height="16" viewBox="0 0 16 16">
                <circle cx="8" cy="8" r="6" fill="rgb(107, 114, 128)" />
              </svg>
              <span className="text-gray-700">Engineer</span>
            </div>
            <div className="flex items-center gap-1.5">
              <svg width="16" height="16" viewBox="0 0 16 16">
                <rect x="2" y="2" width="12" height="12" fill="rgb(107, 114, 128)" />
              </svg>
              <span className="text-gray-700">Senior</span>
            </div>
            <div className="flex items-center gap-1.5">
              <svg width="16" height="16" viewBox="0 0 16 16">
                <polygon points="8,1 15,8 8,15 1,8" fill="rgb(107, 114, 128)" />
              </svg>
              <span className="text-gray-700">Staff+ / EM</span>
            </div>
          </div>
        </div>

        {/* Fill = Type */}
        <div>
          <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
            Fill = Type
          </h4>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <div className="flex items-center gap-1.5">
              <svg width="16" height="16" viewBox="0 0 16 16">
                <circle cx="8" cy="8" r="6" fill="rgb(107, 114, 128)" />
              </svg>
              <span className="text-gray-700">Employee</span>
            </div>
            <div className="flex items-center gap-1.5">
              <svg width="16" height="16" viewBox="0 0 16 16">
                <circle cx="8" cy="8" r="5" fill="transparent" stroke="rgb(107, 114, 128)" strokeWidth="2" />
              </svg>
              <span className="text-gray-700">Contractor</span>
            </div>
          </div>
        </div>

        {/* Color = Location */}
        <div>
          <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
            Color = Location
          </h4>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <div className="flex items-center gap-1.5">
              <svg width="16" height="16" viewBox="0 0 16 16">
                <circle cx="8" cy="8" r="6" fill={LOCATION_COLORS.onshore} />
              </svg>
              <span className="text-gray-700">Onshore</span>
            </div>
            <div className="flex items-center gap-1.5">
              <svg width="16" height="16" viewBox="0 0 16 16">
                <circle cx="8" cy="8" r="6" fill={LOCATION_COLORS.nearshore} />
              </svg>
              <span className="text-gray-700">Nearshore</span>
            </div>
            <div className="flex items-center gap-1.5">
              <svg width="16" height="16" viewBox="0 0 16 16">
                <circle cx="8" cy="8" r="6" fill={LOCATION_COLORS.offshore} />
              </svg>
              <span className="text-gray-700">Offshore</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
