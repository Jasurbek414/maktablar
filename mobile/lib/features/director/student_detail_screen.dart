import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../core/api_client.dart';
import '../../core/attendance_stats.dart';
import '../../l10n/l10n.dart';
import '../../models/models.dart';
import '../../theme/app_theme.dart';
import '../../widgets/notes_panel.dart';
import 'director_repository.dart';

class StudentDetailScreen extends ConsumerStatefulWidget {
  const StudentDetailScreen({super.key, required this.student});
  final Student student;

  @override
  ConsumerState<StudentDetailScreen> createState() => _StudentDetailScreenState();
}

class _StudentDetailScreenState extends ConsumerState<StudentDetailScreen> with SingleTickerProviderStateMixin {
  late final TabController _tabs = TabController(length: 3, vsync: this);

  @override
  void dispose() {
    _tabs.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    ref.watch(themeModeProvider);
    ref.watch(localeProvider);
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.student.fullName),
        bottom: TabBar(
          controller: _tabs,
          indicatorColor: AppColors.emerald,
          labelColor: AppColors.emerald,
          unselectedLabelColor: AppColors.textMuted,
          tabs: [Tab(text: t('detail.attendanceTab')), Tab(text: t('detail.notesTab')), Tab(text: t('detail.messagesTab'))],
        ),
      ),
      body: TabBarView(
        controller: _tabs,
        children: [
          _StudentAttendanceTab(studentId: widget.student.id),
          NotesPanel(personType: 'STUDENT', personId: widget.student.id),
          _StudentMessagesPanel(studentId: widget.student.id),
        ],
      ),
    );
  }
}

class _StudentAttendanceTab extends ConsumerStatefulWidget {
  const _StudentAttendanceTab({required this.studentId});
  final int studentId;

  @override
  ConsumerState<_StudentAttendanceTab> createState() => _StudentAttendanceTabState();
}

class _StudentAttendanceTabState extends ConsumerState<_StudentAttendanceTab> {
  late Future<List<AttendanceEvent>> _future;

  @override
  void initState() {
    super.initState();
    _future = ref.read(directorRepositoryProvider).studentAttendance(widget.studentId);
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<List<AttendanceEvent>>(
      future: _future,
      builder: (context, snap) {
        if (snap.connectionState == ConnectionState.waiting) return const Center(child: CircularProgressIndicator());
        if (snap.hasError) return Center(child: Text(apiErrorMessage(snap.error!), style: TextStyle(color: AppColors.textSecondary)));
        final events = snap.data ?? [];
        final stats = computeAttendanceStats(events, days: 30);
        final sorted = [...events]..sort((a, b) => b.timestamp.compareTo(a.timestamp));
        final fmt = DateFormat('dd.MM.yyyy HH:mm');

        return ListView(
          padding: const EdgeInsets.all(16),
          children: [
            Row(
              children: [
                _Stat(label: t('detail.present'), value: '${stats.presentDays}', color: AppColors.emerald),
                const SizedBox(width: 10),
                _Stat(label: t('detail.absent'), value: '${stats.absentDays}', color: AppColors.red),
                const SizedBox(width: 10),
                _Stat(label: '%', value: '${stats.percent}%', color: AppColors.amber),
              ],
            ),
            const SizedBox(height: 20),
            Text(t('detail.last30days'), style: TextStyle(color: AppColors.textPrimary, fontWeight: FontWeight.w600)),
            const SizedBox(height: 10),
            if (sorted.isEmpty)
              Padding(padding: const EdgeInsets.symmetric(vertical: 16), child: Text(t('detail.noEvents'), style: TextStyle(color: AppColors.textFaint)))
            else
              ...sorted.take(30).map((ev) {
                final isIn = ev.type == 'IN';
                return Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: Row(children: [
                    Container(width: 8, height: 8, decoration: BoxDecoration(color: isIn ? AppColors.emerald : AppColors.textFaint, shape: BoxShape.circle)),
                    const SizedBox(width: 10),
                    Text(isIn ? t('event.in') : t('event.out'), style: TextStyle(color: isIn ? AppColors.emerald : AppColors.textSecondary, fontSize: 12.5, fontWeight: FontWeight.w600)),
                    const SizedBox(width: 10),
                    Text(fmt.format(ev.timestamp.toLocal()), style: TextStyle(color: AppColors.textSecondary, fontSize: 12.5)),
                  ]),
                );
              }),
          ],
        );
      },
    );
  }
}

