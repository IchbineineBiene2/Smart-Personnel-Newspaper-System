-- Migration: Add custom_tags to user_preferences
ALTER TABLE user_preferences ADD COLUMN custom_tags TEXT[] DEFAULT '{}';
