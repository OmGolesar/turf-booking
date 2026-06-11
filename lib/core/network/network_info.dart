/// Network connectivity checker for TurfX.
///
/// Provides a simple abstraction to check if the device
/// has an active internet connection before making API calls.
///
/// Will be implemented with `connectivity_plus` in Step 2.
abstract class NetworkInfo {
  /// Returns `true` if the device has an active internet connection.
  Future<bool> get isConnected;
}

// TODO: Implement in Step 2
// class NetworkInfoImpl implements NetworkInfo {
//   final Connectivity connectivity;
//
//   NetworkInfoImpl(this.connectivity);
//
//   @override
//   Future<bool> get isConnected async {
//     final result = await connectivity.checkConnectivity();
//     return result != ConnectivityResult.none;
//   }
// }
