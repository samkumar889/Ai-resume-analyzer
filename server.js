const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/api/jobs', (req, res) => {
  const jobs = db.prepare('SELECT * FROM jobs ORDER BY createdAt DESC').all();
  res.json(jobs);
});

app.post('/api/jobs', (req, res) => {
  const { title, company, location, salary, status, dateApplied, notes } = req.body;
  const stmt = db.prepare('INSERT INTO jobs (title, company, location, salary, status, dateApplied, notes) VALUES (?, ?, ?, ?, ?, ?, ?)');
  const result = stmt.run(title, company, location, salary, status, dateApplied, notes);
  const newJob = db.prepare('SELECT * FROM jobs WHERE id = ?').get(result.lastInsertRowid);
  res.json(newJob);
});

app.put('/api/jobs/:id', (req, res) => {
  const { id } = req.params;
  const { title, company, location, salary, status, dateApplied, notes } = req.body;
  const stmt = db.prepare('UPDATE jobs SET title = ?, company = ?, location = ?, salary = ?, status = ?, dateApplied = ?, notes = ? WHERE id = ?');
  stmt.run(title, company, location, salary, status, dateApplied, notes, id);
  const updatedJob = db.prepare('SELECT * FROM jobs WHERE id = ?').get(id);
  res.json(updatedJob);
});

app.patch('/api/jobs/:id/status', (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const stmt = db.prepare('UPDATE jobs SET status = ? WHERE id = ?');
  stmt.run(status, id);
  const updatedJob = db.prepare('SELECT * FROM jobs WHERE id = ?').get(id);
  res.json(updatedJob);
});

app.delete('/api/jobs/:id', (req, res) => {
  const { id } = req.params;
  db.prepare('DELETE FROM jobs WHERE id = ?').run(id);
  res.json({ message: 'Job deleted successfully' });
});

app.get('/api/stats', (req, res) => {
  const total = db.prepare('SELECT COUNT(*) as count FROM jobs').get().count;
  const interview = db.prepare('SELECT COUNT(*) as count FROM jobs WHERE status = ?').get('interview').count;
  const offer = db.prepare('SELECT COUNT(*) as count FROM jobs WHERE status = ?').get('offer').count;
  const rejected = db.prepare('SELECT COUNT(*) as count FROM jobs WHERE status = ?').get('rejected').count;
  res.json({ total, interview, offer, rejected });
});

app.post('/api/resume/analyze', upload.single('resume'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const skills = ['JavaScript', 'Python', 'React', 'Node.js', 'SQL', 'Git', 'CSS', 'HTML', 'TypeScript', 'AWS', 'Docker', 'MongoDB'];
  const randomSkills = skills.sort(() => 0.5 - Math.random()).slice(0, 5 + Math.floor(Math.random() * 3));
  const score = Math.floor(Math.random() * 30) + 70;

  const suggestions = [
    'Add more quantifiable achievements to your experience section',
    'Include keywords from the job description to pass ATS filters',
    'Keep your resume to 1-2 pages maximum',
    'Add a professional summary at the top',
    'Include links to your GitHub, LinkedIn, or portfolio',
    'Use action verbs to describe your responsibilities',
    'Tailor your resume for each job application'
  ];

  const analysisSuggestions = suggestions.sort(() => 0.5 - Math.random()).slice(0, 3 + Math.floor(Math.random() * 2));

  const stmt = db.prepare('INSERT INTO resumes (filename, originalName, analysisScore, skills, suggestions) VALUES (?, ?, ?, ?, ?)');
  stmt.run(
    req.file.filename,
    req.file.originalname,
    score,
    JSON.stringify(randomSkills),
    JSON.stringify(analysisSuggestions)
  );

  res.json({
    score,
    skills: randomSkills,
    suggestions: analysisSuggestions,
    filename: req.file.filename
  });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
