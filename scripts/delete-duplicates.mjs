const url = 'https://ezkdlwscsexueijshplt.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV6a2Rsd3Njc2V4dWVpanNocGx0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTIxODU0OSwiZXhwIjoyMDg0Nzk0NTQ5fQ.d0QZMnAENLtrlcTcFyPLx-YoBOpa6nYtk9dRuWNukqA';

const res = await fetch(url + '/rest/v1/reports?select=id,identifier,scam_type,created_at,status&order=created_at.asc&limit=1000', {
  headers: { apikey: key, Authorization: 'Bearer ' + key }
});
const data = await res.json();

const idsToDelete = new Set();

// 1. Delete ALL scambuster.co.ke reports (troll entries, all rejected)
for (const r of data) {
  if (r.identifier.toLowerCase().includes('scambuster.co.ke')) {
    idsToDelete.add(r.id);
  }
}

// 2. For every other duplicate group, keep oldest, delete the rest
const groups = {};
for (const r of data) {
  if (r.identifier.toLowerCase().includes('scambuster.co.ke')) continue;
  const groupKey = r.identifier.trim().toLowerCase() + '|' + r.scam_type;
  if (!groups[groupKey]) groups[groupKey] = [];
  groups[groupKey].push(r);
}

for (const rows of Object.values(groups)) {
  if (rows.length < 2) continue;
  // rows are already sorted by created_at asc — keep first, delete rest
  for (const r of rows.slice(1)) {
    idsToDelete.add(r.id);
  }
}

const ids = [...idsToDelete];
console.log(`Deleting ${ids.length} records...`);

// Delete in batches of 20
let deleted = 0;
for (let i = 0; i < ids.length; i += 20) {
  const batch = ids.slice(i, i + 20);
  const delRes = await fetch(url + '/rest/v1/reports?id=in.(' + batch.join(',') + ')', {
    method: 'DELETE',
    headers: { apikey: key, Authorization: 'Bearer ' + key, Prefer: 'return=minimal' }
  });
  if (!delRes.ok) {
    const err = await delRes.text();
    console.error('Delete failed for batch:', err);
    process.exit(1);
  }
  deleted += batch.length;
  console.log(`  Deleted ${deleted}/${ids.length}`);
}

// Verify final count
const countRes = await fetch(url + '/rest/v1/reports?select=id', {
  headers: { apikey: key, Authorization: 'Bearer ' + key, Prefer: 'count=exact', Range: '0-0' }
});
console.log('Done. Remaining reports:', countRes.headers.get('content-range'));
