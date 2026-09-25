import 'book.dart';
import 'fa_numbers.dart';

class OutlineSection {
  const OutlineSection(this.title, this.pdfPage, this.printedPage);

  final String title;
  final int pdfPage;
  final int? printedPage;
}

class OutlineChapter {
  OutlineChapter(this.chapter, this.pdfPage);

  final Chapter chapter;
  final int pdfPage;
  final List<OutlineSection> sections = [];
}

const _teachingKinds = {'content', 'exercises', 'review'};

/// The book's chapters and sections in reading order, built from the page packages.
/// Needs [Book.preloadPackages] to have run.
List<OutlineChapter> buildOutline(Book book) {
  final chapters = <OutlineChapter>[];
  for (var page = 1; page <= book.pageCount; page++) {
    final pkg = book.cachedPackage(page);
    final chapter = book.chapter(pkg?.chapter);
    if (pkg == null || chapter == null) continue;
    if (chapters.isEmpty || chapters.last.chapter.number != chapter.number) {
      chapters.add(OutlineChapter(chapter, page));
    }
    final title = pkg.sectionFa?.trim();
    if (title == null || title.isEmpty || !_teachingKinds.contains(pkg.json['page_kind'])) continue;
    final sections = chapters.last.sections;
    if (sections.isNotEmpty && sections.last.title == title) continue;
    sections.add(OutlineSection(title, page, pkg.printedPage));
  }
  return chapters;
}

/// "[فهرست کتاب]" block for the teacher's prompt. Deterministic, so it stays in the prompt cache.
String outlineText(Book book, List<OutlineChapter> outline) {
  final lines = ['[فهرست کتاب: ${book.titleFa}]'];
  for (final c in outline) {
    final ch = c.chapter;
    lines.add('فصل ${faNum(ch.number)}: ${ch.titleFa} (صفحات ${faNum(ch.printedStart)} تا ${faNum(ch.printedEnd)})');
    for (final s in c.sections) {
      lines.add(s.printedPage == null ? '- ${s.title}' : '- ${s.title} (صفحهٔ ${faNum(s.printedPage!)})');
    }
  }
  return lines.join('\n');
}
