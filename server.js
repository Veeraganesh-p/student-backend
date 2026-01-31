const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000;

// MongoDB connection for production and development
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://pveeradgl_db_user:bZXp3QaktJbK9ek1@cluster0.e248kfb.mongodb.net/student_idea_management?retryWrites=true&w=majority&appName=Cluster0';
mongoose.connect(MONGODB_URI)
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.error('MongoDB connection failed:', err));

// User Schema
const userSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['student', 'hr'], required: true },
    createdAt: { type: Date, default: Date.now }
});

// Problem Schema (for HR to post company problems)
const problemSchema = new mongoose.Schema({
    hrId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    budget: { type: Number, required: true },
    deadline: { type: Date, required: true },
    status: { type: String, enum: ['open', 'closed'], default: 'open' },
    createdAt: { type: Date, default: Date.now }
});

// Solution Schema (for students to submit solutions)
const solutionSchema = new mongoose.Schema({
    problemId: { type: mongoose.Schema.Types.ObjectId, ref: 'Problem', required: true },
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    teamLeaderName: { type: String, required: true },
    age: { type: Number, required: true },
    totalMembers: { type: Number, required: true },
    solutionDescription: { type: String, required: true },
    implementationPlan: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);
const Problem = mongoose.model('Problem', problemSchema);
const Solution = mongoose.model('Solution', solutionSchema);

// Middleware
app.use(cors({
    origin: ['http://localhost:3000', 'https://student-idea-app.vercel.app'],
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Register
app.post('/api/register', async (req, res) => {
    const { email, password, role } = req.body;
    
    console.log('Registration attempt:', { email, role });
    
    if (!email || !password || !role) {
        return res.status(400).json({ error: 'All fields are required' });
    }
    
    try {
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ error: 'Email already exists' });
        }
        
        const hashedPassword = await bcrypt.hash(password, 10);
        
        const user = new User({
            email,
            password: hashedPassword,
            role
        });
        
        await user.save();
        console.log('Registration successful for:', email);
        res.json({ message: 'Registration successful' });
    } catch (error) {
        console.error('Server error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Login
app.post('/api/login', async (req, res) => {
    const { email, password, role } = req.body;
    
    try {
        const user = await User.findOne({ email, role });
        if (!user) {
            return res.status(400).json({ error: 'Invalid credentials' });
        }
        
        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) {
            return res.status(400).json({ error: 'Invalid credentials' });
        }
        
        res.json({ 
            message: 'Login successful', 
            role: user.role,
            userId: user._id
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// HR: Post company problem
app.post('/api/problems', async (req, res) => {
    const { title, description, budget, deadline } = req.body;
    
    try {
        const dummyHrId = new mongoose.Types.ObjectId();
        
        const problem = new Problem({
            hrId: dummyHrId,
            title,
            description,
            budget,
            deadline: new Date(deadline)
        });
        
        await problem.save();
        res.json({ message: 'Problem posted successfully' });
    } catch (error) {
        console.error('Post problem error:', error);
        res.status(500).json({ error: 'Failed to post problem' });
    }
});

// Get all problems (for students to see)
app.get('/api/problems', async (req, res) => {
    try {
        const problems = await Problem.find({ status: 'open' }).sort({ createdAt: -1 });
        res.json(problems);
    } catch (error) {
        console.error('Get problems error:', error);
        res.status(500).json({ error: 'Failed to fetch problems' });
    }
});

// Student: Submit solution to a problem
app.post('/api/solutions', async (req, res) => {
    const { problemId, team_leader_name, age, total_members, solution_description, implementation_plan } = req.body;
    
    try {
        const dummyStudentId = new mongoose.Types.ObjectId();
        
        const solution = new Solution({
            problemId,
            studentId: dummyStudentId,
            teamLeaderName: team_leader_name,
            age,
            totalMembers: total_members,
            solutionDescription: solution_description,
            implementationPlan: implementation_plan
        });
        
        await solution.save();
        res.json({ message: 'Solution submitted successfully' });
    } catch (error) {
        console.error('Submit solution error:', error);
        res.status(500).json({ error: 'Failed to submit solution' });
    }
});

// HR: Get all solutions
app.get('/api/solutions', async (req, res) => {
    try {
        const solutions = await Solution.find()
            .populate('problemId', 'title')
            .sort({ createdAt: -1 });
        
        const formattedSolutions = solutions.map(solution => ({
            id: solution._id,
            problemTitle: solution.problemId.title,
            team_leader_name: solution.teamLeaderName,
            age: solution.age,
            total_members: solution.totalMembers,
            solution_description: solution.solutionDescription,
            implementation_plan: solution.implementationPlan,
            created_at: solution.createdAt
        }));
        
        res.json(formattedSolutions);
    } catch (error) {
        console.error('Get solutions error:', error);
        res.status(500).json({ error: 'Failed to fetch solutions' });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});