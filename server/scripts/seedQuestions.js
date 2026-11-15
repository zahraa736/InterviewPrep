import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Question from '../models/Question.js';

dotenv.config();

const questions = [
  {
    category: 'Technical',
    questionText: 'What is the difference between let, const, and var in JavaScript?',
    suggestedAnswer: 'Explain that let and const are block-scoped while var is function-scoped. const cannot be reassigned, and let can. Mention that var declarations are hoisted and can be redeclared, which can make code harder to predict.'
  },
  {
    category: 'Technical',
    questionText: 'How does the JavaScript event loop work?',
    suggestedAnswer: 'Describe how synchronous code runs on the call stack, while asynchronous callbacks wait in task queues. The event loop moves ready callbacks to the stack when it is empty, allowing JavaScript to handle non-blocking work.'
  },
  {
    category: 'Technical',
    questionText: 'What is a REST API?',
    suggestedAnswer: 'A REST API exposes resources through predictable URLs and standard HTTP methods such as GET, POST, PUT, and DELETE. It is stateless, so each request contains the information needed to process it.'
  },
  {
    category: 'Technical',
    questionText: 'What is the difference between SQL and NoSQL databases?',
    suggestedAnswer: 'SQL databases use relational tables and a structured schema, while NoSQL databases use models such as documents or key-value pairs and often allow more flexible schemas. The best choice depends on the data relationships and application needs.'
  },
  {
    category: 'Technical',
    questionText: 'Why are database indexes useful?',
    suggestedAnswer: 'Indexes help a database find records without scanning every document or row. They improve read performance, but they use storage and can make writes slightly slower because the index must also be updated.'
  },
  {
    category: 'Technical',
    questionText: 'What is the difference between props and state in React?',
    suggestedAnswer: 'Props are values passed into a component by its parent. State is data managed inside a component and can change over time. Updating state causes React to render the component again.'
  },
  {
    category: 'Technical',
    questionText: 'What is the purpose of the useEffect hook in React?',
    suggestedAnswer: 'useEffect runs side effects after rendering, such as fetching data, starting a timer, or adding an event listener. Its dependency array controls when it runs, and its cleanup function prevents leaks.'
  },
  {
    category: 'Technical',
    questionText: 'What do common HTTP status codes 200, 400, 401, 404, and 500 mean?',
    suggestedAnswer: '200 means success, 400 means the request is invalid, 401 means authentication is required or invalid, 404 means the resource was not found, and 500 means the server encountered an unexpected error.'
  },
  {
    category: 'Technical',
    questionText: 'What is the difference between git merge and git rebase?',
    suggestedAnswer: 'Merge combines histories and creates a merge commit when needed. Rebase moves commits onto a new base to create a linear history. Rebase should be used carefully on commits that other people may already use.'
  },
  {
    category: 'Technical',
    questionText: 'How should passwords be stored securely?',
    suggestedAnswer: 'Passwords should never be stored as plain text. They should be hashed with a slow password-hashing algorithm such as bcrypt and a unique salt. Login compares the submitted password with the stored hash.'
  },
  {
    category: 'Behavioral',
    questionText: 'Tell me about a difficult challenge you solved.',
    suggestedAnswer: 'Use the STAR structure: explain the situation, your task, the specific actions you took, and the result. Focus on your reasoning, what you contributed, and what you learned.'
  },
  {
    category: 'Behavioral',
    questionText: 'Describe a time you had a disagreement with a teammate.',
    suggestedAnswer: 'Choose an example where you listened carefully, focused on the shared goal, and used facts to reach a solution. Show respect for the teammate and explain the positive outcome.'
  },
  {
    category: 'Behavioral',
    questionText: 'Tell me about a time you failed or made a mistake.',
    suggestedAnswer: 'Be honest about a real mistake without blaming others. Explain how you took responsibility, corrected the issue, and changed your process so the same problem would be less likely to happen again.'
  },
  {
    category: 'Behavioral',
    questionText: 'How have you responded to constructive feedback?',
    suggestedAnswer: 'Share feedback that helped you improve. Explain how you asked questions, applied the advice, and followed up through a measurable change in your work or behavior.'
  },
  {
    category: 'Behavioral',
    questionText: 'Describe a time you had to manage competing priorities.',
    suggestedAnswer: 'Explain how you assessed urgency and impact, broke work into steps, communicated expectations, and adjusted when priorities changed. Include the final result.'
  },
  {
    category: 'Behavioral',
    questionText: 'Tell me about a time you showed leadership.',
    suggestedAnswer: 'Leadership does not require a formal title. Describe how you created clarity, supported others, made a decision, or helped a group reach a goal, then explain the outcome.'
  },
  {
    category: 'Behavioral',
    questionText: 'Describe a situation where the requirements were unclear.',
    suggestedAnswer: 'Show how you handled ambiguity by identifying assumptions, asking focused questions, gathering information, and agreeing on the next step before investing too much time.'
  },
  {
    category: 'Behavioral',
    questionText: 'Tell me about a time you worked under a tight deadline.',
    suggestedAnswer: 'Describe how you planned the essential work, reduced risk, communicated progress, and protected quality. Avoid suggesting that working unsustainable hours was the only solution.'
  },
  {
    category: 'Behavioral',
    questionText: 'What role do you usually take when working in a team?',
    suggestedAnswer: 'Explain the role you naturally contribute while showing that you can adapt. Support the answer with a short example of how your contribution helped the whole team succeed.'
  },
  {
    category: 'Behavioral',
    questionText: 'Tell me about something you had to learn quickly.',
    suggestedAnswer: 'Explain why the new skill was needed, how you found reliable learning resources, how you practiced, and how you applied the knowledge to produce a useful result.'
  },
  {
    category: 'General',
    questionText: 'Tell me about yourself.',
    suggestedAnswer: 'Give a concise professional summary: where you are now, relevant experience or studies, one or two strengths, and why this opportunity is a logical next step. Keep the answer focused on the role.'
  },
  {
    category: 'General',
    questionText: 'Why are you interested in this role?',
    suggestedAnswer: 'Connect specific responsibilities in the role with your skills, interests, and goals. Show that you understand the position instead of giving an answer that could apply to any job.'
  },
  {
    category: 'General',
    questionText: 'What are your greatest strengths?',
    suggestedAnswer: 'Choose two or three strengths that matter for the role and support each one with brief evidence. Focus on qualities you can demonstrate rather than a list of generic adjectives.'
  },
  {
    category: 'General',
    questionText: 'What is one weakness you are working to improve?',
    suggestedAnswer: 'Choose a genuine but manageable weakness. Explain the practical steps you are taking to improve and the progress you have already made.'
  },
  {
    category: 'General',
    questionText: 'Why do you want to work for this organization?',
    suggestedAnswer: 'Mention specific aspects of the organization such as its work, values, products, or learning opportunities. Connect them to what you can contribute and what you hope to develop.'
  },
  {
    category: 'General',
    questionText: 'Where do you see yourself in five years?',
    suggestedAnswer: 'Describe a realistic direction focused on growing skills, taking on responsibility, and creating value. Show ambition while remaining flexible about the exact title or path.'
  },
  {
    category: 'General',
    questionText: 'Why should we hire you?',
    suggestedAnswer: 'Summarize the strongest match between the role and your skills, experience, and motivation. Add a short example that proves you can contribute instead of only making claims.'
  },
  {
    category: 'General',
    questionText: 'How would you explain a gap or change in your experience?',
    suggestedAnswer: 'Keep the explanation brief, honest, and positive. State what happened, mention any useful learning or responsibilities during that time, and refocus on why you are ready for this opportunity.'
  },
  {
    category: 'General',
    questionText: 'What are your salary expectations?',
    suggestedAnswer: 'Research a reasonable range for the role and location. Give a flexible range, explain that it depends on the full responsibilities and package, and avoid presenting an unsupported number.'
  },
  {
    category: 'General',
    questionText: 'What questions do you have for us?',
    suggestedAnswer: 'Ask thoughtful questions about success in the role, the team, current priorities, feedback, and growth. Avoid asking only questions that can be answered by reading the organization website.'
  }
];

async function seedQuestions() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    await Question.init();

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

    const result = await Question.bulkWrite(operations);
    console.log(`Question seed complete: ${result.upsertedCount} added, ${questions.length - result.upsertedCount} already existed.`);
  } catch (error) {
    console.error('Question seed failed:', error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

seedQuestions();
