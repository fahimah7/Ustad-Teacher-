import '../content/book.dart';
import '../content/fa_numbers.dart';
import '../content/outline.dart';
import 'book_search.dart';
import 'llama_client.dart';
import 'page_context.dart';

/// A link under a teacher's answer to a page or chapter the answer mentions.
class PageLink {
  const PageLink(this.label, this.pdfPage);

  final String label;
  final int pdfPage;
}

const _ordinals = {'اول': 1, 'دوم': 2, 'سوم': 3, 'چهارم': 4, 'پنجم': 5, 'ششم': 6, 'هفتم': 7, 'هشتم': 8, 'نهم': 9, 'دهم': 10};

class TutorTurn {
  const TutorTurn(this.messages, this.sourcePages);

  final List<ChatMessage> messages;

  /// Other pages (PDF numbers) whose notes were given to the teacher for this answer.
  final List<int> sourcePages;
}

const _noPackage =
    'برای این صفحه هنوز معلومات آماده نیست. به شاگرد بگویید به صفحهٔ کتاب نگاه کند و فقط به اندازهٔ دانش عمومی همین کتاب کمک کنید.';

/// Fills `{{book_title}}` and `{{student_name}}` in the teacher prompt template
/// (app/assets/prompts/teacher_system_fa.txt). The name is user input, so it is cut to one
/// short line without brackets.
String fillTeacherPrompt(String template, {required String bookTitle, required String studentName}) {
  var name = studentName.replaceAll(RegExp(r'[\r\n{}\[\]«»]'), ' ').replaceAll(RegExp(r'\s+'), ' ').trim();
  if (name.length > 30) name = name.substring(0, 30).trim();
  return template
      .replaceAll('{{book_title}}', bookTitle)
      .replaceAll('{{student_name}}', name.isEmpty ? 'شاگرد' : name);
}

/// Assembles what the teacher sees for one question: rules + book outline as the system message
/// (never changes, so it stays in llama.cpp's prompt cache), the conversation so far on this page,
/// then the open page's notes, any other pages' notes and the question.
/// Pure Dart (no Flutter) so tool/eval_teacher.dart can use exactly the same prompts.
class PromptBuilder {
  PromptBuilder({required this.book, required String systemPrompt})
      : search = BookSearch(book),
        outline = buildOutline(book) {
    _prefix = '$systemPrompt\n\n${outlineText(book, outline)}';
  }

  final Book book;
  final BookSearch search;
  final List<OutlineChapter> outline;
  late final String _prefix;

  static final _pageRef = RegExp(r'(?:صفحهٔ|صفحه‌ی|صفحه|ص)\s*\.?\s*([0-9۰-۹٠-٩]+)');

  TutorTurn build({required int pdfPage, required String question, List<ChatMessage> history = const []}) {
    final page = book.cachedPackage(pdfPage);
    final pageContext = page == null
        ? _noPackage
        : buildPageContext(book, page, prev: book.cachedPackage(pdfPage - 1), next: book.cachedPackage(pdfPage + 1));

    final extra = <String>[];
    final sources = <int>[];

    // A page the student names ("صفحهٔ ۴۰") gets its full notes.
    for (final m in _pageRef.allMatches(question)) {
      final printed = parseFaInt(m.group(1)!);
      if (printed == null) continue;
      final target = book.pdfPageForPrinted(printed);
      final pkg = book.cachedPackage(target);
      if (pkg == null || target == pdfPage || sources.contains(target)) continue;
      extra.add(buildPageContext(book, pkg).replaceFirst('[معلومات صفحه]', '[معلومات صفحه‌ای که شاگرد نام برده]'));
      sources.add(target);
      if (sources.length == 2) break;
    }

    // Otherwise, if the question is about another part of the book, add the best-matching pages.
    if (sources.isEmpty) {
      for (final other in relatedPages(question, pdfPage)) {
        extra.add(pageDigest(book, book.cachedPackage(other)!));
        sources.add(other);
      }
    }

    // The open page's notes go right before the question: a small model keeps reading what is
    // closest to the question, even deep into a conversation. Rules + outline stay in the system
    // message, identical on every page and turn, so llama.cpp reuses them from its prompt cache.
    // The page is named with the question, so "this page" can't be mistaken for another one.
    final user = [pageContext, ...extra, '[سوال شاگرد در ${pageName(pdfPage)}]\n$question'].join('\n\n');
    return TutorTurn([
      ChatMessage('system', _prefix),
      ...history,
      ChatMessage('user', user),
    ], sources);
  }

