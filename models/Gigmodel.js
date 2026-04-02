const mongoose = require('mongoose');
const { GigSchema } = require('../schemas/GigsSchema');

const Gig = mongoose.model('Gig', GigSchema); // ✅ Capital "G"

module.exports = { Gig };
