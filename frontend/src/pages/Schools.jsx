import React from 'react';
import CrudPage, { Input, Select } from '../components/CrudPage';
import { api } from '../services/api';

export default function Schools() {
  return (
    <CrudPage
      title="Maktablar"
      apiPath="/api/schools"
      columns={[
        { key: 'name', label: 'Nomi' },
        { key: 'districtName', label: 'Tuman' },
        { key: 'provinceName', label: 'Viloyat' },
        { key: 'studentCount', label: "O'quvchilar", render: (r) => <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 text-xs font-medium">{r.studentCount || 0}</span> },
      ]}
      loadDeps={async () => ({ districts: await api.get('/api/districts') })}
      formFields={(form, set, deps) => (<>
        <Input label="Maktab nomi" value={form.name || ''} onChange={e => set('name', e.target.value)} placeholder="Masalan: 56-maktab" />
        <Select label="Tuman" value={form.districtId || ''} onChange={e => set('districtId', e.target.value)}
          options={(deps.districts || []).map(d => ({ value: d.id, label: `${d.name} (${d.provinceName})` }))} />
      </>)}
    />
  );
}
