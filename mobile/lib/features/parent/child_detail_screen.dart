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
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(widget.student.fullName, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 16)),
            Text(
              [if (widget.student.className != null) widget.student.className!, if (widget.student.schoolName != null) widget.student.schoolName!].join(' · '),
              style: TextStyle(color: AppColors.textMuted, fontSize: 12),
            ),
          ],
        ),
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(48),
          child: Container(
            decoration: BoxDecoration(border: Border(bottom: BorderSide(color: AppColors.borderSubtle))),
            child: TabBar(
              controller: _tabs,
              indicatorColor: AppColors.emerald,
              indicatorWeight: 2.5,
              labelColor: AppColors.emerald,
              unselectedLabelColor: AppColors.textMuted,
              tabs: [
                Tab(text: t('detail.attendanceTab')),
                Tab(text: t('detail.notesTab')),
                Tab(text: t('detail.messagesTab')),
              ],
            ),
          ),
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
        if (snap.connectionState == ConnectionState.waiting) return const Center(child: CircularProgressIndicator());
        if (snap.hasError) return Center(child: Text(apiErrorMessage(snap.error!), style: TextStyle(color: AppColors.textSecondary)));
        final events = snap.data ?? [];
        final stats = computeAttendanceStats(events, days: 30);
        final sorted = [...events]..sort((a, b) => b.timestamp.compareTo(a.timestamp));
        final fmt = DateFormat('dd.MM.yyyy HH:mm');

        return ListView(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
          children: [
            Row(
              children: [
                _StatBox(label: t('detail.present'), value: '${stats.presentDays}', color: AppColors.emerald),
                const SizedBox(width: 10),
                _StatBox(label: t('detail.absent'), value: '${stats.absentDays}', color: AppColors.red),
                const SizedBox(width: 10),
                _StatBox(label: 'Foiz', value: '${stats.percent}%', color: AppColors.cyan),
              ],
            ),
            const SizedBox(height: 12),
            Text(
              tParams('attendance.periodNote', {'days': '${stats.periodDays}'}),
              style: TextStyle(color: AppColors.textFaint, fontSize: 11.5),
            ),
            if (stats.schoolDays > 0) ...[
              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.all(14),
                decoration: AppDecorations.badge(color: AppColors.emerald),
                child: Text(_summaryText(stats), style: TextStyle(color: AppColors.emerald, fontSize: 13, height: 1.3)),
              ),
            ],
            const SizedBox(height: 20),
            Text(t('attendance.history'), style: TextStyle(color: AppColors.textPrimary, fontWeight: FontWeight.w600, fontSize: 14.5)),
            const SizedBox(height: 10),
            if (sorted.isEmpty)
              Padding(padding: const EdgeInsets.symmetric(vertical: 24), child: Center(child: Text(t('detail.noEvents'), style: TextStyle(color: AppColors.textFaint))))
            else
              ...sorted.take(30).map((ev) {
                final isIn = ev.type == 'IN';
                return Container(
                  margin: const EdgeInsets.only(bottom: 8),
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                  decoration: AppDecorations.card(),
                  child: Row(
                    children: [
                      Container(
                        width: 8,
                        height: 8,
                        decoration: BoxDecoration(color: isIn ? AppColors.emerald : AppColors.amber, shape: BoxShape.circle),
                      ),
                      const SizedBox(width: 12),
                      Text(
                        isIn ? t('event.in') : t('event.out'),
                        style: TextStyle(color: isIn ? AppColors.emerald : AppColors.amber, fontSize: 13, fontWeight: FontWeight.w600),
                      ),
                      const Spacer(),
                      Text(fmt.format(ev.timestamp.toLocal()), style: TextStyle(color: AppColors.textMuted, fontSize: 12.5)),
                    ],
                  ),
                );
              }),
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
        decoration: AppDecorations.card(),
        child: Column(
          children: [
            Text(value, style: TextStyle(color: color, fontWeight: FontWeight.bold, fontSize: 18)),
            const SizedBox(height: 2),
            Text(label, style: TextStyle(color: AppColors.textMuted, fontSize: 11)),
          ],
        ),
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
              padding: const EdgeInsets.all(14),
              decoration: AppDecorations.card(),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(n.text, style: TextStyle(color: AppColors.textPrimary, fontSize: 13.5, height: 1.35)),
                  const SizedBox(height: 10),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                        decoration: AppDecorations.badge(color: AppColors.emerald),
                        child: Text(n.authorName, style: TextStyle(color: AppColors.emerald, fontSize: 11, fontWeight: FontWeight.w600)),
                      ),
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
      _scrollToBottom();
    } catch (e) {
      setState(() {
        _error = apiErrorMessage(e);
        _loading = false;
      });
    }
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scroll.hasClients) _scroll.jumpTo(_scroll.position.maxScrollExtent);
    });
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
      _scrollToBottom();
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
              : ListView.separated(
                  controller: _scroll,
                  padding: const EdgeInsets.all(16),
                  itemCount: _messages.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 10),
                  itemBuilder: (context, i) => _MessageBubble(msg: _messages[i]),
                ),
        ),
        Container(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
          decoration: BoxDecoration(border: Border(top: BorderSide(color: AppColors.borderSubtle))),
          child: Row(
            children: [
              Expanded(
                child: TextField(
                  controller: _ctrl,
                  style: TextStyle(color: AppColors.textPrimary, fontSize: 13.5),
                  decoration: InputDecoration(
                    hintText: t('messages.replyPlaceholder'),
                    contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                  ),
                  onSubmitted: (_) => _send(),
                ),
              ),
              const SizedBox(width: 8),
              IconButton(
                onPressed: _sending ? null : _send,
                icon: _sending
                    ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                    : const Icon(Icons.send_rounded, size: 18),
                style: IconButton.styleFrom(
                  backgroundColor: AppColors.emerald,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.all(13),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                ),
              ),
            ],
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
        constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.75),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        decoration: BoxDecoration(
          color: isMine ? AppColors.emerald : AppColors.bgCard,
          borderRadius: BorderRadius.circular(16),
          border: isMine ? null : Border.all(color: AppColors.borderSubtle),
        ),
        child: Column(
          crossAxisAlignment: isMine ? CrossAxisAlignment.end : CrossAxisAlignment.start,
          children: [
            if (!isMine) ...[
              Text(msg.senderName, style: TextStyle(color: AppColors.cyan, fontSize: 11, fontWeight: FontWeight.w600)),
              const SizedBox(height: 3),
            ],
            Text(
              msg.text,
              style: TextStyle(color: isMine ? Colors.white : AppColors.textPrimary, fontSize: 13.5, height: 1.35),
            ),
            const SizedBox(height: 4),
            Text(
              fmt.format(msg.createdAt.toLocal()),
              style: TextStyle(color: isMine ? Colors.white.withOpacity(0.7) : AppColors.textFaint, fontSize: 10.5),
            ),
          ],
        ),
      ),
    );
  }
}
