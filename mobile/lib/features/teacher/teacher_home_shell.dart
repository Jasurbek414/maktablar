import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../l10n/l10n.dart';
import '../../theme/app_theme.dart';
import '../auth/auth_controller.dart';
import '../director/absence_requests_screen.dart';
import '../director/director_repository.dart';
import '../director/profile_tab.dart';
import 'my_class_tab.dart';
import 'teacher_attendance_tab.dart';

/// O'qituvchi ilovasining ildiz ekrani.
///
/// MUHIM (2026-09-25): avval TEACHER roli bilan kirgan xodim `DirectorHomeShell`ni —
/// ya'ni direktor bilan AYNAN bir xil interfeysni — olardi va butun maktabni ko'rardi.
/// Endi u alohida, torroq ilova oladi: faqat o'zi sinf rahbari bo'lgan sinf.
///
/// Ekranlar ataylab QAYTA ISHLATILGAN, nusxalanmagan:
///  - `AbsenceRequestsScreen` — server TEACHER uchun ro'yxatni o'zi o'z sinfi bilan
///    cheklaydi (`AbsenceRequestController` + `CurrentUserService#allowedClassIds`),
///    shuning uchun alohida ekran yozish shart emas.
///  - `ProfileTab` — profil/parol/mavzu/til direktornikidan farq qilmaydi.
class TeacherHomeShell extends ConsumerStatefulWidget {
  const TeacherHomeShell({super.key});

  @override
  ConsumerState<TeacherHomeShell> createState() => _TeacherHomeShellState();
}

class _TeacherHomeShellState extends ConsumerState<TeacherHomeShell> {
  int _index = 0;

  @override
  Widget build(BuildContext context) {
    final auth = ref.watch(authControllerProvider);
    ref.watch(themeModeProvider);
    ref.watch(localeProvider);

    final profile = auth.profile;
    final schoolId = auth.schoolId ?? 1;

    // Ko'rib chiqilmagan ruxsat so'rovlari nishoni. Server TEACHER uchun faqat o'z
    // sinfining so'rovlarini qaytaradi, shuning uchun bu son ham o'z sinfi bo'yicha.
    final pendingCount =
        ref.watch(directorPendingRequestCountProvider(schoolId)).valueOrNull ?? 0;

    final tabs = [
      const MyClassTab(),
      const TeacherAttendanceTab(),
      AbsenceRequestsScreen(schoolId: schoolId),
      ProfileTab(profile: profile),
    ];

    return Scaffold(
      body: IndexedStack(index: _index, children: tabs),
      bottomNavigationBar: Container(
        decoration: BoxDecoration(
          color: AppColors.bgSidebar,
          border: Border(top: BorderSide(color: AppColors.borderSubtle, width: 1)),
        ),
        child: SafeArea(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
            child: BottomNavigationBar(
              currentIndex: _index,
              onTap: (i) => setState(() => _index = i),
              backgroundColor: Colors.transparent,
              elevation: 0,
              items: [
                BottomNavigationBarItem(
                  icon: const Icon(Icons.groups_outlined),
                  activeIcon: const Icon(Icons.groups_rounded),
                  label: t('teacher.navMyClass'),
                ),
                BottomNavigationBarItem(
                  icon: const Icon(Icons.fact_check_outlined),
                  activeIcon: const Icon(Icons.fact_check_rounded),
                  label: t('teacher.navAttendance'),
                ),
                BottomNavigationBarItem(
                  icon: _badged(const Icon(Icons.description_outlined), pendingCount),
                  activeIcon: _badged(const Icon(Icons.description_rounded), pendingCount),
                  label: t('nav.requests'),
                ),
                BottomNavigationBarItem(
                  icon: const Icon(Icons.person_outline_rounded),
                  activeIcon: const Icon(Icons.person_rounded),
                  label: t('nav.profile'),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _badged(Widget icon, int count) {
    if (count <= 0) return icon;
    return Stack(clipBehavior: Clip.none, children: [
      icon,
      Positioned(
        top: -2,
        right: -4,
        child: Container(
          width: 8,
          height: 8,
          decoration: BoxDecoration(color: AppColors.amber, shape: BoxShape.circle),
        ),
      ),
    ]);
  }
}
