const _faDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];

/// Formats a non-negative integer with Dari digits (137 → ۱۳۷).
String faNum(int n) => n.toString().split('').map((c) => _faDigits[int.parse(c)]).join();

/// Parses an integer written with Dari, Arabic or Latin digits.
int? parseFaInt(String input) {
  const dari = '۰۱۲۳۴۵۶۷۸۹';
  const arabic = '٠١٢٣٤٥٦٧٨٩';
  final latin = input.trim().split('').map((c) {
    final d = dari.indexOf(c);
    if (d >= 0) return '$d';
    final a = arabic.indexOf(c);
    return a >= 0 ? '$a' : c;
  }).join();
  return int.tryParse(latin);
}
