import 'dart:async';
import 'dart:io';
import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../content/book.dart';
import '../content/fa_numbers.dart';
import '../content/outline.dart';
import '../progress_store.dart';
import '../tutor/teacher_controller.dart';
import 'math_text.dart';
import 'page_layout.dart';
import 'teacher_panel.dart';

/// The study screen: the whole book as a scrolling column of original pages, each sized to fit
/// the window, with the teacher beside it. When scrolling stops, the reader settles on one page,
/// and that page is the one the teacher answers about. The app runs right-to-left, so the book
/// sits on the right and the teacher on the left.
class ReaderScreen extends StatefulWidget {
  const ReaderScreen({super.key, required this.book, required this.teacher, required this.progress});

  final Book book;
  final TeacherController teacher;
  final ProgressStore progress;

  @override
  State<ReaderScreen> createState() => _ReaderScreenState();
}

class _ReaderScreenState extends State<ReaderScreen> {
  static const _zoomSteps = [0.6, 0.8, 1.0, 1.25, 1.5, 2.0]; // 1.0 = whole page fits the window

  late int _page; // PDF page in view (1-based)
  int? _resumePage; // where the student stopped last time, offered as "continue"
  ScrollController? _scroll; // created with the first layout, at the saved page
  PageLayout? _layout;
  double _viewHeight = 0;
  double _zoom = 1.0;
  final _pageFocus = FocusNode();

  // Snapping: after scrolling stops, settle on one page.
  Timer? _idle;
  late int _snappedPage;
  double _snappedOffset = 0;
  bool _programmatic = false;
  Timer? _save;

  Book get book => widget.book;

  @override
  void initState() {
    super.initState();
    // Always open at the first page; offer to continue from where the student stopped.
    _page = 1;
    final saved = widget.progress.lastPage(book.id);
    if (saved != null && saved > 1 && saved <= book.pageCount) _resumePage = saved;
    _snappedPage = _page;
    widget.teacher.setPage(_page);
  }

  @override
  void dispose() {
    _idle?.cancel();
    _save?.cancel();
    widget.progress.save(book.id, _page);
    _scroll?.dispose();
    _pageFocus.dispose();
    super.dispose();
  }

  PageLayout _layoutFor(BoxConstraints c) {
    final maxWidth = math.max(200.0, c.maxWidth - 48);
    final maxHeight = math.max(200.0, c.maxHeight - 24);
    _viewHeight = c.maxHeight;
    final current = _layout;
    if (current != null && current.maxWidth == maxWidth && current.maxHeight == maxHeight && current.zoom == _zoom) {
      return current;
    }
    final layout = PageLayout.fit(book.pageAspects, maxWidth: maxWidth, maxHeight: maxHeight, zoom: _zoom);
    _layout = layout;
    // Keep the same page in view (on first open: the page the student read last time).
    final offset = layout.offsetToShow(_page, _viewHeight);
    _snappedPage = _page;
    _snappedOffset = offset;
    if (_scroll == null) {
      _scroll = ScrollController(initialScrollOffset: offset)..addListener(_onScroll);
    } else {
      WidgetsBinding.instance.addPostFrameCallback((_) => _jumpTo(offset));
    }
    return layout;
  }

  void _jumpTo(double offset) {
    final scroll = _scroll;
    if (scroll == null || !scroll.hasClients) return;
    _programmatic = true;
    scroll.jumpTo(offset.clamp(0.0, scroll.position.maxScrollExtent));
    _programmatic = false;
  }

  void _onScroll() {
    final scroll = _scroll!, layout = _layout;
    if (layout == null) return;
    _setPage(layout.mostVisible(scroll.offset, _viewHeight));
    if (_programmatic) return;
    _idle?.cancel();
    _idle = Timer(const Duration(milliseconds: 200), _snap);
  }

  /// Settles on one whole page once the student stops scrolling. A small push past the page
  /// turns exactly one page in that direction.
  void _snap() {
    final scroll = _scroll, layout = _layout;
    if (scroll == null || !scroll.hasClients || layout == null) return;
    if (scroll.position.isScrollingNotifier.value) {
      _idle = Timer(const Duration(milliseconds: 150), _snap); // still dragging
      return;
    }
    var target = layout.mostVisible(scroll.offset, _viewHeight);
    final moved = scroll.offset - _snappedOffset;
    if (target == _snappedPage && moved.abs() > 40) {
      target = (_snappedPage + moved.sign.toInt()).clamp(1, book.pageCount);
    }
    _snappedPage = target;
    if (layout.height(target) > _viewHeight) {
      _snappedOffset = scroll.offset; // zoomed in past the window: let the student read freely
      return;
    }
    final offset = layout.offsetToShow(target, _viewHeight);
    _snappedOffset = offset;
    if ((scroll.offset - offset).abs() < 1) return;
    _programmatic = true;
    scroll
        .animateTo(offset, duration: const Duration(milliseconds: 180), curve: Curves.easeOut)
        .whenComplete(() => _programmatic = false);
  }

