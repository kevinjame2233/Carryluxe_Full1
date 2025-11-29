const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

const adminFile = path.join(__dirname, 'data', 'admin.json');
const password = 'C@rryLuxe_2025#';

async function verify() {
    try {
        const data = fs.readFileSync(adminFile, 'utf8');
        const admin = JSON.parse(data);
        console.log('Stored Email:', admin.email);
        console.log('Stored Hash:', admin.hash);

        const match = await bcrypt.compare(password, admin.hash);
        console.log('Password Match:', match);
    } catch (e) {
        console.error(e);
    }
}

verify();
