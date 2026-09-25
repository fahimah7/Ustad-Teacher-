/// Rewrites Iranian-Persian terms that the small model slips into, using the Dari terms of the
/// Afghan textbooks. Only unambiguous words and phrases are listed — e.g. a bare «حد» is left
/// alone because «تا حدی» is ordinary Dari; the prompt handles those cases.
const _words = <String, String>{
  'فرمول': 'فورمول',
  'اطلاعات': 'معلومات',
  'انتگرال': 'انتیگرال',
  'دنباله': 'ترادف',
  'بازه': 'انتروال',
  'دانش‌آموز': 'شاگرد',
  'دانش‌آموزان': 'شاگردان',
  'ریاضیات': 'ریاضی',
  'لگاریتم': 'لوگاریتم',
  'لگاریتمی': 'لوگاریتمی',
  'پیوستگی': 'متمادیت',
};

const _phrases = <String, String>{
  'تابع گویا': 'تابع نسبتی',
  'توابع گویا': 'توابع نسبتی',
  'تابع نمایی': 'تابع اکسپوننشیل',
  'توابع نمایی': 'توابع اکسپوننشیل',
  'تابع پیوسته': 'تابع متمادی',
  'توابع پیوسته': 'توابع متمادی',
  'مقدار تابع': 'قیمت تابع',
  'حد تابع': 'لیمت تابع',
  'حد ترادف': 'لیمت ترادف',
  'حد چپ': 'لیمت طرف چپ',
  'حد راست': 'لیمت طرف راست',
};

final RegExp _pattern = () {
  final keys = [..._phrases.keys, ..._words.keys]..sort((a, b) => b.length.compareTo(a.length));
  final body = keys.map((k) => RegExp.escape(k).replaceAll(' ', r'\s+')).join('|');
  // Whole words only: no Arabic-script letter (or ZWNJ) before, no letter after.
  // A ZWNJ after is allowed so suffixes survive: فرمول‌ها → فورمول‌ها.
  return RegExp('(?<![\\u0600-\\u06FF\\u200C])($body)(?![\\u0600-\\u06FF])');
}();

String _key(String match) => match.replaceAll(RegExp(r'\s+'), ' ');

/// Replaces Iranian terms with the textbook's Dari terms.
String toBookDari(String text) =>
    text.replaceAllMapped(_pattern, (m) => _phrases[_key(m[1]!)] ?? _words[_key(m[1]!)] ?? m[1]!);

/// The Iranian terms found in [text] (for evaluation).
Set<String> iranianTermsIn(String text) => {for (final m in _pattern.allMatches(text)) _key(m[1]!)};
