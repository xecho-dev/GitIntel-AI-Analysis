-- migration: add langsmith_trace_id to analysis_history
-- run this in Supabase SQL Editor or via Supabase CLI

ALTER TABLE analysis_history
ADD COLUMN IF NOT EXISTS langsmith_trace_id TEXT;

-- index 加速按 trace_id 查询
CREATE INDEX IF NOT EXISTS idx_analysis_history_langsmith_trace_id
ON analysis_history(langsmith_trace_id);
