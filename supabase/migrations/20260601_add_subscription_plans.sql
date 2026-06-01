CREATE TABLE subscription_plans (
  id          text PRIMARY KEY,
  name        text NOT NULL,
  description text NOT NULL,
  price_usd   int  NOT NULL,
  credits     int  NOT NULL,
  featured    boolean NOT NULL DEFAULT false,
  cta_text    text NOT NULL,
  cta_style   text NOT NULL,
  sort_order  int  NOT NULL DEFAULT 0,
  breakdown   jsonb NOT NULL DEFAULT '[]'
);

INSERT INTO subscription_plans (id, name, description, price_usd, credits, featured, cta_text, cta_style, sort_order, breakdown)
VALUES
  ('starter', 'Starter', 'For first-time AI content creators', 19, 200, false, 'Get started', 'outline', 1,
   '[{"icon":"image","main":"100 image generations","sub":"Nano Banana Pro · 2 credits each"},{"icon":"video","main":"~23 video clips","sub":"Kling 3.0 · ~8.7 credits each"}]'),
  ('plus', 'Plus', 'For consistent and easy AI content creation', 49, 1000, true, 'Get Plus', 'primary', 2,
   '[{"icon":"image","main":"500 image generations","sub":"Nano Banana Pro · 2 credits each"},{"icon":"video","main":"~114 video clips","sub":"Kling 3.0 · ~8.7 credits each"}]');
