import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../l10n/l10n.dart';
import '../../theme/app_theme.dart';
import '../auth/auth_controller.dart';
import 'classes_tab.dart';
import 'dashboard_tab.dart';
import 'director_attendance_tab.dart';
import 'profile_tab.dart';

class DirectorHomeShell extends ConsumerStatefulWidget {
  const DirectorHomeShell({super.key});

  @override
  ConsumerState<DirectorHomeShell> createState() => _DirectorHomeShellState();
}

class _DirectorHomeShellState extends ConsumerState<DirectorHomeShell> {
  int _index = 0;

  @override
  Widget build(BuildContext context) {
    final profile = ref.watch(authControllerProvider).profile;
    ref.watch(themeModeProvider);
    ref.watch(localeProvider);
    final schoolId = (profile?['schoolId'] is int) ? (profile!['schoolId'] as int) : 1;

    final tabs = [
      DashboardTab(profile: profile),
      ClassesTab(schoolId: schoolId),
      DirectorAttendanceTab(schoolId: schoolId),
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
                  icon: const Icon(Icons.home_outlined),
                  activeIcon: const Icon(Icons.home_rounded),
                  label: t('nav.home'),
                ),
                BottomNavigationBarItem(
                  icon: const Icon(Icons.grid_view_outlined),
                  activeIcon: const Icon(Icons.grid_view_rounded),
                  label: t('nav.classes'),
                ),
                BottomNavigationBarItem(
                  icon: const Icon(Icons.fact_check_outlined),
                  activeIcon: const Icon(Icons.fact_check_rounded),
                  label: t('attendance.title'),
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
}
