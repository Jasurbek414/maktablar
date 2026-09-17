import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../l10n/l10n.dart';
import '../../theme/app_theme.dart';
import '../auth/auth_controller.dart';
import 'classes_tab.dart';
import 'dashboard_tab.dart';
import 'profile_tab.dart';
import 'students_tab.dart';
import 'teachers_tab.dart';

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
    final schoolId = (profile?['schoolId'] is int) ? (profile!['schoolId'] as int) : null;

    final tabs = [
      DashboardTab(profile: profile),
      StudentsTab(schoolId: schoolId),
      ClassesTab(schoolId: schoolId),
      TeachersTab(schoolId: schoolId),
      ProfileTab(profile: profile),
    ];

    return Scaffold(
      body: IndexedStack(index: _index, children: tabs),
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _index,
        onTap: (i) => setState(() => _index = i),
        type: BottomNavigationBarType.fixed,
        items: [
          BottomNavigationBarItem(icon: const Icon(Icons.dashboard_rounded), label: t('nav.home')),
          BottomNavigationBarItem(icon: const Icon(Icons.groups_rounded), label: t('nav.students')),
          BottomNavigationBarItem(icon: const Icon(Icons.grid_view_rounded), label: t('nav.classes')),
          BottomNavigationBarItem(icon: const Icon(Icons.badge_rounded), label: t('nav.teachers')),
          BottomNavigationBarItem(icon: const Icon(Icons.person_rounded), label: t('nav.profile')),
        ],
      ),
    );
  }
}
