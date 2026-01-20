const mongoose = require('mongoose');
const fs = require('fs');
require('dotenv').config();

const Batch = require('../src/models/Batch');
const Subject = require('../src/models/Subject');
const Faculty = require('../src/models/Faculty');
const Classroom = require('../src/models/Classroom');

const LOG_FILE = 'creation_log.txt';
const log = (msg) => {
    console.log(msg);
    try { fs.appendFileSync(LOG_FILE, msg + '\\n'); } catch (e) { }
};

const run = async () => {
    try {
        fs.writeFileSync(LOG_FILE, '--- STARTED v2 ---\\n');

        if (!process.env.MONGO_URI) {
            log('❌ MONGO_URI missing');
            // Hardcode fallback if env issue? No, unsafe. 
            // Assume .env works or process.env works.
        }

        await mongoose.connect(process.env.MONGO_URI);
        log('🔌 DB Connected');

        // 1. Create Dedicated Faculty
        const facultyNames = ['Dr. Alpha', 'Dr. Beta', 'Dr. Gamma', 'Dr. Delta', 'Dr. Epsilon'];
        const facultyIds = [];

        log('Creating Faculty...');
        // Clean up old faculty to avoid duplicates if re-running
        // await Faculty.deleteMany({ email: /@test.com$/ }); 

        for (const name of facultyNames) {
            const email = \`\${name.replace(/ /g, '').toLowerCase()}@test.com\`;
            let fac = await Faculty.findOne({ email });
            if (!fac) {
                fac = await Faculty.create({
                    name,
                    email,
                    maxLoad: 20,
                    department: 'CSE'
                });
                log(\`Created Faculty: \${name}\`);
            } else {
                log(\`Found Faculty: \${name}\`);
            }
            facultyIds.push(fac._id);
        }

        // 2. Create Subjects (Total 35 Hours)
        const subjectsData = [
            { name: 'Full Stack Lab', code: 'FSL101', type: 'lab', hoursPerWeek: 4, facultyIdx: 0 },
            { name: 'AI/ML Lab', code: 'AIL102', type: 'lab', hoursPerWeek: 4, facultyIdx: 1 },
            { name: 'Advanced Algorithms', code: 'CS501', type: 'lecture', hoursPerWeek: 5, facultyIdx: 2 },
            { name: 'System Design', code: 'CS502', type: 'lecture', hoursPerWeek: 5, facultyIdx: 3 },
            { name: 'Cloud Computing', code: 'CS503', type: 'lecture', hoursPerWeek: 5, facultyIdx: 4 },
            { name: 'Cyber Security', code: 'CS504', type: 'lecture', hoursPerWeek: 4, facultyIdx: 0 },
            { name: 'Data Visualization', code: 'CS505', type: 'lecture', hoursPerWeek: 4, facultyIdx: 1 },
            { name: 'Technical Seminar', code: 'SEM101', type: 'seminar', hoursPerWeek: 4, facultyIdx: 2 },
        ];

        const batchSubjectsConfig = [];

        log('Creating Subjects...');
        for (const sub of subjectsData) {
            let s = await Subject.findOne({ code: sub.code });
            if (s) {
                 s.hoursPerWeek = sub.hoursPerWeek;
                 await s.save();
                 log(\`Updated Subject: \${s.name}\`);
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
                log(\`Created Subject: \${s.name}\`);
            }

            batchSubjectsConfig.push({
                subject: s._id,
                faculty: facultyIds[sub.facultyIdx]
            });
        }

        // 3. Create the Batch
        const batchData = {
            name: 'Section Full-Pack',
            code: 'CSE_FULL_2025',
            course: 'B.Tech',
            department: 'CSE',
            semester: 6,
            strength: 60,
            subjects: batchSubjectsConfig
        };

        let batch = await Batch.findOne({ code: batchData.code });
        if (batch) {
            batch.subjects = batchSubjectsConfig; // Force update subjects
            batch.isActive = true;
            await batch.save();
            log('♻️ Updated Existing Batch');
        } else {
            batch = await Batch.create(batchData);
            log('✨ Created New Batch');
        }

        log(\`🎯 TARGET BATCH ID: \${batch._id}\`);

    } catch (e) {
        log(\`❌ Error: \${e.message}\`);
    }
    await mongoose.disconnect();
};

run();
