import 'dart:math' as math;

/// Where every page sits in the scrolling reader. Each page is sized to fit whole inside the
/// window (then scaled by [zoom], never wider than the window), keeping its own shape.
class PageLayout {
  PageLayout.fit(
    List<double> aspects, {
    required this.maxWidth,
    required this.maxHeight,
    this.zoom = 1,
    this.gap = 16,
  }) {
    var y = 0.0;
    for (final aspect in aspects) {
      final w = math.min(math.min(maxWidth, maxHeight / aspect) * zoom, maxWidth);
      final h = w * aspect;
      _tops.add(y);
      _widths.add(w);
      _heights.add(h);
      y += h + gap;
    }
    totalHeight = y;
  }

  final double maxWidth;
  final double maxHeight;
  final double zoom;
  final double gap;
  final _tops = <double>[];
  final _widths = <double>[];
  final _heights = <double>[];
  late final double totalHeight;

  int get pageCount => _tops.length;

  /// Distance from the top of the book to the top of [pdfPage] (1-based).
  double top(int pdfPage) => _tops[pdfPage - 1];

  double width(int pdfPage) => _widths[pdfPage - 1];

  double height(int pdfPage) => _heights[pdfPage - 1];

  /// Height the page occupies in the list, including the gap below it.
  double extent(int pdfPage) => _heights[pdfPage - 1] + gap;

  /// The page (1-based) under the vertical position [y].
  int pageAt(double y) {
    var lo = 0, hi = _tops.length - 1;
    while (lo < hi) {
      final mid = (lo + hi + 1) ~/ 2;
      if (_tops[mid] <= y) {
        lo = mid;
      } else {
        hi = mid - 1;
      }
    }
    return lo + 1;
  }

  /// The page that takes up most of the window showing [viewTop] .. [viewTop] + [viewHeight].
  int mostVisible(double viewTop, double viewHeight) {
    final first = pageAt(viewTop), last = pageAt(viewTop + viewHeight);
    var best = first;
    var bestOverlap = -1.0;
    for (var page = first; page <= last; page++) {
      final overlap = math.min(top(page) + height(page), viewTop + viewHeight) - math.max(top(page), viewTop);
      if (overlap > bestOverlap) {
        best = page;
        bestOverlap = overlap;
      }
    }
    return best;
  }

  /// Scroll offset that shows [pdfPage] whole and centred in a window [viewHeight] tall
  /// (or its top, if the page is taller than the window), kept within the scrollable range.
  double offsetToShow(int pdfPage, double viewHeight) {
    final h = height(pdfPage);
    final offset = h <= viewHeight ? top(pdfPage) - (viewHeight - h) / 2 : top(pdfPage);
    return offset.clamp(0.0, math.max(0.0, totalHeight - viewHeight));
  }
}
