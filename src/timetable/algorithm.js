/**
 * Timetable Generation Algorithm - Enterprise Grade (LP Version)
 * * FEATURES:
 * 1. Global Conflict Awareness: Checks other batches' schedules first.
 * 2. Deterministic: Uses Linear Programming for optimal results.
 * 3. Robust: Handles room capacity fallbacks gracefully.
 */

const solver = require('javascript-lp-solver');
const Classroom = require('../models/Classroom');
const Timetable = require('../models/Timetable'); // Required for cross-batch checks

// Standard Time Slots
const timeSlots = [
  { id: '09:00', start: '09:00', end: '10:00', label: 'morning' },
  { id: '10:00', start: '10:00', end: '11:00', label: 'morning' },
  { id: '11:00', start: '11:00', end: '12:00', label: 'morning' },
  // 12:00 - 13:00 Lunch Gap
  { id: '13:00', start: '13:00', end: '14:00', label: 'afternoon' },
  { id: '14:00', start: '14:00', end: '15:00', label: 'afternoon' },
  { id: '15:00', start: '15:00', end: '16:00', label: 'afternoon' },
  { id: '16:00', start: '16:00', end: '17:00', label: 'evening' },
];

const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

/**
 * Utility: Fetch slots that are ALREADY taken by other batches
 * Prevents Dr. Smith from being booked in Section A and Section B at the same time.
 */
const getBusySlots = async () => {
  // Find all active/published timetables
  // We assume 'active' or 'published' status means it's a confirmed schedule
  const existingSchedules = await Timetable.find({ status: { $in: ['active', 'published'] } });

  const busy = {
    faculty: {},   // Map: facultyId -> [ "Monday-09:00", ... ]
    rooms: {}      // Map: roomId -> [ "Monday-09:00", ... ]
  };

  existingSchedules.forEach(schedule => {
    if (!schedule.weekSlots) return;

    schedule.weekSlots.forEach(slot => {
      const timeKey = `${slot.day}-${slot.startTime}`;

      // Mark Faculty as busy
      if (slot.faculty) {
        const fid = slot.faculty.toString();
        if (!busy.faculty[fid]) busy.faculty[fid] = [];
        busy.faculty[fid].push(timeKey);
      }

      // Mark Room as busy
      if (slot.classroom) {
        const rid = slot.classroom.toString();
        if (!busy.rooms[rid]) busy.rooms[rid] = [];
        busy.rooms[rid].push(timeKey);
      }
    });
  });

  return busy;
};

/**
 * Utility: Sort slots by day and time
 */
const sortSlotsByDayAndTime = (slots) => {
  const dayOrder = { Monday: 0, Tuesday: 1, Wednesday: 2, Thursday: 3, Friday: 4 };
  const getMinutes = (time) => {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
  };

  return slots.sort((a, b) => {
    const dayDiff = dayOrder[a.day] - dayOrder[b.day];
    if (dayDiff !== 0) return dayDiff;
    return getMinutes(a.startTime) - getMinutes(b.startTime);
  });
};

/**
 * MAIN FUNCTION: Generate Single Optimal Timetable
 */
