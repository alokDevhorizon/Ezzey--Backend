const mongoose = require('mongoose');
require('dotenv').config();

const Batch = require('../src/models/Batch');
const Subject = require('../src/models/Subject');
const Faculty = require('../src/models/Faculty'); // CORRECTED: Use Faculty model, not User
const Classroom = require('../src/models/Classroom');

const run = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('🔌 DB Connected');

        // DEBUG MODE: Just find and show
        const batch = await Batch.findOne({ code: 'CSE_FULL_2025' });

        if (batch) {
            console.log('\n✅ BATCH FOUND');
            console.log('ID:', batch._id);
            console.log('Name:', batch.name);
            console.log('Active:', batch.isActive);
            console.log('Subjects:', batch.subjects.length);

            // Populating manual check
            await batch.populate('subjects.subject subjects.faculty');

            console.log('\n--- First Subject ---');
            if (batch.subjects.length > 0) {
                console.log('Sub:', batch.subjects[0].subject ? batch.subjects[0].subject.name : 'NULL');
                console.log('Fac:', batch.subjects[0].faculty ? batch.subjects[0].faculty.name : 'NULL');
            }
        } else {
            console.log('❌ BATCH NOT FOUND');
        }

    } catch (e) {
        console.error('❌ Error:', e);
    }
    await mongoose.disconnect();
};

run();