class _Stat extends StatelessWidget {
  const _Stat({required this.label, required this.value, required this.color});
  final String label;
  final String value;
  final Color color;

  @override
  Widget build(BuildContext context) => Expanded(
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 14),
          decoration: BoxDecoration(color: color.withOpacity(0.08), borderRadius: BorderRadius.circular(12)),
          child: Column(children: [
            Text(value, style: TextStyle(color: color, fontWeight: FontWeight.bold, fontSize: 18)),
            const SizedBox(height: 2),
            Text(label, style: TextStyle(color: AppColors.textFaint, fontSize: 10)),
          ]),
        ),
      );
}

class _StudentMessagesPanel extends ConsumerStatefulWidget {
  const _StudentMessagesPanel({required this.studentId});
  final int studentId;

  @override
  ConsumerState<_StudentMessagesPanel> createState() => _StudentMessagesPanelState();
}

class _StudentMessagesPanelState extends ConsumerState<_StudentMessagesPanel> {
  List<ChatMessage> _messages = [];
  bool _loading = true;
  bool _sending = false;
  String? _error;
  final _ctrl = TextEditingController();
  final _scroll = ScrollController();

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _ctrl.dispose();
    _scroll.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final msgs = await ref.read(directorRepositoryProvider).studentMessages(widget.studentId);
      setState(() {
        _messages = msgs;
        _loading = false;
      });
    } catch (e) {
      setState(() {
        _error = apiErrorMessage(e);
        _loading = false;
      });
    }
  }

  Future<void> _send() async {
    final text = _ctrl.text.trim();
    if (text.isEmpty || _sending) return;
    setState(() => _sending = true);
    try {
      final m = await ref.read(directorRepositoryProvider).sendStudentMessage(widget.studentId, text);
      setState(() {
        _messages = [..._messages, m];
        _ctrl.clear();
      });
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(apiErrorMessage(e))));
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) return const Center(child: CircularProgressIndicator());
    if (_error != null) return Center(child: Text(_error!, style: TextStyle(color: AppColors.textSecondary)));
    final fmt = DateFormat('HH:mm');

    return Column(
      children: [
        Expanded(
          child: _messages.isEmpty
              ? Center(child: Text(t('detail.noMessages'), style: TextStyle(color: AppColors.textFaint)))
              : ListView.builder(
                  controller: _scroll,
                  padding: const EdgeInsets.all(16),
                  itemCount: _messages.length,
                  itemBuilder: (context, i) {
                    final m = _messages[i];
                    final isMine = m.senderType == 'STAFF';
                    return Align(
                      alignment: isMine ? Alignment.centerRight : Alignment.centerLeft,
                      child: Container(
                        margin: const EdgeInsets.only(bottom: 10),
                        constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.75),
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                        decoration: BoxDecoration(
                          color: isMine ? AppColors.emerald.withOpacity(0.18) : AppColors.bgCardAlt,
                          borderRadius: BorderRadius.circular(14),
                        ),
                        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                          if (!isMine) Text(m.senderName, style: TextStyle(color: AppColors.cyan, fontSize: 11, fontWeight: FontWeight.w600)),
                          Text(m.text, style: TextStyle(color: AppColors.textPrimary, fontSize: 13.5)),
                          const SizedBox(height: 4),
                          Text(fmt.format(m.createdAt.toLocal()), style: TextStyle(color: AppColors.textFaint, fontSize: 10)),
                        ]),
                      ),
                    );
                  },
                ),
        ),
        SafeArea(
          top: false,
          child: Padding(
            padding: const EdgeInsets.fromLTRB(12, 8, 12, 12),
            child: Row(children: [
              Expanded(
                child: TextField(
                  controller: _ctrl,
                  style: TextStyle(color: AppColors.textPrimary),
                  minLines: 1,
                  maxLines: 4,
                  decoration: InputDecoration(hintText: t('messages.replyPlaceholder')),
                ),
              ),
              const SizedBox(width: 8),
              IconButton.filled(
                onPressed: _sending ? null : _send,
                icon: _sending ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white)) : const Icon(Icons.send_rounded),
                style: IconButton.styleFrom(backgroundColor: AppColors.emerald),
              ),
            ]),
          ),
        ),
      ],
    );
  }
}
