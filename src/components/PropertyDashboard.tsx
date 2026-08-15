// PropertyDashboard.tsx
import React, { useEffect, useState, useRef } from 'react';
import { getProperties, Property, PropertyFilters } from '../services/propertyService';
import { LandTitleUploadModal } from './LandTitleUploadModal';
import { AddPropertyModal } from './AddPropertyModal';

export const PropertyDashboard: React.FC = () => {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [isTitleModalOpen, setIsTitleModalOpen] = useState<boolean>(false);
  const [isAddPropertyModalOpen, setIsAddPropertyModalOpen] = useState<boolean>(false);

  const [filters, setFilters] = useState<PropertyFilters>({
    propertyType: 'all',
    location: '',
  });

  // Tracks the latest request so a slow, stale response can't
  // overwrite results from a newer one.
  const requestIdRef = useRef(0);

  const fetchListings = async (currentFilters: PropertyFilters) => {
    const requestId = ++requestIdRef.current;
    try {
      setLoading(true);
      setError('');
      const data = await getProperties(currentFilters);
      if (requestId === requestIdRef.current) {
        setProperties(data);
      }
    } catch (err) {
      console.error('Failed to load properties:', err);
      if (requestId === requestIdRef.current) {
        setError('Could not load properties. Please try again.');
      }
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  };

  // Debounce: wait 400ms after the user stops changing filters
  // (especially typing location) before actually querying.
  useEffect(() => {
    const timeout = setTimeout(() => {
      fetchListings(filters);
    }, 400);

    return () => clearTimeout(timeout);
  }, [filters]);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Ilé Real Estate</h1>
          <p className="text-xs text-gray-500">Verified Properties & Land Title Management</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsAddPropertyModalOpen(true)}
            className="border border-emerald-600 text-emerald-700 hover:bg-emerald-50 px-4 py-2 rounded-lg text-sm font-semibold transition cursor-pointer"
          >
            + Add Listing
          </button>
          <button
            onClick={() => setIsTitleModalOpen(true)}
            className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-emerald-700 transition shadow-sm cursor-pointer"
          >
            + Verify Land Title
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <section className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-8 flex flex-wrap gap-4 items-center">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs text-gray-500 mb-1 font-medium">Search Location</label>
            <input
              type="text"
              placeholder="e.g. Lekki, Ikeja, Abuja"
              value={filters.location}
              onChange={(e) => setFilters({ ...filters, location: e.target.value })}
              className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="w-48">
            <label className="block text-xs text-gray-500 mb-1 font-medium">Property Type</label>
            <select
              value={filters.propertyType}
              onChange={(e) => setFilters({ ...filters, propertyType: e.target.value })}
              className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:outline-none focus:border-emerald-500 bg-white"
            >
              <option value="all">All Types</option>
              <option value="land">Land</option>
              <option value="residential">Residential</option>
              <option value="commercial">Commercial</option>
            </select>
          </div>
        </section>

        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600"></div>
          </div>
        ) : error ? (
          <div className="text-center py-16 bg-white rounded-xl border border-dashed border-red-300">
            <p className="text-red-600 text-sm mb-3">{error}</p>
            <button
              onClick={() => fetchListings(filters)}
              className="text-sm text-emerald-700 font-medium hover:underline cursor-pointer"
            >
              Try again
            </button>
          </div>
        ) : properties.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl border border-dashed border-gray-300">
            <p className="text-gray-500 text-sm">No properties found matching your criteria.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {properties.map((property) => (
              <div
                key={property.id}
                className="bg-white rounded-xl overflow-hidden border border-gray-200 shadow-sm hover:shadow-md transition"
              >
                <div className="relative h-48 bg-gray-100">
                  <img
                    src={property.imageUrls?.[0] || property.images?.[0] || 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&auto=format&fit=crop&q=80'}
                    alt={property.title}
                    className="w-full h-full object-cover"
                  />
                  {(property.isVerified || property.verificationStatus === 'Verified') && (
                    <span className="absolute top-3 right-3 bg-emerald-600 text-white text-xs px-2.5 py-1 rounded-full font-medium shadow-sm">
                      ✓ Verified
                    </span>
                  )}
                </div>

                <div className="p-5">
                  <h3 className="font-bold text-gray-900 text-lg truncate mb-1">{property.title}</h3>
                  <p className="text-emerald-700 font-extrabold text-lg mb-3">
                    ₦{property.price.toLocaleString()}
                  </p>
                  <div className="flex justify-between items-center text-xs text-gray-500 pt-3 border-t border-gray-100">
                    <span>📍 {typeof property.location === 'object' ? (property.location as any).address || (property.location as any).area : property.location}</span>
                    <span className="capitalize font-medium text-gray-700">{property.propertyType || property.type}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <LandTitleUploadModal
        isOpen={isTitleModalOpen}
        onClose={() => setIsTitleModalOpen(false)}
        onSuccess={() => fetchListings(filters)}
      />

      <AddPropertyModal
        isOpen={isAddPropertyModalOpen}
        onClose={() => setIsAddPropertyModalOpen(false)}
        onSuccess={() => fetchListings(filters)}
      />
    </div>
  );
};

export default PropertyDashboard;
