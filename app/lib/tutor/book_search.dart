import 'dart:math' as math;

import '../content/book.dart';

class SearchHit {
  const SearchHit(this.pdfPage, this.score);

  final int pdfPage;
  final double score;
}

/// Offline keyword search (BM25) over the page packages, so the teacher can find the right pages
/// anywhere in the book. Needs no model or network, and runs the same way on Android.
/// Needs [Book.preloadPackages] to have run.
class BookSearch {
  BookSearch(this.book) {
    _build();
  }

  final Book book;
  final _docs = <int, Map<String, int>>{}; // pdf page -> term frequencies
  final _topics = <int, Set<String>>{}; // pdf page -> words of its section title, terms and chapter
  final _lengths = <int, int>{};
  final _docFreq = <String, int>{};
  double _avgLength = 1;

  static const _teachingKinds = {'content', 'exercises', 'review'};

  void _build() {
    for (var page = 1; page <= book.pageCount; page++) {
      final pkg = book.cachedPackage(page);
      if (pkg == null || !_teachingKinds.contains(pkg.json['page_kind'])) continue;
      final tf = <String, int>{};
      void add(Object? text, [int weight = 1]) {
        if (text is! String) return;
        for (final t in tokenize(text)) {
          tf[t] = (tf[t] ?? 0) + weight;
        }
      }

      add(pkg.sectionFa, 3);
      add(book.chapter(pkg.chapter)?.titleFa);
      for (final term in (pkg.json['terms'] as List? ?? const [])) {
        add((term as Map)['fa'], 2);
        add(term['en'], 2);
      }
      pkg.keyPoints.forEach(add);
      add(pkg.summaryFa);
      for (final f in pkg.formulas) {
        add(f['meaning_fa']);
      }
      for (final f in pkg.figures) {
        add(f['description_fa']);
      }
      for (final e in [...pkg.workedExamples, ...pkg.exercises]) {
        add(e['problem_fa']);
      }
      if (tf.isEmpty) continue;
      _docs[page] = tf;
      _topics[page] = {
        ...tokenize(pkg.sectionFa ?? ''),
        ...tokenize(book.chapter(pkg.chapter)?.titleFa ?? ''),
        for (final term in (pkg.json['terms'] as List? ?? const [])) ...[
          ...tokenize((term as Map)['fa'] as String? ?? ''),
          ...tokenize(term['en'] as String? ?? ''),
        ],
      };
      _lengths[page] = tf.values.fold(0, (a, b) => a + b);
      for (final t in tf.keys) {
        _docFreq[t] = (_docFreq[t] ?? 0) + 1;
      }
    }
    if (_lengths.isNotEmpty) {
      _avgLength = _lengths.values.reduce((a, b) => a + b) / _lengths.length;
    }
  }

  /// The search terms that occur on [pdfPage] (empty for pages that aren't indexed).
  Set<String> termsOf(int pdfPage) => _docs[pdfPage]?.keys.toSet() ?? const {};

  /// Words naming what [pdfPage] is about: its section title, its terms and its chapter title.
  Set<String> topicTermsOf(int pdfPage) => _topics[pdfPage] ?? const {};

  /// Whether [term] occurs anywhere in the book.
  bool knows(String term) => _docFreq.containsKey(term);

  /// Every page sharing a term with [query], best first.
  List<SearchHit> search(String query) {
    final terms = tokenize(query).toSet();
    final n = _docs.length;
    const k1 = 1.2, b = 0.75;
    final scores = <int, double>{};
    for (final t in terms) {
      final df = _docFreq[t];
      if (df == null) continue;
      final idf = math.log(1 + (n - df + 0.5) / (df + 0.5));
      _docs.forEach((page, tf) {
        final f = tf[t];
        if (f == null) return;
        final norm = f * (k1 + 1) / (f + k1 * (1 - b + b * _lengths[page]! / _avgLength));
        scores[page] = (scores[page] ?? 0) + idf * norm;
      });
    }
    return [for (final e in scores.entries) SearchHit(e.key, e.value)]
      ..sort((a, b) => b.score.compareTo(a.score));
  }
}

final _latexCommand = RegExp(r'\\[a-zA-Z]+');
final _separator = RegExp(r'[^a-z0-9ؠ-يٮ-ۓ]+');

