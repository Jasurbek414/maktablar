import React from 'react';
import CrudPage, { Input, Select } from '../components/CrudPage';
import { api } from '../services/api';

const ROLES = [
  { value: 'ADMIN', label: 'Admin (Viloyat)' },
  { value: 'DIRECTOR', label: 'Direktor' },
  { value: 'MUDIR', label: "O'quv mudir" },
  { value: 'TEACHER', label: "O'qituvchi" },
];

export default function Users() {
  return (
    <CrudPage
      title="Foydalanuvchilar"
      apiPath="/api/users"
      columns={[
        { key: 'fullName', label: 'F.I.O' },
        { key: 'username', label: 'Login' },
        { key: 'role', label: 'Rol', render: (r) => {
          const colors = { SUPERADMIN: 'bg-red-500/10 text-red-400', ADMIN: 'bg-amber-500/10 text-amber-400', DIRECTOR: 'bg-emerald-500/10 text-emerald-400', MUDIR: 'bg-cyan-500/10 text-cyan-400', TEACHER: 'bg-slate-500/10 text-slate-400' };
          return <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${colors[r.role] || ''}`}>{r.role}</span>;
        }},
      ]}
      loadDeps={async () => ({
        provinces: await api.get('/api/provinces'),
        schools: await api.get('/api/schools'),
      })}
      formFields={(form, set, deps) => (<>
        <Input label="To'liq ism" value={form.fullName || ''} onChange={e => set('fullName', e.target.value)} placeholder="Ismi" />
        <Input label="Login" value={form.username || ''} onChange={e => set('username', e.target.value)} placeholder="Login" />
        <Input label="Parol" type="password" value={form.password || ''} onChange={e => set('password', e.target.value)} placeholder="Yangi parol" />
        <Select label="Rol" value={form.role || ''} onChange={e => set('role', e.target.value)} options={ROLES} />
        {form.role === 'ADMIN' && (
          <Select label="Viloyat" value={form.provinceId || ''} onChange={e => set('provinceId', e.target.value)}
            options={(deps.provinces || []).map(p => ({ value: p.id, label: p.name }))} />
        )}
        {['DIRECTOR','MUDIR','TEACHER'].includes(form.role) && (
          <Select label="Maktab" value={form.schoolId || ''} onChange={e => set('schoolId', e.target.value)}
            options={(deps.schools || []).map(s => ({ value: s.id, label: s.name }))} />
        )}
      </>)}
    />
  );
}
