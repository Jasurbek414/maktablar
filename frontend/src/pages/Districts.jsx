import React from 'react';
import CrudPage, { Input, Select } from '../components/CrudPage';
import { api } from '../services/api';

export default function Districts() {
  return (
    <CrudPage
      title="Tumanlar"
      apiPath="/api/districts"
      columns={[
        { key: 'name', label: 'Nomi' },
        { key: 'provinceName', label: 'Viloyat' },
        { key: 'schoolCount', label: 'Maktablar', render: (r) => <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 text-xs font-medium">{r.schoolCount || 0}</span> },
      ]}
      loadDeps={async () => ({ provinces: await api.get('/api/provinces') })}
      formFields={(form, set, deps) => (<>
        <Input label="Tuman nomi" value={form.name || ''} onChange={e => set('name', e.target.value)} placeholder="Masalan: Chilonzor" />
        <Select label="Viloyat" value={form.provinceId || ''} onChange={e => set('provinceId', e.target.value)}
          options={(deps.provinces || []).map(p => ({ value: p.id, label: p.name }))} />
      </>)}
    />
  );
}
