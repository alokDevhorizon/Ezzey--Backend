const Batch = require('../models/Batch');

// @desc    Create a batch
// @route   POST /batches
// @access  Private/Admin
exports.createBatch = async (req, res, next) => {
  try {
    const batch = await Batch.create(req.body);
    await batch.populate('subjects.subject subjects.faculty');

    res.status(201).json({
      success: true,
      message: 'Batch created successfully',
      data: batch,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all batches
// @route   GET /batches
// @access  Private
exports.getBatches = async (req, res, next) => {
  try {
    // DEBUG: Log what is found
    const allBatches = await Batch.find({});
    const activeBatches = await Batch.find({ isActive: true });

    console.log(`[API DEBUG] Total Batches in DB: ${allBatches.length}`);
    console.log(`[API DEBUG] Active Batches: ${activeBatches.length}`);
    const target = allBatches.find(b => b.code === 'CSE_FULL_2025');
    if (target) {
      console.log(`[API DEBUG] Target Batch Found: ${target.name} | Active: ${target.isActive} | ID: ${target._id}`);
    } else {
      console.log('[API DEBUG] Target Batch CSE_FULL_2025 NOT in DB');
    }

    const batches = await Batch.find({ isActive: true }).populate(
      'subjects.subject subjects.faculty'
    );

    const formattedBatches = batches.map(batch => ({
      _id: batch._id,
      degree: batch.course, // Mapping based on previous context
      course: batch.course,
      batchCode: batch.code,
      department: batch.department,
      capacity: batch.strength,
      semester: batch.semester,
      section: batch.name, // "Section" maps to "name" in schema
      assignedSubjects: batch.subjects ? batch.subjects.length : 0,

      // Keep original full object optionally if needed for editing
      raw: batch
    }));

    res.status(200).json({
      success: true,
      count: formattedBatches.length,
      data: formattedBatches,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update batch
// @route   PATCH /batches/:id
// @access  Private/Admin
exports.updateBatch = async (req, res, next) => {
  try {
    const batch = await Batch.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    }).populate('subjects.subject subjects.faculty');

    if (!batch) {
      return res.status(404).json({
        success: false,
        message: 'Batch not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Batch updated successfully',
      data: batch,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete batch
// @route   DELETE /batches/:id
// @access  Private/Admin
// @desc    Delete batch
// @route   DELETE /batches/:id
// @access  Private/Admin
exports.deleteBatch = async (req, res, next) => {
  try {
    await Batch.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      data: {},
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Seed a full batch for testing
// @route   POST /batches/seed-full
// @access  Public (Dev)
exports.seedFullBatch = async (req, res, next) => {
  try {
    const Subject = require('../models/Subject');
    const Faculty = require('../models/Faculty');

    // 1. Create Dedicated Faculty
    const facultyNames = ['Dr. Alpha', 'Dr. Beta', 'Dr. Gamma', 'Dr. Delta', 'Dr. Epsilon'];
    const facultyIds = [];

    for (const name of facultyNames) {
      const email = `${name.replace(/ /g, '').toLowerCase()}@test.com`;
      let fac = await Faculty.findOne({ email });
      if (!fac) {
        fac = await Faculty.create({
          name,
          email,
          maxLoad: 20,
          department: 'CSE'
        });
      }
      facultyIds.push(fac._id);
    }

    // 2. Create Subjects (Total 35 Hours)
    // 2. Create Subjects (Total 35 Hours)
    const subjectsData = [
      { name: 'Full Stack Lab', code: 'FSL101', type: 'lab', hoursPerWeek: 4, facultyIdx: 0 },
      { name: 'AI/ML Lab', code: 'AIL102', type: 'lab', hoursPerWeek: 4, facultyIdx: 1 },
      { name: 'Advanced Algorithms', code: 'CS501', type: 'theory', hoursPerWeek: 5, facultyIdx: 2 },
      { name: 'System Design', code: 'CS502', type: 'theory', hoursPerWeek: 5, facultyIdx: 3 },
      { name: 'Cloud Computing', code: 'CS503', type: 'theory', hoursPerWeek: 5, facultyIdx: 4 },
      { name: 'Cyber Security', code: 'CS504', type: 'theory', hoursPerWeek: 4, facultyIdx: 0 },
      { name: 'Data Visualization', code: 'CS505', type: 'theory', hoursPerWeek: 4, facultyIdx: 1 },
      { name: 'Technical Seminar', code: 'SEM101', type: 'seminar', hoursPerWeek: 4, facultyIdx: 2 },
    ];

    const batchSubjectsConfig = [];

    for (const sub of subjectsData) {
      let s = await Subject.findOne({ code: sub.code });
      if (s) {
        s.hoursPerWeek = sub.hoursPerWeek;
        await s.save();
      } else {
        s = await Subject.create({
          name: sub.name,
          code: sub.code,
          type: sub.type,
          department: 'CSE',
          credits: 4,
          hoursPerWeek: sub.hoursPerWeek,
          semester: 6
        });
      }
      batchSubjectsConfig.push({
        subject: s._id,
        faculty: facultyIds[sub.facultyIdx]
      });
    }

    // 3. Create/Update Batch
    const batchCode = 'CSE_FULL_2025';
    let batch = await Batch.findOne({ code: batchCode });

    const batchData = {
      name: 'Section Full-Pack',
      code: batchCode,
      course: 'B.Tech',
      department: 'CSE',
      semester: 6,
      strength: 60,
      subjects: batchSubjectsConfig,
      isActive: true
    };

    if (batch) {
      Object.assign(batch, batchData);
      await batch.save();
    } else {
      batch = await Batch.create(batchData);
    }

    res.status(200).json({
      success: true,
      message: 'Full Batch Seeding Completed',
      data: batch
    });

  } catch (error) {
    next(error);
  }
};