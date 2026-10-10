import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/constants/app_config.dart';

/// Home screen - Join meeting interface
/// TODO: Implement full functionality in Task 3
class HomeScreen extends ConsumerWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      appBar: AppBar(
        title: const Text(AppConfig.appName),
      ),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              // App logo placeholder
              Icon(
                Icons.video_call,
                size: 100,
                color: Theme.of(context).colorScheme.primary,
              ),
              const SizedBox(height: 32),
              
              // Title
              Text(
                'Join a Meeting',
                style: Theme.of(context).textTheme.headlineMedium,
              ),
              const SizedBox(height: 16),
              
              // Subtitle
              Text(
                'Enter your meeting code to join',
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: Colors.grey,
                ),
              ),
              const SizedBox(height: 32),
              
              // Meeting code input (placeholder)
              TextField(
                decoration: const InputDecoration(
                  labelText: 'Meeting Code',
                  hintText: 'Enter 6-character code',
                  border: OutlineInputBorder(),
                  prefixIcon: Icon(Icons.meeting_room),
                ),
                textCapitalization: TextCapitalization.characters,
                maxLength: AppConfig.meetingCodeLength,
              ),
              const SizedBox(height: 24),
              
              // Join button (placeholder)
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: () {
                    // TODO: Implement join logic in Task 3
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(
                        content: Text('Join functionality coming in Task 3!'),
                      ),
                    );
                  },
                  style: ElevatedButton.styleFrom(
                    padding: const EdgeInsets.all(16),
                  ),
                  child: const Text('Join Meeting'),
                ),
              ),
              
              const SizedBox(height: 48),
              
              // Status indicator
              Text(
                'Task 2 Complete ✅\nAPI Client & Models Ready',
                textAlign: TextAlign.center,
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  color: Colors.green,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
