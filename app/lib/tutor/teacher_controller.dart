import 'dart:async';

import 'package:flutter/foundation.dart';

import '../content/book.dart';
import '../content/fa_numbers.dart';
import 'dari_terms.dart';
import 'llama_client.dart';
import 'model_service.dart';
import 'prompt_builder.dart';

enum TutorRole { student, teacher, divider }

class TutorMessage {
  TutorMessage(this.role, this.text);

  final TutorRole role;

  /// What the student sees: for the teacher, the model's reply with Dari terms fixed.
  String text;
  String _raw = '';
  bool streaming = false;
  bool failed = false;

  /// Other pages (PDF numbers) the teacher was given for this answer.
  List<int> sourcePages = const [];

  /// The PDF page the student was looking at when the question was asked.
  int? askedOnPage;

  /// For a finished answer: the pages and chapters it mentions, shown as links.
  List<PageLink> links = const [];
}

/// The conversation with the teacher about the book the student is reading.
/// History lives only in memory — nothing is ever written to disk.
class TeacherController extends ChangeNotifier {
  TeacherController({required this.builder, required this.model, required this.studentName}) {
    model.addListener(notifyListeners);
  }

  final PromptBuilder builder;
  final ModelService model;

  /// Only kept in memory for this session; never written to disk.
  final String studentName;
  final List<TutorMessage> messages = [];

  StreamSubscription<String>? _reply;
  int _pdfPage = 1;
  int? _lastAskedPage;

  Book get book => builder.book;
  bool get busy => _reply != null;

  /// The PDF page the teacher will answer about.
  int get currentPage => _pdfPage;
  bool get modelReady => model.ready;
  String? get modelError => model.error;

  /// The page the student is looking at. Scrolling doesn't interrupt an answer being written;
  /// the next question is asked about the new page.
  void setPage(int pdfPage) {
    _pdfPage = pdfPage;
    notifyListeners();
  }

  void ask(String question) {
    final q = question.trim();
    if (q.isEmpty || busy || !modelReady) return;

    // Mark in the conversation when the student asks about a different page than last time.
    if (_lastAskedPage != null && _lastAskedPage != _pdfPage) {
      final printed = book.printedPageOf(_pdfPage);
      messages.add(TutorMessage(
          TutorRole.divider, printed != null ? 'صفحهٔ ${faNum(printed)}' : 'صفحهٔ ${faNum(_pdfPage)} (پی‌دی‌اف)'));
    }
    _lastAskedPage = _pdfPage;

    final turn = builder.build(pdfPage: _pdfPage, question: q, history: _historyOnThisPage());
    debugPrint('tutor: question asked on PDF page $_pdfPage (${builder.pageName(_pdfPage)}), '
        'other pages ${turn.sourcePages}');
    messages.add(TutorMessage(TutorRole.student, q)..askedOnPage = _pdfPage);
    final reply = TutorMessage(TutorRole.teacher, '')
      ..streaming = true
      ..askedOnPage = _pdfPage
      ..sourcePages = turn.sourcePages;
    messages.add(reply);
    notifyListeners();

    _reply = model.client.chat(turn.messages).listen(
      (piece) {
        reply._raw += piece;
        // Fix terms on the whole text so a word split across pieces is still caught.
        reply.text = toBookDari(reply._raw);
        notifyListeners();
      },
      onError: (Object e) {
        reply.failed = true;
        if (reply.text.isEmpty) reply.text = 'معذرت می‌خواهم، مشکلی پیش آمد. لطفاً دوباره کوشش کنید.';
        debugPrint('tutor error: $e');
        _finish(reply);
      },
      onDone: () => _finish(reply),
      cancelOnError: true,
    );
  }

  void stop() {
    final reply = _reply;
    if (reply == null) return;
    reply.cancel();
    _reply = null;
    for (final m in messages) {
      m.streaming = false;
    }
    notifyListeners();
  }

  void _finish(TutorMessage reply) {
    reply.streaming = false;
    if (!reply.failed) {
      reply.links = builder.answerLinks(reply.text,
          currentPage: reply.askedOnPage ?? _pdfPage, sourcePages: reply.sourcePages);
    }
    _reply = null;
    notifyListeners();
  }

  /// Recent turns since the last page change (at most [maxMessages]), oldest first and
  /// starting with a student turn, as the chat template expects.
  List<ChatMessage> _historyOnThisPage({int maxMessages = 6}) {
    final turns = <ChatMessage>[];
    for (final m in messages.reversed) {
      if (m.role == TutorRole.divider) break;
      if (m.failed || m.text.isEmpty) continue;
      turns.insert(0, ChatMessage(m.role == TutorRole.student ? 'user' : 'assistant', m.text));
      if (turns.length >= maxMessages) break;
    }
    while (turns.isNotEmpty && turns.first.role != 'user') {
      turns.removeAt(0);
    }
    return turns;
  }

  @override
  void dispose() {
    model.removeListener(notifyListeners);
    stop();
    super.dispose();
  }
}
