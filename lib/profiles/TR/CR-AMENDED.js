exports.name = 'CR-AMENDED';
exports.config = {
    status: 'CR',
    longStatus: 'Candidate Recommendation',
    styleSheet: 'W3C-CR',
    stabilityWarning: true,
    track: 'Recommendation',
    amended: true,
};

exports.rules = require('./CR').rules;
