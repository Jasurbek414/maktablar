import { useSelector } from 'react-redux'

export function usePermissions() {
  const { user } = useSelector(state => state.auth)

  const roles = user?.roles?.map(r => r.role) || []

  const hasRole = (roleName) => {
    if (!user) return false
    if (user.is_superuser) return true
    return roles.includes(roleName)
  }

  const isSuperAdmin = user?.is_superuser || roles.includes('superadmin')
  const isAdmin = roles.includes('admin')
  const isRegionDirector = roles.includes('region_director')
  const isDistrictDirector = roles.includes('district_director')
  const isSchoolDirector = roles.includes('school_director')
  // MUHIM (2026-09-15 audit): MUDIR backend User.Role enum'ida HAQIQIY rol va JWT'da
  // "mudir" bo'lib keladi, lekin bu yerda tekshirilmasdi — natijada getPrimaryRole()
  // 'unknown' qaytarardi, Sidebar esa backend'da UMUMAN MAVJUD BO'LMAGAN "operator"
  // menyusiga tushib qolardi va MUDIR bosgan deyarli har bir havola RoleRoute tomonidan
  // /dashboard'ga qaytarib yuborilardi.
  const isMudir = roles.includes('mudir')
  const isOperator = roles.includes('operator')
  const isTeacher = roles.includes('teacher')
  const isParent = roles.includes('parent')

  const getPrimaryRole = () => {
    if (isSuperAdmin && roles.includes('superadmin')) return 'superadmin'
    if (roles.includes('admin')) return 'admin'
    if (roles.includes('region_director')) return 'region_director'
    if (roles.includes('district_director')) return 'district_director'
    if (roles.includes('school_director')) return 'school_director'
    if (roles.includes('mudir')) return 'mudir'
    if (roles.includes('operator')) return 'operator'
    if (roles.includes('teacher')) return 'teacher'
    if (roles.includes('parent')) return 'parent'
    if (user?.is_superuser) return 'superadmin'
    return 'unknown'
  }

  return {
    hasRole,
    isSuperAdmin,
    isAdmin,
    isRegionDirector,
    isDistrictDirector,
    isSchoolDirector,
    isMudir,
    isOperator,
    isTeacher,
    isParent,
    primaryRole: getPrimaryRole(),
    roles,
  }
}
