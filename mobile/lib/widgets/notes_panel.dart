import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../core/api_client.dart';
import '../features/director/director_repository.dart';
import '../l10n/l10n.dart';
import '../models/models.dart';
import '../theme/app_theme.dart';

class NotesPanel extends ConsumerStatefulWidget {
  const NotesPanel({super.key, required this.personType, required this.personId});
  final String personType;
  final int personId;

  @override
  ConsumerState<NotesPanel> createState() => _NotesPanelState();
}

class _NotesPanelState extends ConsumerState<NotesPanel> {
  List<PersonNoteEntry> _notes = [];
  bool _loading = true;
  bool _saving = false;
  String? _error;
  final _ctrl = TextEditingController();

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final notes = await ref.read(directorRepositoryProvider).notes(widget.personType, widget.personId);
      setState(() {
        _notes = notes;
        _loading = false;
      });
    } catch (e) {
      setState(() {
        _error = apiErrorMessage(e);
        _loading = false;
      });
    }
  }

  Future<void> _add() async {
    final text = _ctrl.text.trim();
    if (text.isEmpty || _saving) return;
    setState(() => _saving = true);
    try {
      final n = await ref.read(directorRepositoryProvider).addNote(widget.personType, widget.personId, text);
      setState(() {
        _notes = [n, ..._notes];
        _ctrl.clear();
      });
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(apiErrorMessage(e))));
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) return const Center(child: CircularProgressIndicator());
    if (_error != null) return Center(child: Text(_error!, style: TextStyle(color: AppColors.textSecondary)));
    final fmt = DateFormat('dd.MM.yyyy HH:mm');

    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
          child: Row(
            children: [
              Expanded(
                child: TextField(
                  controller: _ctrl,
                  style: TextStyle(color: AppColors.textPrimary, fontSize: 13.5),
                  minLines: 1,
                  maxLines: 3,
                  decoration: InputDecoration(
                    hintText: t('notes.addPlaceholder'),
                    prefixIcon: Icon(Icons.note_add_outlined, size: 20, color: AppColors.textMuted),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              IconButton(
                onPressed: _saving ? null : _add,
                icon: _saving
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
        Expanded(
          child: _notes.isEmpty
              ? Center(child: Text(t('detail.noNotes'), style: TextStyle(color: AppColors.textFaint)))
              : ListView.separated(
                  padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                  itemCount: _notes.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 8),
                  itemBuilder: (context, i) {
                    final n = _notes[i];
                    return Container(
                      padding: const EdgeInsets.all(14),
                      decoration: AppDecorations.card(),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(n.text, style: TextStyle(color: AppColors.textPrimary, fontSize: 13.5, height: 1.4)),
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
                ),
        ),
      ],
    );
  }
}
