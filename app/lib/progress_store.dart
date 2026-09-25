import 'dart:convert';
import 'dart:io';

import 'package:path/path.dart' as p;

/// Remembers the last page read in each book. Only page numbers are stored — never the
/// conversation or anything that identifies the student.
class ProgressStore {
  ProgressStore._(this._file, this._pages);

  final File _file;
  final Map<String, int> _pages;

  /// Opens the store in %APPDATA%\offline_school (or [file], for tests).
  static Future<ProgressStore> open({File? file}) async {
    final base = Platform.environment['APPDATA'] ?? Directory.systemTemp.path;
    file ??= File(p.join(base, 'offline_school', 'progress.json'));
    var pages = <String, int>{};
    try {
      if (await file.exists()) {
        pages = (jsonDecode(await file.readAsString()) as Map<String, dynamic>)
            .map((key, value) => MapEntry(key, value as int));
      }
    } catch (_) {
      // A corrupt progress file must not stop the book from opening; start fresh.
    }
    return ProgressStore._(file, pages);
  }

  int? lastPage(String bookId) => _pages[bookId];

  Future<void> save(String bookId, int pdfPage) async {
    _pages[bookId] = pdfPage;
    await _file.parent.create(recursive: true);
    await _file.writeAsString(jsonEncode(_pages));
  }
}
