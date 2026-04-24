import React from 'react';
import CrudPage, { Input, Select } from '../components/CrudPage';
import { api } from '../services/api';

export default function Students({ user }) {
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
      // DIRECTOR faqat o'z maktab o'quvchilarini ko'radi
      filterFn={(items) => {
        if (user?.role === 'DIRECTOR' && user?.schoolId) {
          return items.filter(s => s.schoolId == user.schoolId);
        }
        return items;
      }}
      formFields={(form, set, deps) => {
        // DIRECTOR uchun maktab tanlash shart emas - o'zi bog'lanadi
        const schools = deps.schools || [];
        const filteredSchools = user?.role === 'DIRECTOR' && user?.schoolId
          ? schools.filter(s => s.id == user.schoolId)
          : schools;
        return (<>
          <Input label="To'liq ism" value={form.fullName || ''} onChange={e => set('fullName', e.target.value)} placeholder="Masalan: Aliyev Ali" />
          <Input label="Face ID" value={form.faceId || ''} onChange={e => set('faceId', e.target.value)} placeholder="Qurilmadagi identifikator" />
          <Select label="Maktab" value={form.schoolId || user?.schoolId || ''} onChange={e => set('schoolId', e.target.value)}
            options={filteredSchools.map(s => ({ value: s.id, label: `${s.name} (${s.districtName})` }))} />
        </>);
      }}
    />
  );
}
