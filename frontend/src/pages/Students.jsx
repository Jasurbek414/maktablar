import React from 'react';
import CrudPage, { Input, Select } from '../components/CrudPage';
import { api } from '../services/api';

export default function Students() {
  return (
    <CrudPage
      title="O'quvchilar"
      apiPath="/api/students"
      columns={[
        { key: 'fullName', label: 'F.I.O' },
        { key: 'faceId', label: 'Face ID' },
        { key: 'schoolName', label: 'Maktab' },
      ]}
      loadDeps={async () => ({ schools: await api.get('/api/schools') })}
      formFields={(form, set, deps) => (<>
        <Input label="To'liq ism" value={form.fullName || ''} onChange={e => set('fullName', e.target.value)} placeholder="Masalan: Aliyev Ali" />
        <Input label="Face ID" value={form.faceId || ''} onChange={e => set('faceId', e.target.value)} placeholder="Qurilmadagi identifikator" />
        <Select label="Maktab" value={form.schoolId || ''} onChange={e => set('schoolId', e.target.value)}
          options={(deps.schools || []).map(s => ({ value: s.id, label: `${s.name} (${s.districtName})` }))} />
      </>)}
    />
  );
}
