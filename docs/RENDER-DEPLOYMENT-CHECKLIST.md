# Render Deployment Checklist

This document lists all required environment variables for each service on Render.

## Service-to-Service Communication

The following services need to communicate directly with each other:

### Requests Service → Matching Service

The requests service triggers matching when a user submits a travel request.

**On requests-service in Render:**
```
MATCHING_SERVICE_URL=https://howweplan-matching.onrender.com
INTERNAL_SERVICE_SECRET=<shared-secret-with-matching-service>
```

**On matching-service in Render:**
```
INTERNAL_JWT_SECRET=<same-value-as-INTERNAL_SERVICE_SECRET>
# OR
EVENT_BUS_API_KEY=<same-value-as-INTERNAL_SERVICE_SECRET>
```

### Matching Service → Messaging Service

When an agent accepts a match, the matching service creates a conversation.

**On matching-service in Render:**
```
MESSAGING_SERVICE_URL=https://howweplan-messaging.onrender.com
INTERNAL_API_KEY=<shared-secret-with-messaging-service>
```

**On messaging-service in Render:**
```
INTERNAL_API_KEY=<same-value>
```

## Common Issues

### "User requests not appearing for agents"

This usually means one of:

1. **MATCHING_SERVICE_URL not set**: Requests service can't trigger matching
2. **No agents in database**: Check that agents exist in the `agents` table (not just `agent_profiles`)
3. **Agent not verified/available**: Matching prefers verified agents, but falls back to any

**Debugging steps:**

1. Check requests service logs for "Failed to trigger matching" warnings
2. Query the database:
   ```sql
   -- Check agents exist
   SELECT id, user_id, is_verified, is_available FROM agents;
   
   -- Check matches were created
   SELECT * FROM agent_matches ORDER BY matched_at DESC LIMIT 10;
   ```

### "Agent registration doesn't create agents table entry"

Run the SQL fix script to create entries for existing agents:
```sql
-- Run scripts/add-test-agents.sql in Supabase
```

## Deployment Order

When deploying changes:

1. Deploy **identity-service** first (handles registration)
2. Deploy **matching-service** (handles matching)
3. Deploy **requests-service** (triggers matching)
4. Deploy **messaging-service** (creates conversations)
5. Deploy **api-gateway** last (routes requests)

## Verification

After deployment, verify the flow works:

1. **Check service health:**
   ```bash
   curl https://howweplan-irjf.onrender.com/api/matching/health
   curl https://howweplan-irjf.onrender.com/api/requests/api/v1/health
   ```

2. **Submit a test request as a user**

3. **Check agent-web for the request**

4. **If not appearing, check:**
   - Matching service logs for the request ID
   - Database for `agent_matches` entries