const generateTimetable = async (batch) => {
  console.log(`🚀 Generating Timetable for: ${batch.name} (Size: ${batch.strength})`);

  // 1. FETCH RESOURCES & BUSY SLOTS
  // ---------------------------------------------------------
  const busySlots = await getBusySlots();

  // Calculate total hours needed
  const totalHoursNeeded = batch.subjects.reduce((sum, s) => sum + (s.subject?.hoursPerWeek || 0), 0);
  const totalAvailableSlots = days.length * timeSlots.length;

  console.log(`🚀 Generating Timetable for: ${batch.name} (Size: ${batch.strength})`);
  console.log(`📊 Statistics: Subjects: ${batch.subjects.length}, Total Hours: ${totalHoursNeeded}, Max Possible: ${totalAvailableSlots}`);

  if (totalHoursNeeded > totalAvailableSlots) {
    console.error(`❌ CRITICAL: Total hours requested (${totalHoursNeeded}) exceeds weekly capacity (${totalAvailableSlots})!`);
    return [];
  }

  const allClassrooms = await Classroom.find({ isActive: true });
  allClassrooms.sort((a, b) => b.capacity - a.capacity);

  const lectureRooms = allClassrooms.filter(r => ['lecture', 'seminar'].includes(r.type));
  const labRooms = allClassrooms.filter(r => r.type === 'lab');

  // 2. INITIALIZE SOLVER MODEL
  // ---------------------------------------------------------
  const model = {
    optimize: 'cost',
    opType: 'min',
    constraints: {},
    variables: {},
    ints: {}
  };

  const variableMap = {};

  // 3. BUILD CONSTRAINTS
  // ---------------------------------------------------------
  for (const subjectEntry of batch.subjects) {
    const { subject, faculty } = subjectEntry;

    if (!subject || !faculty) continue;

    const hoursNeeded = subject.hoursPerWeek || 3;
    const subId = subject._id.toString();
    const facId = faculty._id.toString();
    const isLab = subject.type === 'lab';
    const blockDuration = isLab ? hoursNeeded : 1;

    // CONSTRAINT: Subject Target Hours
    model.constraints[`sub_${subId}_target`] = { equal: hoursNeeded };

    // ROOM FINDER (With Fallback)
    const roomPool = isLab ? labRooms : lectureRooms;
    let suitableRooms = roomPool.filter(r => r.capacity >= batch.strength);

    if (suitableRooms.length === 0) {
      if (roomPool.length > 0) {
        console.warn(`⚠️ Warning: No room fits ${batch.strength} students for ${subject.name}. Using largest available.`);
        suitableRooms = [roomPool[0]];
      } else {
        console.error(`❌ CRITICAL: No rooms of type ${subject.type} available!`);
        continue;
      }
    }

    days.forEach(day => {
      // CONSTRAINT: Spread Theory (Max 1 block per day)
      if (!isLab) {
        model.constraints[`sub_${subId}_day_${day}`] = { max: 1 };
      }

      for (let t = 0; t < timeSlots.length; t++) {
        // Boundary Check
        if (t + blockDuration > timeSlots.length) continue;

        // Lunch Check (12:00-13:00 gap)
        if (t <= 2 && (t + blockDuration > 3)) continue;

        // 🛑 GLOBAL CONFLICT CHECK 🛑
        // We must check EVERY hour in the proposed block for conflicts
        let isBlocked = false;

        for (let i = 0; i < blockDuration; i++) {
          const checkSlot = timeSlots[t + i];
          const timeKey = `${day}-${checkSlot.start}`;

          // Check if Faculty is busy elsewhere
          if (busySlots.faculty[facId]?.includes(timeKey)) {
            isBlocked = true;
            break;
          }
        }
        if (isBlocked) continue; // Skip this start time entirely

        suitableRooms.forEach(room => {
          const roomId = room._id.toString();

          // 🛑 ROOM CONFLICT CHECK 🛑
          // Check if Room is busy elsewhere for any part of the block
          let isRoomBlocked = false;
          for (let i = 0; i < blockDuration; i++) {
            const checkSlot = timeSlots[t + i];
            const timeKey = `${day}-${checkSlot.start}`;
            if (busySlots.rooms[roomId]?.includes(timeKey)) {
              isRoomBlocked = true;
              break;
            }
          }
          if (isRoomBlocked) return; // Skip this room, try next

          const varKey = `${subId}|${day}|${t}|${roomId}`;

          // --- COST FUNCTION ---
          let cost = 10;
          if (day === 'Monday' || day === 'Friday') cost += 2;
          if (!isLab && timeSlots[t].label === 'morning') cost -= 2;

          const waste = room.capacity - batch.strength;
          if (waste < 0) cost += 50;
          else cost += Math.floor(waste / 10);

          const variable = {
            cost: cost,
            [`sub_${subId}_target`]: isLab ? hoursNeeded : 1,
            [`sub_${subId}_day_${day}`]: 1
          };

          // --- HARD CONSTRAINTS FOR BLOCK ---
          for (let i = 0; i < blockDuration; i++) {
            const slotIdx = t + i;
            const timeKey = `${day}_${timeSlots[slotIdx].id}`;

            model.constraints[`batch_${batch._id}_${timeKey}`] = { max: 1 };
            variable[`batch_${batch._id}_${timeKey}`] = 1;

            model.constraints[`fac_${facId}_${timeKey}`] = { max: 1 };
            variable[`fac_${facId}_${timeKey}`] = 1;

            model.constraints[`room_${roomId}_${timeKey}`] = { max: 1 };
            variable[`room_${roomId}_${timeKey}`] = 1;
          }

          model.variables[varKey] = variable;
          model.ints[varKey] = 1;

          variableMap[varKey] = {
            subject: subject._id,
            faculty: faculty._id,
            classroom: room._id,
            day,
            startIndex: t,
            duration: blockDuration,
            type: subject.type
          };
        });
      }
    });
  }

  // 4. EXECUTE SOLVER
  // ---------------------------------------------------------
  console.log(`🧩 Solving constraints with Global Awareness...`);
  const solution = solver.Solve(model);

  if (!solution.feasible) {
    console.error("❌ Solver failed: Infeasible. This likely means Faculty or Rooms are fully booked by other batches.");
    return [];
  }

  // 5. PARSE RESULT
  // ---------------------------------------------------------
  const resultSlots = [];
  Object.keys(solution).forEach(key => {
    if (solution[key] > 0.5 && variableMap[key]) {
      const info = variableMap[key];
      for (let i = 0; i < info.duration; i++) {
        const slotIdx = info.startIndex + i;
        resultSlots.push({
          day: info.day,
          startTime: timeSlots[slotIdx].start,
          endTime: timeSlots[slotIdx].end,
          subject: info.subject,
          faculty: info.faculty,
          classroom: info.classroom,
          type: info.type
        });
      }
    }
  });

  return sortSlotsByDayAndTime(resultSlots);
};

/**
 * WRAPPER: Matches Controller Expectation
 */
const generateMultipleTimetables = async (batch) => {
  const singleResult = await generateTimetable(batch);

  return [
    {
      option: 1,
      name: 'Sequential (Morning to Evening)',
      description: 'Conflict-free schedule accounting for all other active batches.',
      weekSlots: singleResult
    }
  ];
};

/**
 * Validation Helper
 */
const validateTimetable = (weekSlots) => {
  const conflicts = { facultyOverlaps: [], classroomOverlaps: [] };
  const getSlotKey = (s) => `${s.day}-${s.startTime}`;
  const facultyMap = {};
  const roomMap = {};

  weekSlots.forEach(slot => {
    const fid = slot.faculty.toString();
    const rid = slot.classroom.toString();
    const key = getSlotKey(slot);

    if (facultyMap[fid]?.includes(key)) conflicts.facultyOverlaps.push({ faculty: fid, time: key });
    else (facultyMap[fid] = facultyMap[fid] || []).push(key);

    if (roomMap[rid]?.includes(key)) conflicts.classroomOverlaps.push({ room: rid, time: key });
    else (roomMap[rid] = roomMap[rid] || []).push(key);
  });

  return { isValid: conflicts.facultyOverlaps.length === 0 && conflicts.classroomOverlaps.length === 0, conflicts };
};

module.exports = {
  generateMultipleTimetables,
  generateTimetable,
  validateTimetable,
};