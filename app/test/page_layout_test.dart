import 'package:flutter_test/flutter_test.dart';
import 'package:offline_school/ui/page_layout.dart';

void main() {
  // A landscape cover and three portrait pages in a 500 × 600 window, 16 px gap.
  final layout = PageLayout.fit([0.75, 1.5, 1.5, 1.5], maxWidth: 500, maxHeight: 600);

  test('every page fits whole in the window, keeping its shape', () {
    expect(layout.width(1), 500); // landscape: limited by width
    expect(layout.height(1), 375);
    expect(layout.width(2), 400); // portrait: limited by height
    expect(layout.height(2), 600);
    expect(layout.top(2), 391); // 375 + 16
    expect(layout.top(4), 391 + 2 * 616);
  });

  test('zooming in grows pages but never wider than the window', () {
    final zoomed = PageLayout.fit([1.5], maxWidth: 500, maxHeight: 600, zoom: 2);
    expect(zoomed.width(1), 500);
    expect(zoomed.height(1), 750);
  });

  test('finds the page under a position and the page taking up most of the window', () {
    expect(layout.pageAt(390), 1);
    expect(layout.pageAt(391), 2);
    expect(layout.mostVisible(341, 600), 2); // mostly page 2, a sliver of page 1
    expect(layout.mostVisible(900, 600), 3);
  });

  test('offsetToShow centres a page that fits, within the scroll range', () {
    expect(layout.offsetToShow(2, 700), 341); // 391 - (700 - 600) / 2
    expect(layout.offsetToShow(1, 700), 0); // can't scroll above the book
    expect(layout.offsetToShow(4, 700), layout.totalHeight - 700);
  });
}