  /// The page in view changed: update the label, tell the teacher at once, remember it.
  void _setPage(int page) {
    if (page == _page) return;
    setState(() => _page = page);
    widget.teacher.setPage(page);
    _save?.cancel();
    _save = Timer(const Duration(milliseconds: 500), () => widget.progress.save(book.id, _page));
  }

  void _goTo(int page) {
    final target = page.clamp(1, book.pageCount);
    if (target == _resumePage) setState(() => _resumePage = null);
    final layout = _layout;
    _idle?.cancel();
    if (layout != null) {
      final offset = layout.offsetToShow(target, _viewHeight);
      _snappedPage = target;
      _snappedOffset = offset;
      _jumpTo(offset);
    }
    _setPage(target);
  }

  void _setZoom(double zoom) => setState(() => _zoom = zoom);

  String _pageLabel(int pdfPage) {
    final printed = book.printedPageOf(pdfPage);
    final last = book.lastPrintedPage;
    if (printed == null) return 'صفحهٔ ${faNum(pdfPage)} از ${faNum(book.pageCount)} (پی‌دی‌اف)';
    return last == null ? 'صفحهٔ ${faNum(printed)}' : 'صفحهٔ ${faNum(printed)} از ${faNum(last)}';
  }

  Future<void> _askPageNumber() async {
    final controller = TextEditingController();
    final result = await showDialog<int>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('رفتن به صفحه'),
        content: TextField(
          controller: controller,
          autofocus: true,
          keyboardType: TextInputType.number,
          decoration: const InputDecoration(hintText: 'شمارهٔ صفحهٔ کتاب'),
          onSubmitted: (v) => Navigator.pop(context, parseFaInt(v)),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('لغو')),
          FilledButton(onPressed: () => Navigator.pop(context, parseFaInt(controller.text)), child: const Text('برو')),
        ],
      ),
    );
    if (result != null) _goTo(book.pdfPageForPrinted(result));
  }

  /// The book's table of contents: every chapter and section, each one a tap away.
  Future<void> _showContents() async {
    final outline = widget.teacher.builder.outline;
    final current = book.cachedPackage(_page)?.chapter;
    final target = await showDialog<int>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('فهرست کتاب'),
        content: SizedBox(
          width: 520,
          height: 560,
          child: ListView(
            children: [
              for (final OutlineChapter c in outline)
                ExpansionTile(
                  initiallyExpanded: c.chapter.number == current,
                  title: Text('فصل ${faNum(c.chapter.number)}: ${c.chapter.titleFa}'),
                  subtitle: Text('صفحات ${faNum(c.chapter.printedStart)} تا ${faNum(c.chapter.printedEnd)}'),
                  children: [
                    ListTile(dense: true, title: const Text('آغاز فصل'), onTap: () => Navigator.pop(context, c.pdfPage)),
                    for (final s in c.sections)
                      ListTile(
                        dense: true,
                        title: MathText(s.title),
                        trailing: s.printedPage == null ? null : Text(faNum(s.printedPage!)),
                        onTap: () => Navigator.pop(context, s.pdfPage),
                      ),
                  ],
                ),
            ],
          ),
        ),
        actions: [TextButton(onPressed: () => Navigator.pop(context), child: const Text('بستن'))],
      ),
    );
    if (target != null) _goTo(target);
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final chapter = book.chapter(book.cachedPackage(_page)?.chapter);
    return Scaffold(
      appBar: AppBar(
        title: Text(chapter == null
            ? book.titleFa
            : '${book.titleFa} — فصل ${faNum(chapter.number)}: ${chapter.titleFa}'),
        actions: [
          IconButton(tooltip: 'فهرست کتاب', icon: const Icon(Icons.menu_book), onPressed: _showContents),
          IconButton(tooltip: 'رفتن به صفحه', icon: const Icon(Icons.find_in_page), onPressed: _askPageNumber),
        ],
      ),
      body: Row(
        children: [
          Expanded(child: _bookArea(theme)),
          const VerticalDivider(width: 1),
          SizedBox(width: 440, child: TeacherPanel(controller: widget.teacher, onOpenPage: _goTo)),
        ],
      ),
    );
  }

  Widget _bookArea(ThemeData theme) {
    // Dari books turn right-to-left: ← / Page Down go to the next page, → / Page Up to the previous one.
    return CallbackShortcuts(
      bindings: {
        const SingleActivator(LogicalKeyboardKey.arrowLeft): () => _goTo(_page + 1),
        const SingleActivator(LogicalKeyboardKey.pageDown): () => _goTo(_page + 1),
        const SingleActivator(LogicalKeyboardKey.arrowRight): () => _goTo(_page - 1),
        const SingleActivator(LogicalKeyboardKey.pageUp): () => _goTo(_page - 1),
        const SingleActivator(LogicalKeyboardKey.home): () => _goTo(1),
        const SingleActivator(LogicalKeyboardKey.end): () => _goTo(book.pageCount),
      },
      child: Focus(
        focusNode: _pageFocus,
        autofocus: true,
        child: Column(
          children: [
            Expanded(
              child: Container(
                color: theme.colorScheme.surfaceContainerLow,
                child: LayoutBuilder(builder: (context, constraints) {
                  final layout = _layoutFor(constraints);
                  final dpr = MediaQuery.devicePixelRatioOf(context);
                  return Listener(
                    onPointerDown: (_) => _pageFocus.requestFocus(),
                    child: Scrollbar(
                      controller: _scroll,
                      thumbVisibility: true,
                      interactive: true,
                      child: ListView.builder(
                        controller: _scroll,
                        padding: EdgeInsets.zero,
                        itemCount: book.pageCount,
                        itemExtentBuilder: (index, _) => layout.extent(index + 1),
                        itemBuilder: (context, index) => _pageImage(theme, layout, index + 1, dpr),
                      ),
                    ),
                  );
                }),
              ),
            ),
            _bottomBar(),
          ],
        ),
      ),
    );
  }

  Widget _pageImage(ThemeData theme, PageLayout layout, int pdfPage, double dpr) {
    return Align(
      alignment: Alignment.topCenter,
      child: SizedBox(
        width: layout.width(pdfPage),
        height: layout.height(pdfPage),
        child: Material(
          elevation: 2,
          color: Colors.white,
          child: Image.file(
            File(book.imagePath(pdfPage)),
            fit: BoxFit.fill,
            cacheWidth: (layout.width(pdfPage) * dpr).round(),
            gaplessPlayback: true,
            filterQuality: FilterQuality.medium,
            errorBuilder: (context, error, stack) =>
                Center(child: Text('این صفحه باز نشد (${faNum(pdfPage)})', style: theme.textTheme.bodySmall)),
          ),
        ),
      ),
    );
  }

  Widget _bottomBar() {
    final zoomIndex = _zoomSteps.indexOf(_zoom);
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6, horizontal: 8),
      child: Row(
        children: [
          const SizedBox(width: 76), // with the zoom buttons, matches the "continue" slot on the other side
          IconButton(
            tooltip: 'کوچک‌تر',
            onPressed: zoomIndex > 0 ? () => _setZoom(_zoomSteps[zoomIndex - 1]) : null,
            icon: const Icon(Icons.zoom_out),
          ),
          IconButton(
            tooltip: 'تمام صفحه',
            onPressed: _zoom == 1.0 ? null : () => _setZoom(1.0),
            icon: const Icon(Icons.fit_screen),
          ),
          IconButton(
            tooltip: 'بزرگ‌تر',
            onPressed: zoomIndex < _zoomSteps.length - 1 ? () => _setZoom(_zoomSteps[zoomIndex + 1]) : null,
            icon: const Icon(Icons.zoom_in),
          ),
          const Spacer(),
          // chevron_left/right follow the text direction, so in RTL they point outward correctly.
          IconButton(
            tooltip: 'صفحهٔ قبل',
            onPressed: _page > 1 ? () => _goTo(_page - 1) : null,
            icon: const Icon(Icons.chevron_left),
          ),
          TextButton(onPressed: _askPageNumber, child: Text(_pageLabel(_page))),
          IconButton(
            tooltip: 'صفحهٔ بعد',
            onPressed: _page < book.pageCount ? () => _goTo(_page + 1) : null,
            icon: const Icon(Icons.chevron_right),
          ),
          const Spacer(),
          SizedBox(
            width: 220, // balances the zoom buttons so the page controls stay centred
            child: _resumePage == null
                ? null
                : Align(
                    alignment: AlignmentDirectional.centerEnd,
                    child: TextButton.icon(
                      onPressed: () => _goTo(_resumePage!),
                      icon: const Icon(Icons.bookmark),
                      label: Text('ادامه از ${_pageLabel(_resumePage!).split(' از ').first}'),
                    ),
                  ),
          ),
        ],
      ),
    );
  }
}
