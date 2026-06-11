/// Pagination model for TurfX.
///
/// Tracks pagination state for infinite scrolling lists.
class Pagination<T> {
  final List<T> items;
  final int currentPage;
  final int totalPages;
  final int totalItems;
  final bool hasMore;

  const Pagination({
    required this.items,
    required this.currentPage,
    required this.totalPages,
    required this.totalItems,
    required this.hasMore,
  });

  factory Pagination.fromJson(
    Map<String, dynamic> json,
    T Function(Map<String, dynamic>) fromJsonT,
  ) {
    final itemsList = (json['items'] as List<dynamic>?)
            ?.map((e) => fromJsonT(e as Map<String, dynamic>))
            .toList() ??
        [];

    return Pagination(
      items: itemsList,
      currentPage: json['current_page'] as int? ?? 1,
      totalPages: json['total_pages'] as int? ?? 1,
      totalItems: json['total_items'] as int? ?? 0,
      hasMore: json['has_more'] as bool? ?? false,
    );
  }

  /// Creates an empty pagination.
  factory Pagination.empty() {
    return const Pagination(
      items: [],
      currentPage: 1,
      totalPages: 1,
      totalItems: 0,
      hasMore: false,
    );
  }

  /// Creates a new pagination with appended items (for infinite scroll).
  Pagination<T> copyWithAppended(Pagination<T> next) {
    return Pagination(
      items: [...items, ...next.items],
      currentPage: next.currentPage,
      totalPages: next.totalPages,
      totalItems: next.totalItems,
      hasMore: next.hasMore,
    );
  }
}
