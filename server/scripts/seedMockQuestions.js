import dotenv from 'dotenv';
import mongoose from 'mongoose';
import MockQuestion from '../models/MockQuestion.js';

dotenv.config();

const questions = [
  {
    category: 'Technical',
    questionText: 'Which JavaScript keyword declares a block-scoped variable that can be reassigned?',
    options: ['var', 'let', 'const', 'static'],
    correctAnswerIndex: 1
  },
  {
    category: 'Technical',
    questionText: 'Which HTTP status code normally means a resource was not found?',
    options: ['200', '401', '404', '500'],
    correctAnswerIndex: 2
  },
  {
    category: 'Technical',
    questionText: 'What does React use to pass data from a parent component to a child component?',
    options: ['Props', 'Indexes', 'Routes', 'Schemas'],
    correctAnswerIndex: 0
  },
  {
    category: 'Technical',
    questionText: 'Which React hook is commonly used to store component state?',
    options: ['useEffect', 'useState', 'useContext', 'useMemo'],
    correctAnswerIndex: 1
  },
  {
    category: 'Technical',
    questionText: 'Which HTTP method is normally used to retrieve data without changing it?',
    options: ['GET', 'POST', 'PATCH', 'DELETE'],
    correctAnswerIndex: 0
  },
  {
    category: 'Technical',
    questionText: 'What is the main purpose of hashing a password?',
    options: ['To shorten it', 'To store it without plain text', 'To email it safely', 'To make login faster'],
    correctAnswerIndex: 1
  },
  {
    category: 'Technical',
    questionText: 'Which MongoDB query operator checks whether a value is in a list?',
    options: ['$set', '$push', '$in', '$sort'],
    correctAnswerIndex: 2
  },
  {
    category: 'Technical',
    questionText: 'What is the purpose of a database index?',
    options: ['Encrypt documents', 'Speed up searches', 'Remove duplicates automatically', 'Replace validation'],
    correctAnswerIndex: 1
  },
  {
    category: 'Technical',
    questionText: 'Which Git command creates a local copy of a remote repository?',
    options: ['git clone', 'git push', 'git merge', 'git status'],
    correctAnswerIndex: 0
  },
  {
    category: 'Technical',
    questionText: 'What does JSON stand for?',
    options: ['Java Source Object Network', 'JavaScript Object Notation', 'Joined System Output Name', 'Java Syntax Option Number'],
    correctAnswerIndex: 1
  },
  {
    category: 'Behavioral',
    questionText: 'What is the best structure for answering a question about a past experience?',
    options: ['SWOT', 'STAR', 'CRUD', 'SMART only'],
    correctAnswerIndex: 1
  },
  {
    category: 'Behavioral',
    questionText: 'When describing a team success, what should you do?',
    options: ['Take all the credit', 'Avoid mentioning your role', 'Explain your contribution and recognize the team', 'Only discuss the final grade'],
    correctAnswerIndex: 2
  },
  {
    category: 'Behavioral',
    questionText: 'What is the strongest way to discuss a mistake?',
    options: ['Blame unclear instructions', 'Say you never make mistakes', 'Explain responsibility, correction, and learning', 'Change the subject'],
    correctAnswerIndex: 2
  },
  {
    category: 'Behavioral',
    questionText: 'How should you describe a disagreement with a teammate?',
    options: ['Focus on winning the argument', 'Show listening and a shared solution', 'Criticize the teammate', 'Say disagreements are always harmful'],
    correctAnswerIndex: 1
  },
  {
    category: 'Behavioral',
    questionText: 'What should a good answer about working under pressure include?',
    options: ['Only that you worked late', 'Planning, communication, and the result', 'A complaint about the deadline', 'No specific example'],
    correctAnswerIndex: 1
  },
  {
    category: 'Behavioral',
    questionText: 'When requirements are unclear, what is the best first response?',
    options: ['Guess silently', 'Wait until someone notices', 'Ask focused questions and confirm assumptions', 'Abandon the task'],
    correctAnswerIndex: 2
  },
  {
    category: 'Behavioral',
    questionText: 'Which example best demonstrates leadership without a formal title?',
    options: ['Ignoring a blocked teammate', 'Helping the team organize and reach a shared goal', 'Doing only assigned tasks', 'Making every decision alone'],
    correctAnswerIndex: 1
  },
  {
    category: 'Behavioral',
    questionText: 'How should you respond to constructive feedback in an interview example?',
    options: ['Show how you applied it and improved', 'Say the feedback was unfair', 'Avoid giving details', 'Claim you do not need feedback'],
    correctAnswerIndex: 0
  },
  {
    category: 'Behavioral',
    questionText: 'What makes an example about learning a new skill effective?',
    options: ['Naming the skill only', 'Explaining the learning process and application', 'Saying it was easy', 'Avoiding the outcome'],
    correctAnswerIndex: 1
  },
  {
    category: 'Behavioral',
    questionText: 'When discussing competing priorities, what should you emphasize?',
    options: ['Doing tasks randomly', 'Impact, urgency, and communication', 'Ignoring stakeholders', 'Working on every task at once'],
    correctAnswerIndex: 1
  },
  {
    category: 'General',
    questionText: 'What should the answer to “Tell me about yourself” mainly focus on?',
    options: ['Your complete life story', 'Relevant background and connection to the role', 'Unrelated hobbies only', 'Personal information the employer did not request'],
    correctAnswerIndex: 1
  },
  {
    category: 'General',
    questionText: 'What is the best way to answer “Why do you want this role?”',
    options: ['Discuss only the salary', 'Connect the role to your skills and goals', 'Give an answer that fits every job', 'Say you applied randomly'],
    correctAnswerIndex: 1
  },
  {
    category: 'General',
    questionText: 'How should you present a professional strength?',
    options: ['Support it with a relevant example', 'List many adjectives quickly', 'Compare yourself negatively to others', 'Avoid evidence'],
    correctAnswerIndex: 0
  },
  {
    category: 'General',
    questionText: 'What is a good approach when discussing a weakness?',
    options: ['Claim to have none', 'Choose a weakness and explain improvement steps', 'Choose a core requirement you refuse to learn', 'Blame previous teammates'],
    correctAnswerIndex: 1
  },
  {
    category: 'General',
    questionText: 'Why should you research an organization before an interview?',
    options: ['To memorize every employee name', 'To give specific reasons for your interest', 'To avoid asking any questions', 'To copy its website text'],
    correctAnswerIndex: 1
  },
  {
    category: 'General',
    questionText: 'What is the best tone for an interview answer?',
    options: ['Clear, professional, and conversational', 'Extremely casual', 'Memorized and robotic', 'Defensive'],
    correctAnswerIndex: 0
  },
  {
    category: 'General',
    questionText: 'How long should most interview answers be?',
    options: ['As long as possible', 'Focused enough to answer with useful detail', 'One word', 'Exactly ten minutes'],
    correctAnswerIndex: 1
  },
  {
    category: 'General',
    questionText: 'What should you do if you do not understand an interview question?',
    options: ['Pretend you understood', 'Ask politely for clarification', 'Give an unrelated answer', 'End the interview'],
    correctAnswerIndex: 1
  },
  {
    category: 'General',
    questionText: 'Which question is appropriate to ask an interviewer?',
    options: ['What does success look like in this role?', 'Can I skip difficult tasks?', 'Did I get the job?', 'How soon can I stop learning?'],
    correctAnswerIndex: 0
  },
  {
    category: 'General',
    questionText: 'What is the best way to close an interview?',
    options: ['Leave without speaking', 'Thank the interviewer and confirm your interest', 'Demand an immediate decision', 'Introduce a new unrelated topic'],
    correctAnswerIndex: 1
  }
];

async function seedMockQuestions() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    await MockQuestion.init();

    const operations = questions.map((question) => ({
      updateOne: {
        filter: {
          category: question.category,
          questionText: question.questionText
        },
        update: { $setOnInsert: question },
        upsert: true
      }
    }));

    const result = await MockQuestion.bulkWrite(operations);
    console.log(`Mock question seed complete: ${result.upsertedCount} added, ${questions.length - result.upsertedCount} already existed.`);
  } catch (error) {
    console.error('Mock question seed failed:', error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

seedMockQuestions();
