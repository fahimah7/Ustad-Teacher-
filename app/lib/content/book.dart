import 'dart:convert';
import 'dart:io';

import 'package:path/path.dart' as p;

class Chapter {
  const Chapter({
    required this.number,
    required this.titleFa,
    required this.printedStart,
    required this.printedEnd,
  });

  final int number;
  final String titleFa;
  final int printedStart;
  final int printedEnd;

  factory Chapter.fromJson(Map<String, dynamic> j) => Chapter(
        number: j['number'] as int,
        titleFa: j['title_fa'] as String,
        printedStart: j['printed_start'] as int,
        printedEnd: j['printed_end'] as int,
      );
}

/// One page package (format: pipeline/PAGE_PACKAGE.md). Thin wrapper over the JSON.
class PagePackage {
  PagePackage(this.json);

  final Map<String, dynamic> json;

  int get pdfPage => json['pdf_page'] as int;
  int? get printedPage => json['printed_page'] as int?;
  int? get chapter => json['chapter'] as int?;
  String? get sectionFa => json['section_fa'] as String?;
  String get summaryFa => json['summary_fa'] as String? ?? '';
  List<String> get keyPoints => _strings('key_points_fa');
  List<Map<String, dynamic>> get formulas => _maps('formulas');
  List<Map<String, dynamic>> get figures => _maps('figures');
  List<Map<String, dynamic>> get workedExamples => _maps('worked_examples');
  List<Map<String, dynamic>> get exercises => _maps('exercises');
  bool get continuesFromPrevious => json['continues_from_previous'] == true;
  bool get continuesOnNext => json['continues_on_next'] == true;

  List<String> _strings(String key) => (json[key] as List? ?? const []).cast<String>();
  List<Map<String, dynamic>> _maps(String key) =>
      (json[key] as List? ?? const []).cast<Map<String, dynamic>>();
}

/// A textbook laid out by pipeline/render_pages.py: page images plus page packages.
class Book {
  Book._(this.dir, this.id, this.titleFa, this.pageCount, this._images, this._aspects, this.chapters);

  final String dir;
  final String id;
  final String titleFa;
  final int pageCount;
  final List<String> _images;
  final List<double> _aspects;
  final List<Chapter> chapters;
  final Map<int, PagePackage> _packages = {};

  static Future<Book> load(String dir) async {
    final j = jsonDecode(await File(p.join(dir, 'book.json')).readAsString()) as Map<String, dynamic>;
    final pages = (j['pages'] as List).cast<Map<String, dynamic>>();
    return Book._(
      dir,
      j['book_id'] as String,
      j['title_fa'] as String? ?? j['book_id'] as String,
      j['page_count'] as int,
      [for (final page in pages) p.join(dir, page['image'] as String)],
      // height / width of each rendered page image (A4 portrait if unknown)
      [for (final page in pages) ((page['height'] as num?) ?? 1414) / ((page['width'] as num?) ?? 1000)],
      [for (final c in (j['chapters'] as List? ?? const [])) Chapter.fromJson(c as Map<String, dynamic>)],
    );
  }

  /// Height / width of every page image, in page order.
  List<double> get pageAspects => _aspects;

  /// The highest page number printed in the book (the last page a student can look up).
  int? get lastPrintedPage {
    int? last;
    for (final pkg in _packages.values) {
      final pp = pkg.printedPage;
      if (pp != null && (last == null || pp > last)) last = pp;
    }
    return last;
  }

  /// Loads every page package up front (they are small) so printed-page lookups are instant.
  Future<void> preloadPackages() async {
    for (var page = 1; page <= pageCount; page++) {
      await package(page);
    }
  }

  String imagePath(int pdfPage) => _images[pdfPage - 1];

  Chapter? chapter(int? number) {
    for (final c in chapters) {
      if (c.number == number) return c;
    }
    return null;
  }

  Future<PagePackage?> package(int pdfPage) async {
    if (pdfPage < 1 || pdfPage > pageCount) return null;
    final cached = _packages[pdfPage];
    if (cached != null) return cached;
    final file = File(p.join(dir, 'packages', '${pdfPage.toString().padLeft(4, '0')}.json'));
    if (!await file.exists()) return null; // not cached: it may be written later during the build
    final pkg = PagePackage(jsonDecode(await file.readAsString()) as Map<String, dynamic>);
    return _packages[pdfPage] = pkg;
  }

  PagePackage? cachedPackage(int pdfPage) => _packages[pdfPage];

  int? printedPageOf(int pdfPage) => _packages[pdfPage]?.printedPage;

  /// PDF page for a printed page number. Uses the page packages; where a page has no printed
  /// number, falls back to the offset of the nearest page that has one.
  int pdfPageForPrinted(int printed) {
    int? bestPdf;
    var bestDistance = 1 << 30;
    for (final pkg in _packages.values) {
      final pp = pkg.printedPage;
      if (pp == null) continue;
      if (pp == printed) return pkg.pdfPage;
      final distance = (pp - printed).abs();
      if (distance < bestDistance) {
        bestDistance = distance;
        bestPdf = pkg.pdfPage + (printed - pp);
      }
    }
    return (bestPdf ?? printed).clamp(1, pageCount);
  }
}
