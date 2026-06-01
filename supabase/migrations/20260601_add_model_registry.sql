-- ai_models: registry of all AI models available in the system
CREATE TABLE ai_models (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text NOT NULL,
  provider        text NOT NULL,
  model_id        text NOT NULL,
  category        text NOT NULL,
  enabled         boolean NOT NULL DEFAULT true,
  sort_order      int NOT NULL DEFAULT 0,
  api_key_env     text NOT NULL,
  api_secret_env  text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- model_pricing: credit costs per model x quality
CREATE TABLE model_pricing (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id    uuid NOT NULL REFERENCES ai_models(id) ON DELETE CASCADE,
  quality     text NOT NULL,
  credits     int NOT NULL,
  unit        text NOT NULL,
  cost_usd    numeric(10,4) NOT NULL
);

-- Seed: image models
INSERT INTO ai_models (name, provider, model_id, category, enabled, sort_order, api_key_env)
VALUES
  ('Nano Banana 2', 'google', 'gemini-3.1-flash-image-preview', 'image', true, 1, 'GOOGLE_AI_API_KEY'),
  ('GPT-image-2',   'openai', 'gpt-image-2',                   'image', false, 2, 'OPENAI_API_KEY'),
  ('Qwen 2.0 Pro',  'alibaba','qwen-vl-plus',                  'image', false, 3, 'QWEN_API_KEY');

-- Seed: video models
INSERT INTO ai_models (name, provider, model_id, category, enabled, sort_order, api_key_env, api_secret_env)
VALUES
  ('Kling v3', 'kling', 'kling-v3', 'video', true, 1, 'KLING_ACCESS_KEY_ID', 'KLING_ACCESS_KEY_SECRET');

-- Seed: image pricing
INSERT INTO model_pricing (model_id, quality, credits, unit, cost_usd)
SELECT id, '1K', 2, 'per_image', 0.067 FROM ai_models WHERE name = 'Nano Banana 2'
UNION ALL
SELECT id, '2K', 3, 'per_image', 0.101 FROM ai_models WHERE name = 'Nano Banana 2'
UNION ALL
SELECT id, '4K', 4, 'per_image', 0.151 FROM ai_models WHERE name = 'Nano Banana 2'
UNION ALL
SELECT id, '1K', 1, 'per_image', 0.030 FROM ai_models WHERE name = 'GPT-image-2'
UNION ALL
SELECT id, '2K', 2, 'per_image', 0.045 FROM ai_models WHERE name = 'GPT-image-2'
UNION ALL
SELECT id, '4K', 3, 'per_image', 0.060 FROM ai_models WHERE name = 'GPT-image-2'
UNION ALL
SELECT id, '2K', 3, 'per_image', 0.075 FROM ai_models WHERE name = 'Qwen 2.0 Pro';

-- Seed: video pricing
INSERT INTO model_pricing (model_id, quality, credits, unit, cost_usd)
SELECT id, '720p',  3, 'per_second', 0.084 FROM ai_models WHERE name = 'Kling v3'
UNION ALL
SELECT id, '1080p', 4, 'per_second', 0.112 FROM ai_models WHERE name = 'Kling v3';
