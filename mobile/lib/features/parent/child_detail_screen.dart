import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../core/api_client.dart';
import '../../core/attendance_stats.dart';
import '../../l10n/l10n.dart';
import '../../models/models.dart';
import '../../theme/app_theme.dart';
import 'parent_repository.dart';

class ChildDetailScreen extends ConsumerStatefulWidget {
  const ChildDetailScreen({super.key, required this.student});
  final Student student;

  @override
  ConsumerState<ChildDetailScreen> createState() => _ChildDetailScreenState();
}

class _ChildDetailScreenState extends ConsumerState<ChildDetailScreen> with SingleTickerProviderStateMixin {
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
          tabs: [
            Tab(text: t('detail.attendanceTab')),
            Tab(text: t('detail.notesTab')),
            Tab(text: t('detail.messagesTab')),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabs,
        children: [
          _AttendanceTab(studentId: widget.student.id),
          _NotesTab(studentId: widget.student.id),
          _MessagesTab(studentId: widget.student.id),
        ],
      ),
    );
  }
}

class _AttendanceTab extends ConsumerStatefulWidget {
  const _AttendanceTab({required this.studentId});
  final int studentId;

  @override
  ConsumerState<_AttendanceTab> createState() => _AttendanceTabState();
}

class _AttendanceTabState extends ConsumerState<_AttendanceTab> {
  late Future<List<AttendanceEvent>> _future;

  @override
  void initState() {
    super.initState();
    _future = ref.read(parentRepositoryProvider).attendance(widget.studentId);
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<List<AttendanceEvent>>(
      future: _future,
      builder: (context, snap) {
        if (snap.connectionState == ConnectionState.waiting) {
          return const Center(child: CircularProgressIndicator());
        }
        if (snap.hasError) {
          return Center(child: Text(apiErrorMessage(snap.error!), style: TextStyle(color: AppColors.textSecondary)));
        }
        final events = snap.data ?? [];
        final stats = computeAttendanceStats(events, days: 30);
        final sorted = [...events]..sort((a, b) => b.timestamp.compareTo(a.timestamp));

        return ListView(
          padding: const EdgeInsets.all(16),
          children: [
            Row(
              children: [
                _StatBox(label: t('detail.present'), value: '${stats.presentDays}', color: AppColors.emerald),
                const SizedBox(width: 10),
                _StatBox(label: t('detail.absent'), value: '${stats.absentDays}', color: AppColors.red),
                const SizedBox(width: 10),
                _StatBox(label: '%', value: '${stats.percent}%', color: AppColors.amber),
              ],
            ),
            const SizedBox(height: 6),
            Text(tParams('attendance.periodNote', {'days': '${stats.periodDays}'}),
                style: TextStyle(color: AppColors.textFaint, fontSize: 11.5)),
            if (stats.schoolDays > 0) ...[
              const SizedBox(height: 14),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: AppColors.emerald.withOpacity(0.06),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AppColors.borderEmerald),
                ),
                child: Text(_summaryText(stats), style: TextStyle(color: AppColors.emerald, fontSize: 13)),
              ),
            ],
            const SizedBox(height: 22),
            Text(t('attendance.history'), style: TextStyle(color: AppColors.textPrimary, fontWeight: FontWeight.w600, fontSize: 14)),
            const SizedBox(height: 10),
            if (sorted.isEmpty)
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 20),
                child: Text(t('detail.noEvents'), style: TextStyle(color: AppColors.textFaint)),
              )
            else
              ...sorted.take(30).map((ev) => _EventRow(ev: ev)),
          ],
        );
      },
    );
  }

  String _summaryText(AttendanceStats s) {
    final key = attendanceSummaryKey(s);
    final params = {'percent': '${s.percent}', 'days': '${s.presentDays}'};
    switch (key) {
      case 'excellent':
        return tParams('attendance.summaryExcellent', params);
      case 'good':
        return tParams('attendance.summaryGood', params);
      case 'moderate':
        return tParams('attendance.summaryModerate', params);
      case 'noAttendance':
        return t('attendance.summaryNoAttendance');
      default:
        return tParams('attendance.summaryLow', params);
    }
  }
}

class _StatBox extends StatelessWidget {
  const _StatBox({required this.label, required this.value, required this.color});
  final String label;
  final String value;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 14),
        decoration: BoxDecoration(color: color.withOpacity(0.08), borderRadius: BorderRadius.circular(12)),
        child: Column(
          children: [
            Text(value, style: TextStyle(color: color, fontWeight: FontWeight.bold, fontSize: 18)),
            const SizedBox(height: 2),
            Text(label, style: TextStyle(color: AppColors.textFaint, fontSize: 10)),
          ],
        ),
      ),
    );
  }
}

class _EventRow extends StatelessWidget {
  const _EventRow({required this.ev});
  final AttendanceEvent ev;

  @override
  Widget build(BuildContext context) {
    final isIn = ev.type == 'IN';
    final fmt = DateFormat('dd.MM.yyyy HH:mm');
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        children: [
          Container(width: 8, height: 8, decoration: BoxDecoration(color: isIn ? AppColors.emerald : AppColors.textFaint, shape: BoxShape.circle)),
          const SizedBox(width: 10),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
            decoration: BoxDecoration(
              color: (isIn ? AppColors.emerald : AppColors.textFaint).withOpacity(0.1),
              borderRadius: BorderRadius.circular(6),
            ),
            child: Text(isIn ? t('event.in') : t('event.out'), style: TextStyle(color: isIn ? AppColors.emerald : AppColors.textSecondary, fontSize: 11, fontWeight: FontWeight.w600)),
          ),
          const SizedBox(width: 10),
          Text(fmt.format(ev.timestamp.toLocal()), style: TextStyle(color: AppColors.textSecondary, fontSize: 12.5)),
        ],
      ),
    );
  }
}

