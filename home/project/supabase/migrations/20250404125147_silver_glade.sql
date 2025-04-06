/*
  # Create models table and storage configuration

  1. New Tables
    - `models`
      - `id` (bigint, primary key)
      - `name` (text, model name)
      - `file_path` (text, path in storage)
      - `format` (text, file format)
      - `size` (bigint, file size in bytes)
      - `benchmark_results` (jsonb, benchmark metrics)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `models` table
    - Add policy for public access
    - Create storage bucket for models
    - Add storage policies
*/

-- Create the models table
CREATE TABLE models (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  name text NOT NULL,
  file_path text NOT NULL,
  format text NOT NULL,
  size bigint NOT NULL,
  benchmark_results jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS and create policies for the models table
ALTER TABLE models ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read all models"
  ON models
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Public can create models"
  ON models
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Public can update models"
  ON models
  FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

-- Create storage bucket for models
INSERT INTO storage.buckets (id, name, public) 
VALUES ('models', 'models', true);

-- Create storage policies
CREATE POLICY "Public can upload models"
  ON storage.objects
  FOR INSERT
  TO public
  WITH CHECK (bucket_id = 'models');

CREATE POLICY "Public can download models"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'models');