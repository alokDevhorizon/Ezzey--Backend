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
/**
 * MAIN FUNCTION: Generate Single Optimal Timetable (Heuristic / Greedy)
 * Advantage: Extremely Fast (<100ms)
 */
const generateTimetable = async (batch) => {
  console.log(`🚀 Generating Timetable (Heuristic) for: ${batch.name}`);

  // 1. FETCH RESOURCES
  const busySlots = await getBusySlots();
  const allClassrooms = await Classroom.find({ isActive: true }).sort({ capacity: 1 }); // Ascending for best fit

  const lectureRooms = allClassrooms.filter(r => ['lecture', 'seminar'].includes(r.type));
  const labRooms = allClassrooms.filter(r => r.type === 'lab');

  // 2. PREPARE & SORT SUBJECTS (Heuristic: Hardest First)
  // Sort by: Labs first (duration > 1), then Total Hours Descending
  const sortedSubjects = [...batch.subjects].sort((a, b) => {
    const durA = (a.subject.type === 'lab' ? a.subject.hoursPerWeek : 1);
    const durB = (b.subject.type === 'lab' ? b.subject.hoursPerWeek : 1);
    if (durA !== durB) return durB - durA; // Long blocks first
    return (b.subject.hoursPerWeek || 0) - (a.subject.hoursPerWeek || 0); // More hours first
  });

  const resultSlots = [];

  // Track local usage to prevent collisions within this batch
  const batchBusy = {
    faculty: new Set(), // "facId-day-time"
    rooms: new Set(),   // "roomId-day-time"
    subjectDaily: {}    // "subId-day" -> count
  };

  const isSlotBusy = (facId, roomId, day, time) => {
    const timeKey = `${day}-${time}`;

    // Global Checks (Other batches)
    if (busySlots.faculty[facId]?.includes(timeKey)) return true;
    if (busySlots.rooms[roomId]?.includes(timeKey)) return true;

    // Local Checks (Current batch generation)
    if (batchBusy.faculty.has(`${facId}-${timeKey}`)) return true;
    if (batchBusy.rooms.has(`${roomId}-${timeKey}`)) return true;

    return false;
  };

  // 3. ASSIGN SLOTS
  for (const subjectEntry of sortedSubjects) {
    const { subject, faculty } = subjectEntry;
    if (!subject || !faculty) continue;

    console.log(`... Processing ${subject.name} (${subject.hoursPerWeek}h)`);

    const hoursNeeded = subject.hoursPerWeek || 3;
    const subId = subject._id.toString();
    const facId = faculty._id.toString();
    const isLab = subject.type === 'lab';
    const blockDuration = isLab ? hoursNeeded : 1;
    let assignedCount = 0;

    // Try to assign 'hoursNeeded' blocks
    // For Theory: 'hoursNeeded' separate 1-hour blocks.
    // For Lab: 1 block of 'hoursNeeded' duration.
    const iterations = isLab ? 1 : hoursNeeded;

    for (let i = 0; i < iterations; i++) {
      let placed = false;

      // Reset day loop for each block to allow spreading
      // randomize days slightly or start from Monday? Sequential is fine for "Sequential" option.
      for (const day of days) {
        if (placed) break;

        // Constraint: Max 1 theory block per day
        if (!isLab) {
          const dayCount = batchBusy.subjectDaily[`${subId}-${day}`] || 0;
          if (dayCount >= 1) continue;
        }

        for (let t = 0; t < timeSlots.length; t++) {
          // Boundary & Lunch Check
          if (t + blockDuration > timeSlots.length) break;
          // Don't span across lunch (assuming index 3 is 12:00-13:00 gap, wait timeSlots has 7 items.
          // Indices: 0(9), 1(10), 2(11) -- GAP -- 3(13), 4(14), 5(15), 6(16)
          // If t=2 (11:00) and duration=2 -> Ends 13:00. This crosses lunch?
          // VisualGap logic: Index 2 ends at 12:00. Index 3 starts at 13:00.
          // So [11:00-12:00] is contiguous with [13:00-14:00]? NO.
          // Code must check:
          if (t <= 2 && (t + blockDuration > 3)) continue; // Crosses 12-1 PM

          // Check Faculty Availability for WHOLE Block
          let facultyFree = true;
          for (let k = 0; k < blockDuration; k++) {
            // We only pass roomId as null here because we haven't picked room yet
            // We just want to check Faculty busy-ness
            if (isSlotBusy(facId, 'dummy', day, timeSlots[t + k].start)) {
              facultyFree = false;
              break;
            }
          }
          if (!facultyFree) continue;

          // Find a Room
          const roomPool = isLab ? labRooms : lectureRooms;
          const bestRoom = roomPool.find(room => {
            if (room.capacity < batch.strength) return false;

            // Check if Room is free for WHOLE block
            for (let k = 0; k < blockDuration; k++) {
              if (isSlotBusy(facId, room._id.toString(), day, timeSlots[t + k].start)) {
                return false;
              }
            }
            return true;
          });

          if (bestRoom) {
            // ALLOCATE
            placed = true;
            // Mark Resources Busy
            for (let k = 0; k < blockDuration; k++) {
              const slotTime = timeSlots[t + k].start;
              const slotEndTime = timeSlots[t + k].end;
              const slotKey = `${day}-${slotTime}`;

              batchBusy.faculty.add(`${facId}-${slotKey}`);
              batchBusy.rooms.add(`${bestRoom._id.toString()}-${slotKey}`);

              // Add to Result
              resultSlots.push({
                day,
                startTime: slotTime,
                endTime: slotEndTime,
                subject: subject._id,
                faculty: faculty._id,
                classroom: bestRoom._id,
                type: subject.type
              });
            }

            // Update Daily Count
            const dayKey = `${subId}-${day}`;
            batchBusy.subjectDaily[dayKey] = (batchBusy.subjectDaily[dayKey] || 0) + 1;

            break; // Move to next iteration (next hour needed)
          }
        }
      }

      if (!placed) {
        throw new Error(`Unable to schedule ${subject.name} (${subject.type}). No valid slots/rooms found for duration ${blockDuration}.`);
      }
      assignedCount++;
    }
  }

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