  static final _pageMention = RegExp(r'صفحه(?:ٔ|‌ی|ی)?\s*([0-9۰-۹]+)');
  static final _chapterMention = RegExp('فصل\\s*([0-9۰-۹]+|${_ordinals.keys.join('|')})');

  /// Links for the pages and chapters an answer actually mentions. A page only gets a link if the
  /// teacher was given it (another page's notes, or the outline's section and chapter starts),
  /// so a mistaken page number never becomes a link. The page being read gets no link.
  List<PageLink> answerLinks(String answer, {required int currentPage, List<int> sourcePages = const []}) {
    final allowed = <int>{
      ...sourcePages,
      for (final c in outline) ...[c.pdfPage, for (final s in c.sections) s.pdfPage],
    };
    final links = <PageLink>[];
    void add(String label, int pdfPage) {
      if (pdfPage != currentPage && !links.any((l) => l.pdfPage == pdfPage)) links.add(PageLink(label, pdfPage));
    }

    for (final m in _pageMention.allMatches(answer)) {
      final printed = parseFaInt(m.group(1)!);
      if (printed == null) continue;
      final pdf = book.pdfPageForPrinted(printed);
      if (book.printedPageOf(pdf) == printed && allowed.contains(pdf)) add('صفحهٔ ${faNum(printed)}', pdf);
    }
    final currentChapter = book.cachedPackage(currentPage)?.chapter;
    for (final m in _chapterMention.allMatches(answer)) {
      final number = _ordinals[m.group(1)] ?? parseFaInt(m.group(1)!);
      if (number == null || number == currentChapter) continue;
      for (final c in outline) {
        if (c.chapter.number == number) add('فصل ${faNum(number)}', c.pdfPage);
      }
    }
    return links.take(4).toList();
  }

  /// "صفحهٔ ۲۴۵ کتاب" (or the PDF page number for pages without a printed number).
  String pageName(int pdfPage) {
    final printed = book.printedPageOf(pdfPage);
    return printed != null ? 'صفحهٔ ${faNum(printed)} کتاب' : 'صفحهٔ ${faNum(pdfPage)} (پی‌دی‌اف)';
  }

  // "این صفحه", "همین مثال", "اینجا"…: the student means what is in front of her.
  static final _aboutThisPage =
      RegExp(r'(این|همین)\s*(صفحه|مثال|تمرین|شکل|درس|فورمول|فرمول|گراف|جدول|فعالیت|سوال)|اینجا');

  /// Pages elsewhere in the book for a question that names a topic the open page doesn't cover.
  List<int> relatedPages(String question, int pdfPage, {int limit = 2, double minScore = 4.0}) {
    if (_aboutThisPage.hasMatch(question)) return const [];
    // If every topic word in the question already occurs on the open page (or its neighbours),
    // the question is about this page and other pages would only distract the small model.
    final local = {for (var p = pdfPage - 1; p <= pdfPage + 1; p++) ...search.termsOf(p)};
    final missing = tokenize(question).where((t) => search.knows(t) && !local.contains(t)).toSet();
    if (missing.isEmpty) return const [];

    // Another page only counts if the question names its topic (section title or terms), not
    // merely a word that happens to appear in its notes (e.g. «جدول»).
    final candidates = [
      for (final h in search.search(question))
        if ((h.pdfPage - pdfPage).abs() > 1 && search.topicTermsOf(h.pdfPage).any(missing.contains)) h,
    ];
    if (candidates.isEmpty || candidates.first.score < minScore) return const [];
    final best = candidates.first.score;
    return [for (final h in candidates) if (h.score >= best * 0.6) h.pdfPage].take(limit).toList();
  }
}
