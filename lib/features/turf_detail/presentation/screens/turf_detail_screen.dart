import 'package:flutter/material.dart';
class TurfDetailScreen extends StatelessWidget {
  final String turfId;
  const TurfDetailScreen({super.key, required this.turfId});
  @override
  Widget build(BuildContext context) => const Scaffold(body: Center(child: Text('Turf Detail')));
}
