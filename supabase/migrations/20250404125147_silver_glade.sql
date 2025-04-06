/*
  # Create models table for AI model benchmarking

  1. New Tables
    - `models`
      - `id` (bigint, primary key)
      - `user_id` (uuid, references auth.users)
      - `name` (text, model name)
      - `file_path` (text, path in storage)
      - `format` (text, file format)
      - `size` (bigint, file size in bytes)
      - `benchmark_results` (jsonb, benchmark metrics)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `models` table
    - Add policies for authenticated users to:
      - Read their own models
      - Create new models
      - Update their own models
*/

CREATE TABLE models (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  name text NOT NULL,
  file_path text NOT NULL,
  format text NOT NULL,
  size bigint NOT NULL,
  benchmark_results jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE models ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own models"
  ON models
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create models"
  ON models
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own models"
  ON models
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);