/// Date, time, and currency formatters for TurfX.
class Formatters {
  Formatters._();

  /// Formats price in INR: ₹1,200
  static String price(double amount) {
    final formatted = amount.toStringAsFixed(0);
    // Add comma separators for Indian numbering
    final parts = formatted.split('.');
    String intPart = parts[0];
    String result = '';
    int count = 0;

    for (int i = intPart.length - 1; i >= 0; i--) {
      count++;
      result = intPart[i] + result;
      if (count == 3 && i != 0) {
        result = ',$result';
        count = 0;
      }
    }

    return '₹$result';
  }

  /// Formats duration: "1h 30m"
  static String duration(int minutes) {
    if (minutes < 60) return '${minutes}m';
    final hours = minutes ~/ 60;
    final mins = minutes % 60;
    if (mins == 0) return '${hours}h';
    return '${hours}h ${mins}m';
  }

  /// Formats distance: "1.2 km" or "500 m"
  static String distance(double meters) {
    if (meters < 1000) return '${meters.toInt()} m';
    return '${(meters / 1000).toStringAsFixed(1)} km';
  }

  /// Formats rating: "4.5"
  static String rating(double value) {
    return value.toStringAsFixed(1);
  }

  /// Formats count: "1.2K", "3.4M"
  static String compactCount(int count) {
    if (count < 1000) return count.toString();
    if (count < 1000000) return '${(count / 1000).toStringAsFixed(1)}K';
    return '${(count / 1000000).toStringAsFixed(1)}M';
  }

  /// Formats time slot: "09:00 AM - 10:00 AM"
  static String timeSlot(DateTime start, DateTime end) {
    String formatTime(DateTime dt) {
      final hour12 =
          dt.hour > 12 ? dt.hour - 12 : (dt.hour == 0 ? 12 : dt.hour);
      final period = dt.hour >= 12 ? 'PM' : 'AM';
      final minuteStr = dt.minute.toString().padLeft(2, '0');
      return '$hour12:$minuteStr $period';
    }

    return '${formatTime(start)} - ${formatTime(end)}';
  }
}
