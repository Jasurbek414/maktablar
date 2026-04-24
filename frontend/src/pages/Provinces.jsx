import React from 'react';
import CrudPage, { Input } from '../components/CrudPage';

export default function Provinces() {
  return (
    <CrudPage
      title="Viloyatlar"
      apiPath="/api/provinces"
      columns={[
        { key: 'name', label: 'Nomi' },
        { key: 'districtCount', label: 'Tumanlar soni', render: (r) => <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 text-xs font-medium">{r.districtCount || 0}</span> },
      ]}
      formFields={(form, set) => (
        <Input label="Viloyat nomi" value={form.name || ''} onChange={e => set('name', e.target.value)} placeholder="Masalan: Toshkent" />
      )}
    />
  );
}
