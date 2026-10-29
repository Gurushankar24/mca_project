import bcrypt from 'bcryptjs';
import { db, schemaSql } from '../db/connection.js';

type Department = 'Engineering' | 'Sales' | 'Support' | 'Operations';
type Role = 'hr' | 'manager' | 'employee';
type AnomalyType =
  | 'chronic_late'
  | 'leave_spike'
  | 'extreme_overtime'
  | 'weekend_leaves'
  | 'mixed';

interface PersonSeed {
  firstName: string;
  lastName: string;
  email: string;
  department: Department | 'HR';
  jobTitle: string;
  role: Role;
  managerDepartment?: Department;
  anomalyType?: AnomalyType;
}

interface SeedDay {
  date: Date;
  dateText: string;
  offsetFromToday: number;
}

const SEED = 2026;
const WINDOW_DAYS = 120;
const PASSWORD = 'Pass@123';
const departments: Department[] = ['Engineering', 'Sales', 'Support', 'Operations'];

// Mulberry32 gives the seed script a small repeatable random number generator.
function createRandom(seed: number): () => number {
  let state = seed >>> 0;

  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

const random = createRandom(SEED);

function randomInt(min: number, max: number): number {
  return min + Math.floor(random() * (max - min + 1));
}

// Box-Muller converts seeded uniform values into a normal distribution.
function normalRandom(mean: number, standardDeviation: number): number {
  const first = Math.max(random(), Number.EPSILON);
  const second = random();
  const standardNormal = Math.sqrt(-2 * Math.log(first)) * Math.cos(2 * Math.PI * second);
  return mean + standardNormal * standardDeviation;
}

function sample<T>(values: T[], count: number): T[] {
  const shuffled = [...values];
  const sampleSize = Math.min(count, shuffled.length);

  for (let index = 0; index < sampleSize; index += 1) {
    const swapIndex = randomInt(index, shuffled.length - 1);
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }

  return shuffled.slice(0, sampleSize);
}

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatTime(totalMinutes: number): string {
  const normalizedMinutes = ((totalMinutes % 1440) + 1440) % 1440;
  const hours = Math.floor(normalizedMinutes / 60);
  const minutes = normalizedMinutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

function getSeedDays(today: Date): SeedDay[] {
  const calendarDays: SeedDay[] = [];
  const firstDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  firstDay.setDate(firstDay.getDate() - (WINDOW_DAYS - 1));

  for (let offset = 0; offset < WINDOW_DAYS; offset += 1) {
    const date = new Date(firstDay.getFullYear(), firstDay.getMonth(), firstDay.getDate());
    date.setDate(date.getDate() + offset);
    calendarDays.push({
      date,
      dateText: formatDate(date),
      offsetFromToday: WINDOW_DAYS - 1 - offset,
    });
  }

  return calendarDays;
}

function getRatingQuarters(today: Date): [string, string] {
  const currentQuarter = Math.floor(today.getMonth() / 3);
  const currentQuarterStart = new Date(today.getFullYear(), currentQuarter * 3, 1);
  const previousQuarter = new Date(currentQuarterStart.getFullYear(), currentQuarterStart.getMonth() - 3, 1);
  const quarterBeforePrevious = new Date(
    currentQuarterStart.getFullYear(),
    currentQuarterStart.getMonth() - 6,
    1,
  );

  const label = (date: Date) => `Q${Math.floor(date.getMonth() / 3) + 1}-${date.getFullYear()}`;
  return [label(quarterBeforePrevious), label(previousQuarter)];
}

function emailFor(firstName: string, lastName: string): string {
  return `${firstName}.${lastName}`.toLowerCase().replace(/[^a-z.]/g, '') + '@company.test';
}

const managerSeeds: Array<{ firstName: string; lastName: string; department: Department }> = [
  { firstName: 'Arjun', lastName: 'Menon', department: 'Engineering' },
  { firstName: 'Meera', lastName: 'Iyer', department: 'Sales' },
  { firstName: 'Vikram', lastName: 'Rao', department: 'Support' },
  { firstName: 'Neha', lastName: 'Kapoor', department: 'Operations' },
];

const employeeNames: Record<Department, Array<[string, string]>> = {
  Engineering: [
    ['Asha', 'Krishnan'],
    ['Rohan', 'Desai'],
    ['Kavya', 'Srinivasan'],
    ['Rahul', 'Bhat'],
    ['Sanjay', 'Pillai'],
    ['Deepa', 'Kulkarni'],
    ['Nikhil', 'Verma'],
    ['Anita', 'Bose'],
    ['Karthik', 'Subramanian'],
    ['Ishita', 'Reddy'],
  ],
  Sales: [
    ['Aditya', 'Joshi'],
    ['Sneha', 'Patil'],
    ['Manish', 'Gupta'],
    ['Pooja', 'Nair'],
    ['Amit', 'Chawla'],
    ['Divya', 'Shetty'],
    ['Harish', 'Malhotra'],
    ['Ritu', 'Deshmukh'],
    ['Siddharth', 'Jain'],
    ['Tanvi', 'Mukherjee'],
  ],
  Support: [
    ['Aman', 'Shah'],
    ['Lakshmi', 'Rao'],
    ['Devika', 'Menon'],
    ['Pranav', 'Ghosh'],
    ['Swati', 'Mishra'],
    ['Gautam', 'Saxena'],
    ['Nandini', 'Rajan'],
    ['Suresh', 'Naidu'],
    ['Charu', 'Bansal'],
    ['Farhan', 'Ali'],
  ],
  Operations: [
    ['Suresh', 'Kumar'],
    ['Bhavna', 'Shetty'],
    ['Ravi', 'Chandra'],
    ['Maya', 'George'],
    ['Nitin', 'Arora'],
    ['Preeti', 'Rathore'],
    ['Vivek', 'Sood'],
    ['Shalini', 'Dutta'],
    ['Mohit', 'Yadav'],
    ['Rekha', 'Menon'],
  ],
};

const anomalyByEmail: Record<string, AnomalyType> = {
  'ishita.reddy@company.test': 'chronic_late',
  'manish.gupta@company.test': 'leave_spike',
  'devika.menon@company.test': 'extreme_overtime',
  'bhavna.shetty@company.test': 'weekend_leaves',
  'tanvi.mukherjee@company.test': 'mixed',
};

function createPeople(): PersonSeed[] {
  const hr: PersonSeed = {
    firstName: 'Priya',
    lastName: 'Nair',
    email: 'hr@company.test',
    department: 'HR',
    jobTitle: 'HR Administrator',
    role: 'hr',
  };

  const managers: PersonSeed[] = managerSeeds.map((manager) => ({
    ...manager,
    email: emailFor(manager.firstName, manager.lastName),
    jobTitle: `${manager.department} Manager`,
    role: 'manager',
  }));

  const employees: PersonSeed[] = departments.flatMap((department) =>
    employeeNames[department].map(([firstName, lastName]) => {
      const email = emailFor(firstName, lastName);
      return {
        firstName,
        lastName,
        email,
        department,
        jobTitle: `${department} Associate`,
        role: 'employee',
        managerDepartment: department,
        anomalyType: anomalyByEmail[email],
      };
    }),
  );

  return [hr, ...managers, ...employees];
}

function randomJoinDate(today: Date): string {
  const yearsAgo = randomInt(1, 6);
  const month = randomInt(0, 11);
  const day = randomInt(1, 28);
  const joinDate = new Date(today.getFullYear() - yearsAgo, month, day);
  return formatDate(joinDate);
}

function makeLeaveMap(person: PersonSeed, workdays: SeedDay[]): Map<string, string> {
  const leaves = new Map<string, string>();
  const leaveAnomalies = new Set<AnomalyType>(['leave_spike', 'weekend_leaves', 'mixed']);

  // Choose normal leave counts in four separate 30-calendar-day blocks.
  for (let block = 0; block < 4; block += 1) {
    if (block === 0 && person.anomalyType && leaveAnomalies.has(person.anomalyType)) {
      continue;
    }

    const blockDays = workdays.filter(
      (day) => day.offsetFromToday >= block * 30 && day.offsetFromToday < (block + 1) * 30,
    );
    const isSales = person.department === 'Sales';
    const count = randomInt(isSales ? 2 : 0, isSales ? 4 : 2);
    for (const day of sample(blockDays, count)) {
      leaves.set(day.dateText, ['sick', 'casual', 'unpaid'][randomInt(0, 2)]);
    }
  }

  const last30Days = workdays.filter((day) => day.offsetFromToday < 30);
  const setAnomalyLeaves = (count: number, allowedDays: SeedDay[]) => {
    for (const day of sample(allowedDays, count)) {
      leaves.set(day.dateText, ['sick', 'casual', 'unpaid'][randomInt(0, 2)]);
    }
  };

  if (person.anomalyType === 'leave_spike') {
    setAnomalyLeaves(randomInt(8, 10), last30Days);
  } else if (person.anomalyType === 'weekend_leaves') {
    const mondayOrFriday = last30Days.filter(
      (day) => day.date.getDay() === 1 || day.date.getDay() === 5,
    );
    setAnomalyLeaves(randomInt(5, 6), mondayOrFriday);
  } else if (person.anomalyType === 'mixed') {
    setAnomalyLeaves(randomInt(4, 5), last30Days);
  }

  return leaves;
}

function insertAttendance(personId: number, person: PersonSeed, workdays: SeedDay[]): void {
  const leaves = makeLeaveMap(person, workdays);
  const last30Days = workdays.filter((day) => day.offsetFromToday < 30);
  const last45Days = workdays.filter((day) => day.offsetFromToday < 45);
  const absenceDates = new Set<string>();

  if (person.anomalyType === 'mixed') {
    const eligibleDays = last30Days.filter((day) => !leaves.has(day.dateText));
    for (const day of sample(eligibleDays, randomInt(3, 4))) {
      absenceDates.add(day.dateText);
    }
  }

  for (const day of workdays) {
    if (!leaves.has(day.dateText) && !absenceDates.has(day.dateText) && random() < 0.01) {
      absenceDates.add(day.dateText);
    }
  }

  const availableLast45 = last45Days.filter(
    (day) => !leaves.has(day.dateText) && !absenceDates.has(day.dateText),
  );
  const chronicLateDates = new Set<string>();
  if (person.anomalyType === 'chronic_late') {
    const chronicLateCount = Math.round(availableLast45.length * 0.7);
    for (const day of sample(availableLast45, chronicLateCount)) {
      chronicLateDates.add(day.dateText);
    }
  }

  const availableLast30 = last30Days.filter(
    (day) => !leaves.has(day.dateText) && !absenceDates.has(day.dateText),
  );
  const extremeOvertimeDates = new Set<string>();
  if (person.anomalyType === 'extreme_overtime') {
    const targetDays = Math.max(Math.ceil(availableLast30.length * 0.75), Math.ceil(45 / 3.5));
    for (const day of sample(availableLast30, targetDays)) {
      extremeOvertimeDates.add(day.dateText);
    }
  }

  const insertAttendanceRow = db.prepare(
    `INSERT INTO attendance
      (employee_id, date, check_in, check_out, status, overtime_hours)
     VALUES (?, ?, ?, ?, ?, ?)`,
  );
  const insertLeaveRow = db.prepare(
    'INSERT INTO leaves (employee_id, date, type, approved) VALUES (?, ?, ?, 1)',
  );

  for (const day of workdays) {
    const leaveType = leaves.get(day.dateText);
    if (leaveType) {
      insertAttendanceRow.run(personId, day.dateText, null, null, 'leave', 0);
      insertLeaveRow.run(personId, day.dateText, leaveType);
      continue;
    }

    if (absenceDates.has(day.dateText)) {
      insertAttendanceRow.run(personId, day.dateText, null, null, 'absent', 0);
      continue;
    }

    let delayMinutes: number;
    if (person.anomalyType === 'mixed' && day.offsetFromToday < 45) {
      delayMinutes = randomInt(25, 40);
    } else if (chronicLateDates.has(day.dateText)) {
      // Skew late check-ins high enough that the whole 45-day average is about 45 to 55.
      delayMinutes = random() < 0.8 ? randomInt(60, 80) : randomInt(90, 120);
    } else {
      delayMinutes = Math.max(-25, Math.min(40, Math.round(normalRandom(-5, 10))));
    }

    const status = delayMinutes > 15 ? 'late' : 'present';
    let overtimeHours = 0;
    if (extremeOvertimeDates.has(day.dateText)) {
      overtimeHours = 3.5;
    } else if (random() < 0.2) {
      overtimeHours = Number((0.5 + random() * 2).toFixed(2));
    }

    const checkInMinutes = 9 * 60 + delayMinutes;
    const checkOutNoiseMinutes = Math.round((random() - 0.5) * 30);
    const checkOutMinutes = checkInMinutes + Math.round(8.5 * 60 + overtimeHours * 60) + checkOutNoiseMinutes;

    insertAttendanceRow.run(
      personId,
      day.dateText,
      formatTime(checkInMinutes),
      formatTime(checkOutMinutes),
      status,
      overtimeHours,
    );
  }
}

function quarterScore(person: PersonSeed): number {
  return person.anomalyType ? randomInt(1, 3) : randomInt(3, 5);
}

function seedDatabase(): void {
  const today = new Date();
  const todayAtMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const workdays = getSeedDays(todayAtMidnight).filter(
    (day) => day.date.getDay() !== 0 && day.date.getDay() !== 6,
  );
  const ratingQuarters = getRatingQuarters(todayAtMidnight);
  const people = createPeople();

  // Drop dependent tables first, then recreate the schema and all seeded rows in one transaction.
  const resetAndSeed = db.transaction(() => {
    db.exec(`
      DROP TABLE IF EXISTS ground_truth;
      DROP TABLE IF EXISTS ratings;
      DROP TABLE IF EXISTS leaves;
      DROP TABLE IF EXISTS attendance;
      DROP TABLE IF EXISTS users;
      DROP TABLE IF EXISTS employees;
    `);
    db.exec(schemaSql);

    const insertEmployee = db.prepare(
      `INSERT INTO employees (name, email, department, job_title, manager_id, join_date)
       VALUES (?, ?, ?, ?, ?, ?)`,
    );
    const insertUser = db.prepare(
      'INSERT INTO users (email, password_hash, role, employee_id) VALUES (?, ?, ?, ?)',
    );
    const insertRating = db.prepare(
      'INSERT INTO ratings (employee_id, quarter, score) VALUES (?, ?, ?)',
    );
    const insertGroundTruth = db.prepare(
      'INSERT INTO ground_truth (employee_id, anomaly_type) VALUES (?, ?)',
    );
    const managerIds = new Map<Department, number>();

    for (const person of people) {
      const managerId = person.managerDepartment ? managerIds.get(person.managerDepartment) : null;
      const fullName = `${person.firstName} ${person.lastName}`;
      const employeeResult = insertEmployee.run(
        fullName,
        person.email,
        person.department,
        person.jobTitle,
        managerId ?? null,
        randomJoinDate(todayAtMidnight),
      );
      const employeeId = Number(employeeResult.lastInsertRowid);

      if (person.role === 'manager') {
        managerIds.set(person.department as Department, employeeId);
      }

      const passwordHash = bcrypt.hashSync(PASSWORD, 10);
      insertUser.run(person.email, passwordHash, person.role, employeeId);

      for (const quarter of ratingQuarters) {
        insertRating.run(employeeId, quarter, quarterScore(person));
      }

      if (person.anomalyType) {
        insertGroundTruth.run(employeeId, person.anomalyType);
      }

      insertAttendance(employeeId, person, workdays);
    }
  });

  resetAndSeed();

  const tableCounts = ['employees', 'users', 'attendance', 'leaves', 'ratings', 'ground_truth'].map(
    (tableName) => ({
      table: tableName,
      rows: (db.prepare(`SELECT COUNT(*) AS count FROM ${tableName}`).get() as { count: number }).count,
    }),
  );
  const anomalies = db
    .prepare(
      `SELECT e.name, e.email, e.department, g.anomaly_type
       FROM ground_truth AS g
       JOIN employees AS e ON e.id = g.employee_id
       ORDER BY e.id`,
    )
    .all() as Array<{ name: string; email: string; department: string; anomaly_type: AnomalyType }>;

  console.log(`Seeded synthetic data through ${formatDate(todayAtMidnight)} (PRNG seed ${SEED}).`);
  console.log('\nTable counts:');
  console.table(tableCounts);
  console.log('\nInjected anomalies:');
  console.table(anomalies);
  console.log('\nDemo logins (password for each: Pass@123):');
  console.table([
    { role: 'HR', email: 'hr@company.test' },
    { role: 'Manager', email: 'arjun.menon@company.test' },
    { role: 'Employee', email: 'asha.krishnan@company.test' },
  ]);
}

try {
  seedDatabase();
} catch (error) {
  console.error('Database seeding failed:', error);
  process.exitCode = 1;
} finally {
  db.close();
}
