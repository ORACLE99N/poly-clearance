const express = require('express');
const session = require('express-session');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware configuration
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static('public'));

app.use(session({
    secret: 'poly_clearance_secret_key',
    resave: false,
    saveUninitialized: true
}));

// --- SIMULATED DATABASE ---
const DEPARTMENTS = [
    { name: "Electrical/Electronic Engineering Technology", short: "EE" },
    { name: "Civil Engineering Technology", short: "CE" },
    { name: "Mechanical Engineering Technology", short: "ME" },
    { name: "Architectural Technology", short: "AT" },
    { name: "Building Technology", short: "BT" },
    { name: "Estate Management and Valuation", short: "EM" },
    { name: "Quantity Surveying", short: "QS" },
    { name: "Urban and Regional Planning", short: "UP" },
    { name: "Computer Science", short: "CS" },
    { name: "Statistics", short: "ST" },
    { name: "Science Laboratory Technology", short: "SL" },
    { name: "Environmental Biology", short: "EB" },
    { name: "Mathematics and Statistics", short: "MS" },
    { name: "Accountancy", short: "AC" },
    { name: "Business Administration and Management", short: "BA" },
    { name: "Public Administration", short: "PA" },
    { name: "Marketing", short: "MT" },
    { name: "Office Technology and Management", short: "OT" },
    { name: "Fine Art", short: "FA" },
    { name: "Mass Communication", short: "MA" }
];

const CENTRAL_UNITS = ["Library", "ICT", "Security", "Student Affairs"];

// Stores registered students
// Structure: { matric, password, deptShort, clearances: { 'Department': 'Pending', 'Library': 'Pending', ... } }
let studentsDB = [];

// --- HELPER FUNCTIONS ---
function parseMatric(matric) {
    // Matches formats like ND2024/22585/1/CS or HND2023/22585/1/BA
    const regex = /^(ND|HND)(\d{4})\/\d+\/\d+\/([A-Z]+)$/;
    const match = matric.toUpperCase().match(regex);
    if (!match) return null;
    return { type: match[1], year: match[2], deptShort: match[3] };
}

// --- ROUTES ---

// 1. Home / Login Choice Page
app.get('/', (req, res) => {
    res.render('index', { message: null, departments: DEPARTMENTS, units: CENTRAL_UNITS });
});

// 2. Student Registration & Login Route
app.post('/student/auth', (req, res) => {
    const { matric, password, action } = req.body;
    const parsed = parseMatric(matric);

    if (!parsed) {
        return res.render('index', { message: "Invalid Matric Number Format! Example: ND2024/22585/1/CS", departments: DEPARTMENTS, units: CENTRAL_UNITS });
    }

    const deptExists = DEPARTMENTS.some(d => d.short === parsed.deptShort);
    if (!deptExists) {
        return res.render('index', { message: `Department shortcode '${parsed.deptShort}' is unrecognized.`, departments: DEPARTMENTS, units: CENTRAL_UNITS });
    }

    const existingStudent = studentsDB.find(s => s.matric.toUpperCase() === matric.toUpperCase());

    if (action === 'register') {
        if (existingStudent) {
            return res.render('index', { message: "Student already registered! Please login.", departments: DEPARTMENTS, units: CENTRAL_UNITS });
        }
        
        const newStudent = {
            matric: matric.toUpperCase(),
            password: password,
            deptShort: parsed.deptShort,
            clearances: {
                'Department': 'Pending',
                'Library': 'Pending',
                'ICT': 'Pending',
                'Security': 'Pending',
                'Student Affairs': 'Pending'
            }
        };
        studentsDB.push(newStudent);
        req.session.student = newStudent;
        return res.redirect('/student/dashboard');
    } else {
        // Login Action
        if (!existingStudent || existingStudent.password !== password) {
            return res.render('index', { message: "Invalid Matric Number or Password.", departments: DEPARTMENTS, units: CENTRAL_UNITS });
        }
        req.session.student = existingStudent;
        return res.redirect('/student/dashboard');
    }
});

// 3. Student Dashboard
app.get('/student/dashboard', (req, res) => {
    if (!req.session.student) return res.redirect('/');
    // Get the latest status from our database array
    const currentStudent = studentsDB.find(s => s.matric === req.session.student.matric);
    res.render('students_dashboard', { student: currentStudent });
});

// 4. Admin Login Route
app.post('/admin/login', (req, res) => {
    const { adminUnit, password } = req.body;
    const expectedAdminPassword = 'divine2008';

    if (password !== expectedAdminPassword) {
        return res.render('index', { message: "Incorrect admin password.", departments: DEPARTMENTS, units: CENTRAL_UNITS });
    }

    req.session.admin = { unit: adminUnit };
    res.redirect('/admin/dashboard');
});

// 5. Admin Dashboard
app.get('/admin/dashboard', (req, res) => {
    if (!req.session.admin) return res.redirect('/');
    
    const adminUnit = req.session.admin.unit; 
    let relevantStudents = [];

    // If it's a structural academic department (e.g., "CS"), they only clear students belonging to that department
    if (adminUnit.length <= 3) { 
        relevantStudents = studentsDB.filter(s => s.deptShort === adminUnit);
    } else {
        // Central units (Library, ICT, etc.) manage all students
        relevantStudents = studentsDB;
    }

    res.render('admin_dashboard', { adminUnit: adminUnit, students: relevantStudents });
});

// 6. Admin Action: Clear/Reject Student
app.post('/admin/clear-student', (req, res) => {
    if (!req.session.admin) return res.status(403).send('Unauthorized');
    
    const { studentMatric, status } = req.body;
    const adminUnit = req.session.admin.unit;

    const student = studentsDB.find(s => s.matric === studentMatric);
    if (student) {
        // Determine if this is a specialized department clearance or a central unit clearance
        if (adminUnit.length <= 3) {
            student.clearances['Department'] = status;
        } else {
            student.clearances[adminUnit] = status;
        }
    }
    
    res.redirect('/admin/dashboard');
});

// 7. Logout Route
app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

app.listen(PORT, () => {
    console.log(`🚀 Portal running smoothly at http://localhost:${PORT}`);
});
