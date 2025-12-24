-- Enable RLS on remaining tables
ALTER TABLE perf_ad_group_daily ENABLE ROW LEVEL SECURITY;

-- Create policy function for workspace isolation
CREATE OR REPLACE FUNCTION current_workspace_id()
RETURNS UUID AS $$
  SELECT NULLIF(current_setting('app.workspace_id', true), '')::UUID;
$$ LANGUAGE SQL SECURITY DEFINER;

-- Workspaces: users can see workspaces they are members of
CREATE POLICY workspace_member_access ON workspaces
  FOR ALL
  USING (
    current_setting('app.role', true) = 'service' OR
    id IN (SELECT workspace_id FROM workspace_memberships WHERE user_id = current_setting('app.user_id', true)::UUID)
  );

-- Clients: workspace isolation
CREATE POLICY client_workspace_isolation ON clients
  FOR ALL
  USING (
    current_setting('app.role', true) = 'service' OR
    workspace_id = current_workspace_id()
  );

-- Integrations: workspace isolation
CREATE POLICY integration_workspace_isolation ON integrations
  FOR ALL
  USING (
    current_setting('app.role', true) = 'service' OR
    workspace_id = current_workspace_id()
  );

-- Integration credentials: via integration -> workspace
CREATE POLICY credential_workspace_isolation ON integration_credentials
  FOR ALL
  USING (
    current_setting('app.role', true) = 'service' OR
    integration_id IN (SELECT id FROM integrations WHERE workspace_id = current_workspace_id())
  );

-- Ad accounts: workspace isolation
CREATE POLICY ad_account_workspace_isolation ON ad_accounts
  FOR ALL
  USING (
    current_setting('app.role', true) = 'service' OR
    workspace_id = current_workspace_id()
  );

-- Campaigns: workspace isolation
CREATE POLICY campaign_workspace_isolation ON campaigns
  FOR ALL
  USING (
    current_setting('app.role', true) = 'service' OR
    workspace_id = current_workspace_id()
  );

-- Ad groups: workspace isolation
CREATE POLICY adgroup_workspace_isolation ON ad_groups
  FOR ALL
  USING (
    current_setting('app.role', true) = 'service' OR
    workspace_id = current_workspace_id()
  );

-- Ads: workspace isolation
CREATE POLICY ad_workspace_isolation ON ads
  FOR ALL
  USING (
    current_setting('app.role', true) = 'service' OR
    workspace_id = current_workspace_id()
  );

-- Performance metrics: workspace isolation
CREATE POLICY perf_campaign_workspace_isolation ON perf_campaign_daily
  FOR ALL
  USING (
    current_setting('app.role', true) = 'service' OR
    workspace_id = current_workspace_id()
  );

CREATE POLICY perf_adgroup_workspace_isolation ON perf_ad_group_daily
  FOR ALL
  USING (
    current_setting('app.role', true) = 'service' OR
    workspace_id = current_workspace_id()
  );

CREATE POLICY perf_ad_workspace_isolation ON perf_ad_daily
  FOR ALL
  USING (
    current_setting('app.role', true) = 'service' OR
    workspace_id = current_workspace_id()
  );

-- Sync jobs: workspace isolation
CREATE POLICY sync_job_workspace_isolation ON sync_jobs
  FOR ALL
  USING (
    current_setting('app.role', true) = 'service' OR
    workspace_id = current_workspace_id()
  );

-- Sync logs: via job -> workspace
CREATE POLICY sync_log_workspace_isolation ON sync_logs
  FOR ALL
  USING (
    current_setting('app.role', true) = 'service' OR
    job_id IN (SELECT id FROM sync_jobs WHERE workspace_id = current_workspace_id())
  );