class _NotesTab extends ConsumerStatefulWidget {
  const _NotesTab({required this.studentId});
  final int studentId;

  @override
  ConsumerState<_NotesTab> createState() => _NotesTabState();
}

class _NotesTabState extends ConsumerState<_NotesTab> {
  late Future<List<PersonNoteEntry>> _future;

  @override
  void initState() {
    super.initState();
    _future = ref.read(parentRepositoryProvider).notes(widget.studentId);
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<List<PersonNoteEntry>>(
      future: _future,
      builder: (context, snap) {
        if (snap.connectionState == ConnectionState.waiting) return const Center(child: CircularProgressIndicator());
        if (snap.hasError) return Center(child: Text(apiErrorMessage(snap.error!), style: TextStyle(color: AppColors.textSecondary)));
        final notes = snap.data ?? [];
        if (notes.isEmpty) {
          return Center(child: Text(t('detail.noNotes'), style: TextStyle(color: AppColors.textFaint)));
        }
        final fmt = DateFormat('dd.MM.yyyy HH:mm');
        return ListView.separated(
          padding: const EdgeInsets.all(16),
          itemCount: notes.length,
          separatorBuilder: (_, __) => const SizedBox(height: 10),
          itemBuilder: (context, i) {
            final n = notes[i];
            return Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: AppColors.bgCardAlt,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AppColors.borderWhite),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(n.text, style: TextStyle(color: AppColors.textPrimary, fontSize: 13.5)),
                  const SizedBox(height: 8),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(n.authorName, style: TextStyle(color: AppColors.emerald, fontSize: 11)),
                      Text(fmt.format(n.createdAt.toLocal()), style: TextStyle(color: AppColors.textFaint, fontSize: 11)),
                    ],
                  ),
                ],
              ),
            );
          },
        );
      },
    );
  }
}

class _MessagesTab extends ConsumerStatefulWidget {
  const _MessagesTab({required this.studentId});
  final int studentId;

  @override
  ConsumerState<_MessagesTab> createState() => _MessagesTabState();
}

class _MessagesTabState extends ConsumerState<_MessagesTab> {
  final _ctrl = TextEditingController();
  final _scroll = ScrollController();
  List<ChatMessage> _messages = [];
  bool _loading = true;
  bool _sending = false;
  String? _error;

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
      final msgs = await ref.read(parentRepositoryProvider).messages(widget.studentId);
      setState(() {
        _messages = msgs;
        _loading = false;
      });
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (_scroll.hasClients) _scroll.jumpTo(_scroll.position.maxScrollExtent);
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
      final m = await ref.read(parentRepositoryProvider).sendMessage(widget.studentId, text);
      setState(() {
        _messages = [..._messages, m];
        _ctrl.clear();
      });
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (_scroll.hasClients) _scroll.animateTo(_scroll.position.maxScrollExtent, duration: const Duration(milliseconds: 250), curve: Curves.easeOut);
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

    return Column(
      children: [
        Expanded(
          child: _messages.isEmpty
              ? Center(child: Text(t('messages.emptyFirst'), style: TextStyle(color: AppColors.textFaint)))
              : ListView.builder(
                  controller: _scroll,
                  padding: const EdgeInsets.all(16),
                  itemCount: _messages.length,
                  itemBuilder: (context, i) => _MessageBubble(msg: _messages[i]),
                ),
        ),
        SafeArea(
          top: false,
          child: Padding(
            padding: const EdgeInsets.fromLTRB(12, 8, 12, 12),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _ctrl,
                    style: TextStyle(color: AppColors.textPrimary),
                    minLines: 1,
                    maxLines: 4,
                    decoration: InputDecoration(hintText: t('messages.replyPlaceholder')),
                    onSubmitted: (_) => _send(),
                  ),
                ),
                const SizedBox(width: 8),
                IconButton.filled(
                  onPressed: _sending ? null : _send,
                  icon: _sending
                      ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                      : const Icon(Icons.send_rounded),
                  style: IconButton.styleFrom(backgroundColor: AppColors.emerald),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}

class _MessageBubble extends StatelessWidget {
  const _MessageBubble({required this.msg});
  final ChatMessage msg;

  @override
  Widget build(BuildContext context) {
    final isMine = msg.senderType == 'GUARDIAN';
    final fmt = DateFormat('HH:mm');
    return Align(
      alignment: isMine ? Alignment.centerRight : Alignment.centerLeft,
      child: Container(
        margin: const EdgeInsets.only(bottom: 10),
        constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.75),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        decoration: BoxDecoration(
          color: isMine ? AppColors.emerald.withOpacity(0.18) : AppColors.bgCardAlt,
          borderRadius: BorderRadius.only(
            topLeft: const Radius.circular(14),
            topRight: const Radius.circular(14),
            bottomLeft: Radius.circular(isMine ? 14 : 2),
            bottomRight: Radius.circular(isMine ? 2 : 14),
          ),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (!isMine) Text(msg.senderName, style: TextStyle(color: AppColors.cyan, fontSize: 11, fontWeight: FontWeight.w600)),
            if (!isMine) const SizedBox(height: 3),
            Text(msg.text, style: TextStyle(color: AppColors.textPrimary, fontSize: 13.5)),
            const SizedBox(height: 4),
            Text(fmt.format(msg.createdAt.toLocal()), style: TextStyle(color: AppColors.textFaint, fontSize: 10)),
          ],
        ),
      ),
    );
  }
}
