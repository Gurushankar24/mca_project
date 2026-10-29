const Database = require('better-sqlite3');
const path = require('path');
const db = new Database(process.argv[2] || path.join(__dirname, 'data', 'app.db'), { readonly: true });

console.log('\n1) TABLE COUNTS');
console.table(db.prepare(`
  SELECT 'employees' t, COUNT(*) c FROM employees UNION ALL
  SELECT 'users', COUNT(*) FROM users UNION ALL
  SELECT 'attendance', COUNT(*) FROM attendance UNION ALL
  SELECT 'leaves', COUNT(*) FROM leaves UNION ALL
  SELECT 'ratings', COUNT(*) FROM ratings UNION ALL
  SELECT 'ground_truth', COUNT(*) FROM ground_truth`).all());

console.log('\n2) INJECTED ANOMALIES');
console.table(db.prepare(`
  SELECT g.anomaly_type, e.name, e.department, e.manager_id
  FROM ground_truth g JOIN employees e ON e.id = g.employee_id
  ORDER BY e.department`).all());

console.log('\n3) LAST 30 DAYS: injected types vs normal employees (averages)');
console.table(db.prepare(`
  SELECT COALESCE(g.anomaly_type,'normal') AS grp, COUNT(*) AS n,
    ROUND(AVG(s.delay),1) AS avg_delay, ROUND(AVG(s.late),1) AS late,
    ROUND(AVG(s.lv),1) AS leaves, ROUND(AVG(s.ab),1) AS absent, ROUND(AVG(s.ot),1) AS overtime
  FROM (SELECT employee_id,
      AVG(CASE WHEN check_in IS NOT NULL THEN CAST(substr(check_in,1,2) AS INT)*60 + CAST(substr(check_in,4,2) AS INT) - 540 END) AS delay,
      SUM(status='late') AS late, SUM(status='leave') AS lv, SUM(status='absent') AS ab, SUM(overtime_hours) AS ot
    FROM attendance WHERE date > date((SELECT MAX(date) FROM attendance), '-30 day')
    GROUP BY employee_id) s
  JOIN employees e ON e.id = s.employee_id
  LEFT JOIN ground_truth g ON g.employee_id = e.id
  WHERE e.manager_id IS NOT NULL
  GROUP BY grp ORDER BY grp`).all());