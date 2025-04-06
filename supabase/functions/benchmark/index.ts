import express from 'npm:express@4.18.2';
import { createClient } from 'npm:@supabase/supabase-js@2.39.7';

const app = express();
app.use(express.json());

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

app.options('*', (req, res) => {
  res.setHeader('Access-Control-Allow-Methods', 'POST');
  res.setHeader('Access-Control-Max-Age', '86400');
  res.setHeader('Access-Control-Allow-Headers', 'authorization, x-client-info, apikey, content-type');
  res.status(204).send('');
});

app.post('/benchmark', async (req, res) => {
  try {
    const { modelId } = req.body;
    if (!modelId) {
      return res.status(400).json({ error: 'Model ID is required' });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Simulate benchmarking process
    const benchmarkResults = {
      accuracy: Math.random() * 20 + 80, // 80-100%
      inference_time: Math.random() * 50 + 10, // 10-60ms
      memory_usage: Math.random() * 512 * 1024 * 1024, // 0-512MB
    };

    const { error } = await supabase
      .from('models')
      .update({ benchmark_results: benchmarkResults })
      .eq('id', modelId);

    if (error) throw error;

    res.json({ success: true, results: benchmarkResults });
  } catch (error) {
    console.error('Benchmark error:', error);
    res.status(500).json({ error: 'Failed to benchmark model' });
  }
});

Deno.serve(app);