export async function upWithPool(pool) {
  // Create a function to sync ai_insight from analysis_details to analysis_history
  await pool.query(`
    CREATE OR REPLACE FUNCTION public.sync_ai_insight_to_history()
    RETURNS trigger AS $$
    BEGIN
      IF NEW.ai_insight IS NOT NULL THEN
        UPDATE analysis_history
        SET ai_insight = COALESCE(analysis_history.ai_insight, NEW.ai_insight)
        WHERE id = NEW.analysis_id;
      END IF;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    -- Create trigger that fires after insert or update on analysis_details
    DROP TRIGGER IF EXISTS tg_sync_ai_insight ON analysis_details;
    CREATE TRIGGER tg_sync_ai_insight
    AFTER INSERT OR UPDATE ON analysis_details
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_ai_insight_to_history();
  `);
}
