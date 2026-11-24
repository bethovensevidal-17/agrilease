-- Recompute a subscription's baseline from the listings that existed when it started.
-- Needed because archiving a listing could leave baseline_count higher than the real count.
UPDATE subscriptions s
   SET s.baseline_count = (
         SELECT COUNT(*)
           FROM equipment e
          WHERE e.owner_id = s.owner_id
            AND e.is_archived = 0
            AND e.created_at <= COALESCE(s.start_date, NOW())
       )
 WHERE s.status = 'active'
   AND s.end_date >= NOW();
