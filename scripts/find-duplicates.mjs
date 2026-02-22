const url = 'https://ezkdlwscsexueijshplt.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV6a2Rsd3Njc2V4dWVpanNocGx0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTIxODU0OSwiZXhwIjoyMDg0Nzk0NTQ5fQ.d0QZMnAENLtrlcTcFyPLx-YoBOpa6nYtk9dRuWNukqA';

const res = await fetch(url + '/rest/v1/reports?select=id,identifier,scam_type,description,created_at,status&order=created_at.asc&limit=1000', {
  headers: { apikey: key, Authorization: 'Bearer ' + key }
});
const data = await res.json();

// Group by identifier+scam_type to find duplicates
const groups = {};
for (const r of data) {
  const groupKey = r.identifier.trim().toLowerCase() + '|' + r.scam_type;
  if (!groups[groupKey]) groups[groupKey] = [];
  groups[groupKey].push(r);
}

const duplicates = Object.entries(groups).filter(([, rows]) => rows.length > 1);
console.log('Total reports:', data.length);
console.log('Unique identifier+type combos:', Object.keys(groups).length);
console.log('Combos with duplicates:', duplicates.length);
console.log('');

let totalToDelete = 0;
for (const [combo, rows] of duplicates) {
  console.log(`  [${rows.length}x] ${combo}`);
  rows.forEach(r => console.log(`       ${r.id.slice(0,8)} ${r.created_at.slice(0,10)} ${r.status} | ${r.description.slice(0,60)}`));
  totalToDelete += rows.length - 1; // keep oldest, delete the rest
}

console.log('');
console.log(`Would keep: ${data.length - totalToDelete} reports`);
console.log(`Would delete: ${totalToDelete} duplicates`);
