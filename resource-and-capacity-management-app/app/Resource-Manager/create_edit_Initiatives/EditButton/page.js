'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';

export default function EditInitiativePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get('id');

  const [initiative, setInitiative] = useState(null);
  const [form, setForm] = useState(null);

  // Load the initiative from localStorage (same pattern as your other pages)
  useEffect(() => {
    const stored = localStorage.getItem('initiatives');
    if (!stored) return;

    const list = JSON.parse(stored);
    const found = list.find((i) => String(i.id) === String(id));

    setInitiative(found);
    setForm(found ? { ...found } : null);
  }, [id]);

  const handleSave = () => {
    const stored = localStorage.getItem('initiatives');
    if (!stored) return;

    const list = JSON.parse(stored);
    const updated = list.map((i) =>
      String(i.id) === String(id) ? form : i
    );

    localStorage.setItem('initiatives', JSON.stringify(updated));
    router.push('/Resource-Manager/Initiatives');
  };

  const handleCancel = () => {
    router.push('/Resource-Manager/Initiatives');
  };

  if (!form) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600 text-lg">Loading...</p>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center animate-fadeIn">
      <div className="bg-white w-full h-full p-8 overflow-y-auto shadow-xl">
        <h1 className="text-3xl font-bold mb-6">Edit Initiative #{id}</h1>

        <div className="grid grid-cols-2 gap-6">
          {Object.keys(form).map((key) => (
            key !== 'id' && (
              <div key={key} className="flex flex-col">
                <label className="font-semibold mb-1 capitalize">{key.replace(/_/g, ' ')}</label>
                <textarea
                  className="border p-2 rounded"
                  value={form[key]}
                  onChange={(e) =>
                    setForm({ ...form, [key]: e.target.value })
                  }
                  rows={key === 'description' || key === 'resource_consideration' ? 4 : 1}
                />
              </div>
            )
          ))}
        </div>

        <div className="flex gap-4 mt-8">
          <button
            onClick={handleSave}
            className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Save
          </button>

          <button
            onClick={handleCancel}
            className="px-6 py-2 bg-gray-400 text-white rounded hover:bg-gray-500"
          >
            Cancel
          </button>
        </div>
      </div>

      <style jsx>{`
        .animate-fadeIn {
          animation: fadeIn 0.25s ease-out;
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  );
}