import 'package:flutter/material.dart';

/// Reusable auth form widget for TurfX.
///
/// Wraps form fields for login/signup with validation.
class AuthForm extends StatelessWidget {
  final GlobalKey<FormState> formKey;
  final List<Widget> children;
  final VoidCallback? onSubmit;

  const AuthForm({
    super.key,
    required this.formKey,
    required this.children,
    this.onSubmit,
  });

  @override
  Widget build(BuildContext context) {
    // TODO: Implement in Step 4
    return Form(
      key: formKey,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: children,
      ),
    );
  }
}
