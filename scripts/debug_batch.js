const mongoose = require('mongoose');
require('dotenv').config();
const Batch = require('../src/models/Batch');

const run = async () => {
    try {
        console.log('Connecting to DB...');
        if (!process.env.MONGO_URI) {
            throw new Error('MONGO_URI is missing in env');
        }
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected.');

        const count = await Batch.countDocuments({});
        console.log('Total Batches:', count);

        const batch = await Batch.findOne({ code: 'CSE_FULL_2025' });
        if (batch) {
            console.log('✅ Batch Found:', batch.name);
            console.log('   ID:', batch._id);
            console.log('   Active:', batch.isActive);
            if (!batch.isActive) {
                batch.isActive = true;
                await batch.save();
                console.log('   🛠️  Fixed: Set isActive to true');
            }
        } else {
            console.log('❌ Batch CSE_FULL_2025 NOT FOUND');
            // List all to show what IS there
            const all = await Batch.find({}, 'name code');
            console.log('Available Batches:', all.map(b => \`[\${b.code}] \${b.name}\`));
        }

    } catch (e) {
        console.error('❌ Error:', e);
    }
    await mongoose.disconnect();
};

run();