/// Folds Arabic/Persian letter variants, digits and diacritics so that the same word always
/// looks the same; ZWNJ becomes a space so plural/verb affixes split off (انتیگرال‌ها → انتیگرال ها).
String normalizeForSearch(String s) {
  final out = StringBuffer();
  for (final r in s.toLowerCase().replaceAll(_latexCommand, ' ').runes) {
    if (r == 0x064A || r == 0x0649) {
      out.writeCharCode(0x06CC); // ي ى → ی
    } else if (r == 0x0643) {
      out.writeCharCode(0x06A9); // ك → ک
    } else if (r == 0x0629 || r == 0x06C0) {
      out.writeCharCode(0x0647); // ة ۀ → ه
    } else if (r == 0x0623 || r == 0x0625 || r == 0x0671) {
      out.writeCharCode(0x0627); // أ إ ٱ → ا
    } else if ((r >= 0x064B && r <= 0x065F) || r == 0x0670 || r == 0x0640) {
      // diacritics and tatweel: drop
    } else if (r >= 0x06F0 && r <= 0x06F9) {
      out.writeCharCode(0x30 + r - 0x06F0);
    } else if (r >= 0x0660 && r <= 0x0669) {
      out.writeCharCode(0x30 + r - 0x0660);
    } else if (r == 0x200C) {
      out.write(' ');
    } else {
      out.writeCharCode(r);
    }
  }
  return out.toString();
}

/// Search tokens: normalized words minus stopwords and bare numbers, with plural suffixes stripped.
List<String> tokenize(String text) {
  final tokens = <String>[];
  for (final raw in normalizeForSearch(text).split(_separator)) {
    if (raw.length < 2 || _stopwords.contains(raw) || RegExp(r'^[0-9]+$').hasMatch(raw)) continue;
    final t = _stem(raw);
    if (!_stopwords.contains(t)) tokens.add(t);
  }
  return tokens;
}

String _stem(String t) {
  for (final suffix in const ['های', 'ها', 'ات']) {
    if (t.length > suffix.length + 2 && t.endsWith(suffix)) return t.substring(0, t.length - suffix.length);
  }
  return t;
}

// Function words, question words and words that appear on nearly every page (in normalized form).
const _stopwords = {
  'و', 'در', 'به', 'از', 'که', 'این', 'ان', 'آن', 'را', 'با', 'است', 'اند', 'هست', 'هستند', 'بود', 'برای',
  'یک', 'یا', 'تا', 'بر', 'هم', 'نیز', 'می', 'شود', 'شده', 'شد', 'کنید', 'کند', 'کنیم', 'کنم', 'کرد',
  'کردن', 'کنند', 'باید', 'اگر', 'هر', 'چه', 'چی', 'چطور', 'چگونه', 'چرا', 'کجا', 'کدام', 'آیا', 'ایا',
  'لطفا', 'بدهید', 'بگویید', 'بده', 'بگو', 'توضیح', 'دهید', 'دهم', 'ساده', 'صفحه', 'صفحات', 'کتاب',
  'درس', 'مورد', 'باره', 'بارهٔ', 'درباره', 'ما', 'شما', 'من', 'او', 'ها', 'های', 'ای', 'یعنی', 'چیست',
  'چیه', 'چند', 'دارد', 'دارند', 'داریم', 'دیگر', 'همین', 'اینجا', 'آنجا', 'میشود', 'بفهمم', 'نمیفهمم',
  'فهمیدم', 'حل', 'سوال', 'سوالی', 'مثال', 'تمرین', 'فصل', 'اول', 'دوم', 'سوم', 'چهارم', 'پنجم', 'ششم',
  'هفتم', 'هشتم', 'بپرسید', 'بیشتر', 'خوب', 'بخش', 'قسمت', 'مطلب', 'چیزی', 'وقتی', 'چون', 'پس', 'اما',
  'ولی', 'نه', 'بلی', 'باشد', 'میتوانم', 'میتوان', 'توانم', 'نشان', 'میدهد', 'دهد', 'داده', 'خوانم',
  'بخوانم', 'میگوید', 'گوید', 'چیزهایی', 'موضوع', 'the', 'of', 'and', 'is', 'to', 'in', 'what',
  // Common phrasing in questions ("به زبان ساده", "به دست آمد", "شکل پایین صفحه", "قدم به قدم").
  'زبان', 'دست', 'آمد', 'آمده', 'آید', 'آورد', 'آورده', 'آوردن', 'کار', 'برد', 'بردن', 'برده', 'گرفت',
  'گرفته', 'گیرد', 'شوند', 'بشود', 'حساب', 'شکل', 'پایین', 'بالا', 'نوشته', 'فهم', 'کمک', 'راه', 'روش',
  'مرحله', 'قدم', 'بعدی', 'قبلی', 'همه', 'کل',
};
