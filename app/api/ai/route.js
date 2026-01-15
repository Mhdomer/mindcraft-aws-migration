// AI endpoint using Firebase AI Logic SDK (Gemini)
// POST /api/ai
// Request JSON:
// {
//   action: "improve_lesson" | "generate_exercises" | "generate_mcq" | "coding_help" | "explain_concept",
//   input: string,
//   language: "en" | "bm",
//   options?: { difficulty?: string, numQuestions?: number, includeSampleCode?: boolean },
//   teacherId?: string
// }
//
// Uses Firebase AI Logic SDK to call Gemini models

import { NextResponse } from 'next/server';
import { generateText, generateWithHistory, generateJSON } from '@/lib/firebase-ai';

function sampleImproveLesson(includeSampleCode = true, language = 'en') {
	return {
		language,
		summary: 'Introduction to variables and data types in programming.',
		objectives: [
			'Explain what a variable is and why it is useful',
			'Identify common data types (number, string, boolean)',
			'Write simple code that uses variables',
		],
		examples: [
			includeSampleCode
				? {
					code: "let name = 'Aisha';\nlet age = 16;\nlet isStudent = true;",
					explain:
						"We create three variables: a string (name), a number (age), and a boolean (isStudent).",
				}
				: { code: '', explain: 'Example omitted (no code requested).' },
		],
		exercises: [
			{
				type: 'short',
				prompt: 'Create a variable called totalScore and set it to 0. What type is it?',
				answer: 'number',
				rubric: 'Answer identifies the data type correctly and initializes a variable.',
			},
		],
	};
}

function sampleGenerateExercises(numQuestions = 5, difficulty = 'beginner') {
	const count = Math.max(1, Math.min(20, Number(numQuestions) || 5));
	const items = Array.from({ length: count }).map((_, i) => ({
		id: i + 1,
		type: i % 2 === 0 ? 'mcq' : 'short',
		prompt:
			i % 2 === 0
				? `Which data type best fits the value "Hello"? (${difficulty})`
				: `Explain what a boolean is in one sentence. (${difficulty})`,
		choices: i % 2 === 0 ? ['number', 'string', 'boolean', 'array'] : undefined,
		answer: i % 2 === 0 ? 1 : 'A boolean is either true or false.',
		rubric:
			i % 2 === 0
				? 'Correct index should be 1 (string).'
				: 'Statement should mention true/false explicitly.',
	}));
	return { difficulty, questions: items };
}

function sampleGenerateMcq(numQuestions = 5) {
	const count = Math.max(1, Math.min(20, Number(numQuestions) || 5));
	const questions = Array.from({ length: count }).map((_, i) => ({
		q: `What is the result of 2 + ${i}?`,
		choices: [String(1 + i), String(2 + i), String(3 + i), String(4 + i)],
		answer: 1,
		note: 'Simple arithmetic check; ensure students can add integers.',
	}));
	return { questions };
}

function sampleGenerateAssignment(courseTitle = '', courseDescription = '') {
	// Generate assignment scaffold based on course topic
	const topic = courseTitle || 'Programming';
	
	// Sample assignment titles based on common programming topics
	const titleTemplates = {
		'python': 'Python Programming Project: Data Structures Implementation',
		'javascript': 'JavaScript Web Application: Interactive Features',
		'java': 'Java Object-Oriented Programming: Class Design',
		'html': 'HTML/CSS Portfolio Website Project',
		'css': 'Responsive Web Design Challenge',
		'web': 'Full-Stack Web Application Development',
		'programming': 'Programming Fundamentals: Problem Solving Project',
		'data': 'Data Structures and Algorithms Assignment',
		'database': 'Database Design and Implementation Project',
	};
	
	// Find matching template or use generic
	let assignmentTitle = titleTemplates['programming']; // default
	for (const [key, value] of Object.entries(titleTemplates)) {
		if (topic.toLowerCase().includes(key)) {
			assignmentTitle = value;
			break;
		}
	}
	
	// Generate description scaffold
	const description = `<h2>Assignment Overview</h2>
<p>This assignment will help you apply the concepts learned in <strong>${courseTitle || 'this course'}</strong>.</p>

<h3>Learning Objectives</h3>
<ul>
	<li>Demonstrate understanding of core concepts</li>
	<li>Apply practical problem-solving skills</li>
	<li>Create a functional solution</li>
	<li>Document your code and process</li>
</ul>

<h3>Requirements</h3>
<ol>
	<li>Read and understand the problem statement</li>
	<li>Design your solution approach</li>
	<li>Implement the solution</li>
	<li>Test your implementation</li>
	<li>Submit your work with proper documentation</li>
</ol>

<h3>Submission Guidelines</h3>
<ul>
	<li>Submit all source code files</li>
	<li>Include a README file explaining your approach</li>
	<li>Add comments to your code for clarity</li>
	<li>Ensure your code follows best practices</li>
</ul>

<h3>Evaluation Criteria</h3>
<ul>
	<li>Correctness of implementation (40%)</li>
	<li>Code quality and organization (30%)</li>
	<li>Documentation and comments (20%)</li>
	<li>Problem-solving approach (10%)</li>
</ul>

<p><em>Note: This is a scaffold template. Please customize the requirements, objectives, and evaluation criteria based on your specific assignment needs.</em></p>`;
	
	return {
		title: assignmentTitle,
		description: description,
	};
}

function sampleGenerateAssessment(courseTitle = '', courseDescription = '', type = 'quiz', numQuestions = 5) {
	const topic = courseTitle || 'Programming';
	
	const titleTemplates = {
		'python': 'Python Fundamentals Assessment',
		'javascript': 'JavaScript Concepts Quiz',
		'java': 'Java Programming Assessment',
		'html': 'HTML/CSS Knowledge Test',
		'css': 'CSS Styling Quiz',
		'web': 'Web Development Assessment',
		'programming': 'Programming Fundamentals Quiz',
		'data': 'Data Structures Assessment',
		'database': 'Database Concepts Quiz',
	};
	
	let assessmentTitle = titleTemplates['programming'];
	for (const [key, value] of Object.entries(titleTemplates)) {
		if (topic.toLowerCase().includes(key)) {
			assessmentTitle = value;
			break;
		}
	}
	
	const description = `<h2>Assessment Overview</h2>
<p>This assessment will test your understanding of concepts covered in <strong>${courseTitle || 'this course'}</strong>.</p>

<h3>Instructions</h3>
<ul>
	<li>Read each question carefully</li>
	<li>Select the best answer for multiple choice questions</li>
	<li>Provide detailed answers for text-based questions</li>
	<li>Review your answers before submitting</li>
</ul>

<p><em>Good luck!</em></p>`;

	// Generate sample questions
	const questions = Array.from({ length: numQuestions }).map((_, i) => {
		if (type === 'quiz' || type === 'mcq') {
			return {
				type: 'mcq',
				question: `Question ${i + 1}: Which of the following best describes ${topic.toLowerCase()}?`,
				options: [
					`Option A: First choice`,
					`Option B: Second choice`,
					`Option C: Third choice`,
					`Option D: Fourth choice`,
				],
				correctAnswer: i % 4,
				points: 1,
			};
		} else {
			return {
				type: 'text',
				question: `Question ${i + 1}: Explain the concept of ${topic.toLowerCase()} in your own words.`,
				correctAnswer: `Sample answer for ${topic.toLowerCase()} concept.`,
				points: 2,
			};
		}
	});
	
	return {
		title: assessmentTitle,
		description: description,
		questions: questions,
	};
}

// US012-01: Coding Help - Sample responses with language support
function sampleCodingHelp(userInput, conversationHistory = [], language = 'en') {
	const inputLower = userInput.toLowerCase();
	const isBM = language === 'bm';
	
	// Detect common coding issues - English
	if (!isBM && (inputLower.includes('error') || inputLower.includes('bug') || inputLower.includes('not working'))) {
		return {
			response: `I can help you debug this issue! Based on your description, here are some common solutions:\n\n1. **Check for syntax errors**: Look for missing brackets, semicolons, or typos in variable names.\n2. **Verify variable scope**: Make sure variables are declared in the correct scope.\n3. **Check data types**: Ensure you're using the correct data types for your operations.\n\nIf you can share the specific error message or code snippet, I can provide more targeted help!`,
			suggestions: [
				'Check the console for error messages',
				'Verify your variable declarations',
				'Test with simpler code first'
			]
		};
	}
	
	// Detect common coding issues - Bahasa Melayu
	if (isBM && (inputLower.includes('ralat') || inputLower.includes('error') || inputLower.includes('bug') || inputLower.includes('tidak berfungsi') || inputLower.includes('tak jalan'))) {
		return {
			response: `Saya boleh membantu anda menyelesaikan masalah ini! Berdasarkan penerangan anda, berikut adalah beberapa penyelesaian biasa:\n\n1. **Semak ralat sintaks**: Cari kurungan yang hilang, semikolon, atau kesilapan ejaan dalam nama pembolehubah.\n2. **Sahkan skop pembolehubah**: Pastikan pembolehubah diisytiharkan dalam skop yang betul.\n3. **Semak jenis data**: Pastikan anda menggunakan jenis data yang betul untuk operasi anda.\n\nJika anda boleh berkongsi mesej ralat khusus atau coretan kod, saya boleh memberikan bantuan yang lebih tepat!`,
			suggestions: [
				'Semak konsol untuk mesej ralat',
				'Sahkan pengisytiharan pembolehubah anda',
				'Uji dengan kod yang lebih mudah dahulu'
			]
		};
	}
	
	// Loops - English
	if (!isBM && (inputLower.includes('loop') || inputLower.includes('for') || inputLower.includes('while'))) {
		return {
			response: `Here's how loops work in programming:\n\n**For Loop Example:**\n\`\`\`javascript\nfor (let i = 0; i < 5; i++) {\n  console.log(i);\n}\n\`\`\`\n\nThis loop will print numbers 0 through 4. The three parts are:\n- Initialization: \`let i = 0\` - starts the counter\n- Condition: \`i < 5\` - continues while true\n- Increment: \`i++\` - increases counter each iteration\n\nWould you like me to explain a specific loop concept in more detail?`,
			suggestions: [
				'Explain while loops',
				'Show nested loops example',
				'Help with loop conditions'
			]
		};
	}
	
	// Loops - Bahasa Melayu
	if (isBM && (inputLower.includes('gelung') || inputLower.includes('loop') || inputLower.includes('for') || inputLower.includes('while'))) {
		return {
			response: `Inilah cara gelung berfungsi dalam pengaturcaraan:\n\n**Contoh For Loop:**\n\`\`\`javascript\nfor (let i = 0; i < 5; i++) {\n  console.log(i);\n}\n\`\`\`\n\nGelung ini akan mencetak nombor 0 hingga 4. Tiga bahagian adalah:\n- Permulaan: \`let i = 0\` - memulakan pembilang\n- Syarat: \`i < 5\` - teruskan selagi benar\n- Kenaikan: \`i++\` - meningkatkan pembilang setiap lelaran\n\nAdakah anda ingin saya menerangkan konsep gelung tertentu dengan lebih terperinci?`,
			suggestions: [
				'Terangkan gelung while',
				'Tunjukkan contoh gelung bersarang',
				'Bantu dengan syarat gelung'
			]
		};
	}
	
	// Functions - English
	if (!isBM && (inputLower.includes('function') || inputLower.includes('method'))) {
		return {
			response: `Functions are reusable blocks of code. Here's a basic example:\n\n\`\`\`javascript\nfunction greet(name) {\n  return "Hello, " + name + "!";\n}\n\nconsole.log(greet("Student")); // Output: Hello, Student!\n\`\`\`\n\n**Key concepts:**\n- **Parameters**: Values passed into the function (like \`name\`)\n- **Return**: What the function gives back\n- **Call**: Using the function with \`greet("Student")\`\n\nWhat specific aspect of functions would you like to explore?`,
			suggestions: [
				'Explain arrow functions',
				'Show function parameters',
				'Help with return values'
			]
		};
	}
	
	// Functions - Bahasa Melayu
	if (isBM && (inputLower.includes('fungsi') || inputLower.includes('function') || inputLower.includes('kaedah') || inputLower.includes('method'))) {
		return {
			response: `Fungsi adalah blok kod yang boleh digunakan semula. Berikut adalah contoh asas:\n\n\`\`\`javascript\nfunction greet(name) {\n  return "Hello, " + name + "!";\n}\n\nconsole.log(greet("Pelajar")); // Output: Hello, Pelajar!\n\`\`\`\n\n**Konsep utama:**\n- **Parameter**: Nilai yang diluluskan ke dalam fungsi (seperti \`name\`)\n- **Return**: Apa yang fungsi berikan kembali\n- **Panggilan**: Menggunakan fungsi dengan \`greet("Pelajar")\`\n\nAspek fungsi tertentu yang manakah yang anda ingin terokai?`,
			suggestions: [
				'Terangkan fungsi arrow',
				'Tunjukkan parameter fungsi',
				'Bantu dengan nilai return'
			]
		};
	}
	
	// Default response - English
	if (!isBM) {
		return {
			response: `I'd be happy to help you with your coding question! Based on what you've asked, here's some guidance:\n\n**General Tips:**\n1. Break down complex problems into smaller steps\n2. Test your code frequently\n3. Read error messages carefully - they often point to the issue\n4. Use console.log() to debug and see what values your variables have\n\nCould you provide more details about what you're trying to accomplish? I can give more specific help with:\n- Code syntax and structure\n- Logic errors and debugging\n- Understanding programming concepts\n- Best practices`,
			suggestions: [
				'Explain the concept in simpler terms',
				'Show a code example',
				'Help debug an error'
			]
		};
	}
	
	// Default response - Bahasa Melayu
	return {
		response: `Saya gembira membantu anda dengan soalan pengaturcaraan anda! Berdasarkan apa yang anda tanya, berikut adalah beberapa panduan:\n\n**Petua Umum:**\n1. Pecahkan masalah kompleks kepada langkah yang lebih kecil\n2. Uji kod anda dengan kerap\n3. Baca mesej ralat dengan teliti - mereka sering menunjukkan masalah\n4. Gunakan console.log() untuk debug dan lihat nilai pembolehubah anda\n\nBolehkah anda memberikan lebih banyak butiran tentang apa yang anda cuba capai? Saya boleh memberikan bantuan yang lebih khusus dengan:\n- Sintaks dan struktur kod\n- Ralat logik dan debug\n- Memahami konsep pengaturcaraan\n- Amalan terbaik`,
		suggestions: [
			'Terangkan konsep dalam istilah yang lebih mudah',
			'Tunjukkan contoh kod',
			'Bantu debug ralat'
		]
	};
}

// US012-02: Concept Explanation - Sample responses with regeneration and language support
function sampleExplainConcept(concept, regenerate = false, language = 'en') {
	const conceptLower = concept.toLowerCase();
	const isBM = language === 'bm';
	
	// English explanations
	const explanationsEN = {
		'variable': [
			'A variable is like a labeled box where you store information. For example, `let age = 16` creates a box labeled "age" containing the number 16.',
			'Variables are containers that hold data values. Think of them as named storage locations in your computer\'s memory that you can use to store and retrieve information.',
			'In programming, a variable is a way to give a name to a value so you can reuse it. It\'s similar to how in math, you might say "let x = 5" to represent a number.'
		],
		'function': [
			'A function is a reusable block of code that performs a specific task. It\'s like a recipe - you write it once, then use it whenever you need that task done.',
			'Functions are self-contained blocks of code that take inputs (parameters), process them, and return outputs. They help avoid repeating code.',
			'Think of a function as a machine: you put something in (input), it does work, and gives you something back (output). This makes your code organized and reusable.'
		],
		'array': [
			'An array is a list of items stored in order. Like a shopping list: ["milk", "bread", "eggs"] - each item has a position (index) starting from 0.',
			'Arrays are collections of data stored in a specific order. You can access items by their position number, add new items, or remove existing ones.',
			'Think of an array as a numbered list where each item has a position. The first item is at position 0, the second at position 1, and so on.'
		],
		'object': [
			'An object groups related data together. Like a student record: {name: "Ali", age: 16, grade: "A"} - each piece of information is labeled.',
			'Objects are collections of key-value pairs. Each key is a label, and each value is the data associated with that label.',
			'Objects are like filing cabinets where each drawer (key) contains specific information (value). They help organize related data together.'
		]
	};
	
	// Bahasa Melayu explanations
	const explanationsBM = {
		'pembolehubah': [
			'Pembolehubah adalah seperti kotak berlabel di mana anda menyimpan maklumat. Sebagai contoh, `let age = 16` mencipta kotak berlabel "age" yang mengandungi nombor 16.',
			'Pembolehubah adalah bekas yang menyimpan nilai data. Fikirkan mereka sebagai lokasi simpanan bernama dalam ingatan komputer anda yang boleh anda gunakan untuk menyimpan dan mengambil maklumat.',
			'Dalam pengaturcaraan, pembolehubah adalah cara untuk memberikan nama kepada nilai supaya anda boleh menggunakannya semula. Ia serupa dengan bagaimana dalam matematik, anda mungkin mengatakan "let x = 5" untuk mewakili nombor.'
		],
		'fungsi': [
			'Fungsi adalah blok kod yang boleh digunakan semula yang melakukan tugas tertentu. Ia seperti resipi - anda menulisnya sekali, kemudian menggunakannya setiap kali anda memerlukan tugas itu dilakukan.',
			'Fungsi adalah blok kod yang berdiri sendiri yang mengambil input (parameter), memprosesnya, dan mengembalikan output. Mereka membantu mengelakkan pengulangan kod.',
			'Fikirkan fungsi sebagai mesin: anda memasukkan sesuatu (input), ia melakukan kerja, dan memberikan sesuatu kembali (output). Ini menjadikan kod anda teratur dan boleh digunakan semula.'
		],
		'array': [
			'Array adalah senarai item yang disimpan mengikut urutan. Seperti senarai membeli-belah: ["susu", "roti", "telur"] - setiap item mempunyai kedudukan (indeks) bermula dari 0.',
			'Array adalah koleksi data yang disimpan dalam urutan tertentu. Anda boleh mengakses item mengikut nombor kedudukan, menambah item baru, atau membuang yang sedia ada.',
			'Fikirkan array sebagai senarai bernombor di mana setiap item mempunyai kedudukan. Item pertama berada di kedudukan 0, yang kedua di kedudukan 1, dan seterusnya.'
		],
		'objek': [
			'Objek mengumpulkan data yang berkaitan bersama. Seperti rekod pelajar: {name: "Ali", age: 16, grade: "A"} - setiap maklumat dilabelkan.',
			'Objek adalah koleksi pasangan kunci-nilai. Setiap kunci adalah label, dan setiap nilai adalah data yang dikaitkan dengan label itu.',
			'Objek adalah seperti kabinet fail di mana setiap laci (kunci) mengandungi maklumat tertentu (nilai). Mereka membantu mengatur data yang berkaitan bersama.'
		]
	};
	
	const explanations = isBM ? explanationsBM : explanationsEN;
	const conceptMap = isBM ? {
		'variable': 'pembolehubah',
		'pembolehubah': 'pembolehubah',
		'function': 'fungsi',
		'fungsi': 'fungsi',
		'array': 'array',
		'object': 'objek',
		'objek': 'objek'
	} : {
		'variable': 'variable',
		'function': 'function',
		'array': 'array',
		'object': 'object',
		'pembolehubah': 'variable',
		'fungsi': 'function',
		'objek': 'object'
	};
	
	// Find matching concept
	for (const [key, variants] of Object.entries(explanations)) {
		if (conceptLower.includes(key) || (conceptMap[conceptLower] && conceptMap[conceptLower] === key)) {
			const index = regenerate ? Math.floor(Math.random() * variants.length) : 0;
			const simplified = isBM ? 
				(key === 'pembolehubah' ? 'Kotak simpanan dengan nama' : 
				 key === 'fungsi' ? 'Resipi kod yang boleh digunakan semula' : 
				 key === 'array' ? 'Senarai item yang teratur' : 'Bekas data berlabel') :
				(key === 'variable' ? 'A storage box with a name' : 
				 key === 'function' ? 'A reusable code recipe' : 
				 key === 'array' ? 'An ordered list of items' : 'A labeled data container');
			
			const examples = key === 'variable' || key === 'pembolehubah' ? 
				['let name = "Ali"', 'let score = 100', 'let isActive = true'] : 
				key === 'function' || key === 'fungsi' ? 
				['function add(a, b) { return a + b; }', 'const greet = (name) => "Hello " + name'] :
				key === 'array' ? 
				['let fruits = ["apple", "banana"]', 'let numbers = [1, 2, 3]'] :
				['let student = {name: "Ali", age: 16}'];
			
			return {
				explanation: variants[index],
				simplified: isBM ? `Secara ringkas: ${simplified}` : `In simple terms: ${simplified}`,
				examples: examples
			};
		}
	}
	
	// Default explanation - English
	if (!isBM) {
		const defaultExplanations = [
			`"${concept}" is an important concept in programming. Let me explain it in a way that's easy to understand:\n\n**Basic Definition:**\nThis concept helps you organize and work with data in your programs.\n\n**Why it matters:**\nUnderstanding this will help you write better, more efficient code.\n\n**Key points to remember:**\n1. It's a fundamental building block\n2. Practice using it in simple examples first\n3. Once you master it, you can use it in more complex situations`,
			`Here's a straightforward explanation of "${concept}":\n\nThink of it as a tool in your programming toolkit. Just like a hammer helps you build things, this concept helps you solve programming problems.\n\n**Practical approach:**\n- Start with simple examples\n- Experiment with different variations\n- Apply it to real problems you're solving`,
			`"${concept}" can be understood as follows:\n\n**The Core Idea:**\nIt's a way to structure and manipulate information in your code.\n\n**Real-world analogy:**\nImagine organizing your school subjects - this concept helps you organize data in a similar structured way.\n\n**Learning tip:**\nTry creating small examples yourself to see how it works in practice.`
		];
		const index = regenerate ? Math.floor(Math.random() * defaultExplanations.length) : 0;
		return {
			explanation: defaultExplanations[index],
			simplified: `"${concept}" is a programming concept that helps you work with data and solve problems in your code.`,
			examples: ['Example 1: Basic usage', 'Example 2: Common pattern', 'Example 3: Advanced application']
		};
	}
	
	// Default explanation - Bahasa Melayu
	const defaultExplanationsBM = [
		`"${concept}" adalah konsep penting dalam pengaturcaraan. Biar saya terangkan dengan cara yang mudah difahami:\n\n**Definisi Asas:**\nKonsep ini membantu anda mengatur dan bekerja dengan data dalam program anda.\n\n**Mengapa ia penting:**\nMemahami ini akan membantu anda menulis kod yang lebih baik dan cekap.\n\n**Perkara utama untuk diingat:**\n1. Ia adalah blok binaan asas\n2. Amalkan menggunakannya dalam contoh mudah dahulu\n3. Setelah anda menguasainya, anda boleh menggunakannya dalam situasi yang lebih kompleks`,
		`Berikut adalah penjelasan langsung tentang "${concept}":\n\nFikirkan ia sebagai alat dalam kit alat pengaturcaraan anda. Sama seperti tukul membantu anda membina sesuatu, konsep ini membantu anda menyelesaikan masalah pengaturcaraan.\n\n**Pendekatan praktikal:**\n- Mulakan dengan contoh mudah\n- Eksperimen dengan variasi yang berbeza\n- Gunakannya pada masalah sebenar yang anda selesaikan`,
		`"${concept}" boleh difahami seperti berikut:\n\n**Idea Teras:**\nIa adalah cara untuk menyusun dan memanipulasi maklumat dalam kod anda.\n\n**Analogi dunia sebenar:**\nBayangkan mengatur subjek sekolah anda - konsep ini membantu anda mengatur data dengan cara yang serupa.\n\n**Petua pembelajaran:**\nCuba buat contoh kecil sendiri untuk melihat bagaimana ia berfungsi dalam amalan.`
	];
	const index = regenerate ? Math.floor(Math.random() * defaultExplanationsBM.length) : 0;
	return {
		explanation: defaultExplanationsBM[index],
		simplified: `"${concept}" adalah konsep pengaturcaraan yang membantu anda bekerja dengan data dan menyelesaikan masalah dalam kod anda.`,
		examples: ['Contoh 1: Penggunaan asas', 'Contoh 2: Corak biasa', 'Contoh 3: Aplikasi lanjutan']
	};
}

export async function POST(request) {
	try {
		const body = await request.json();
		const { action, input = '', language: requestLanguage = 'en', options = {} } = body || {};
		const language = requestLanguage || options.language || 'en';

		if (!action) {
			return NextResponse.json({ error: 'Missing action' }, { status: 400 });
		}

		// UC011-01: Lesson Content Generation - Real Gemini AI
		if (action === 'improve_lesson') {
			try {
				const lessonMaterial = input || options.inputText || '';
				const includeSampleCode = Boolean(options.includeSampleCode ?? true);
				const lessonTitle = options.lessonTitle || '';

				const prompt = `You are an educational content generator for database systems courses designed for secondary school students (age 16-17).

Your task is to generate structured lesson content based on the provided material. Focus on database systems topics including SQL, relational databases, data modeling, normalization, indexing, transactions, ACID properties, and database security.

${lessonTitle ? `Lesson Title: ${lessonTitle}\n\n` : ''}${lessonMaterial ? `Lesson Material:\n${lessonMaterial}\n\n` : ''}Generate structured lesson content in ${language === 'bm' ? 'Bahasa Malaysia' : 'English'} with the following format:

{
  "summary": "A brief 2-3 sentence summary of the lesson topic",
  "objectives": [
    "Learning objective 1",
    "Learning objective 2",
    "Learning objective 3"
  ],
  "explanation": "A clear, structured explanation of the concept suitable for 16-17 year old students. Use markdown formatting with headings, bullet points, and code blocks where appropriate.",
  "examples": [
    {
      "code": "${includeSampleCode ? 'SQL code example here' : ''}",
      "explain": "Explanation of what the code does and why it's important"
    }
  ],
  "exercises": [
    {
      "type": "short_answer",
      "prompt": "Practice question",
      "answer": "Expected answer",
      "rubric": "What makes a good answer"
    }
  ]
}

Guidelines:
- Keep explanations clear and age-appropriate
- Use database-focused examples (SQL queries, table design, etc.)
- Make content engaging and educational
- Include practical examples students can relate to
- Structure content with proper headings and formatting
${includeSampleCode ? '- Include SQL code examples with explanations' : '- Focus on conceptual explanations without code examples'}

Return ONLY valid JSON, no additional text before or after.`;

				const response = await generateJSON(prompt, {
					temperature: 0.7,
					maxTokens: 3000,
				});

				// Ensure response has required structure
				const formattedResponse = {
					language,
					summary: response.summary || 'Lesson content generated',
					objectives: Array.isArray(response.objectives) ? response.objectives : [],
					explanation: response.explanation || response.response || '',
					examples: Array.isArray(response.examples) ? response.examples : [],
					exercises: Array.isArray(response.exercises) ? response.exercises : [],
				};

				return NextResponse.json(formattedResponse);
			} catch (err) {
				console.error('❌ Gemini AI Error (Lesson Generation):', err.message);
				console.error('📋 Full error:', err);
				// Fallback to stub if AI fails
				const resp = sampleImproveLesson(Boolean(options.includeSampleCode ?? true), language);
				return NextResponse.json(resp);
			}
		}

		// UC011-02: Exercise Generation - Real Gemini AI
		if (action === 'generate_exercises') {
			try {
				const numQuestions = options.numQuestions ?? 5;
				const difficulty = options.difficulty || 'beginner';
				const lessonContent = input || options.lessonContent || '';

				const prompt = `You are an educational exercise generator for database systems courses designed for secondary school students (age 16-17).

Generate ${numQuestions} practice exercises based on the lesson content. Focus on database systems topics: SQL queries, table design, normalization, indexing, transactions, ACID properties, and database security.

${lessonContent ? `Lesson Content:\n${lessonContent}\n\n` : ''}Generate exercises in ${language === 'bm' ? 'Bahasa Malaysia' : 'English'} with difficulty level: ${difficulty}.

Return a JSON object with this structure:
{
  "exercises": [
    {
      "type": "mcq" | "short_answer" | "coding",
      "question": "The exercise question",
      "options": ["Option 1", "Option 2", "Option 3", "Option 4"], // Only for MCQ
      "answer": "Correct answer (string for MCQ index, string/number for short_answer, string for coding)",
      "explanation": "Brief explanation of the answer",
      "difficulty": "${difficulty}"
    }
  ]
}

Guidelines:
- Mix question types (MCQ, short answer, coding)
- For MCQ: Provide 4 options, answer should be the index (0-3) as string
- For short_answer: Answer can be string or number
- For coding: Provide SQL code question, answer is the SQL code
- Make questions age-appropriate and database-focused
- Include clear explanations

Return ONLY valid JSON, no additional text.`;

				const response = await generateJSON(prompt, {
					temperature: 0.8,
					maxTokens: 2500,
				});

				// Format response to match expected structure
				const exercises = Array.isArray(response.exercises) ? response.exercises : [];
				const formattedExercises = exercises.map((ex, idx) => ({
					id: idx + 1,
					type: ex.type || (idx % 2 === 0 ? 'mcq' : 'short_answer'),
					question: ex.question || ex.prompt || `Exercise ${idx + 1}`,
					options: ex.options || ex.choices,
					answer: ex.answer || ex.correctAnswer || '',
					explanation: ex.explanation || ex.rubric || '',
					difficulty: ex.difficulty || difficulty,
				}));

				return NextResponse.json({
					difficulty,
					questions: formattedExercises,
					exercises: formattedExercises, // Also include as 'exercises' for compatibility
				});
			} catch (err) {
				console.error('❌ Gemini AI Error (Exercise Generation):', err.message);
				console.error('📋 Full error:', err);
				// Fallback to stub if AI fails
				const resp = sampleGenerateExercises(options.numQuestions ?? 5, options.difficulty || 'beginner');
				return NextResponse.json(resp);
			}
		}
		// UC011-02: Assessment Generation - Real Gemini AI
		if (action === 'generate_assessment') {
			try {
				const courseTitle = options.courseTitle || '';
				const courseDescription = options.courseDescription || '';
				const assessmentType = options.type || 'quiz';
				const numQuestions = options.numQuestions || 5;

				const prompt = `You are an educational assessment generator for database systems courses designed for secondary school students (age 16-17).

Generate an assessment with ${numQuestions} questions based on the course information. Focus on database systems topics: SQL queries, table design, normalization, indexing, transactions, ACID properties, and database security.

Course Title: ${courseTitle || 'Database Systems'}
${courseDescription ? `Course Description: ${courseDescription}\n\n` : ''}Generate a ${assessmentType} assessment in ${language === 'bm' ? 'Bahasa Malaysia' : 'English'}.

Return a JSON object with this structure:
{
  "title": "Assessment title",
  "description": "HTML formatted description with instructions",
  "questions": [
    {
      "type": "mcq" | "text",
      "question": "The question text",
      "options": ["Option A", "Option B", "Option C", "Option D"], // Only for MCQ
      "correctAnswer": 0, // Index for MCQ (0-3), string for text questions
      "points": 1,
      "rubric": "What makes a good answer (for text questions)"
    }
  ]
}

Guidelines:
- Mix question types appropriately for ${assessmentType}
- For MCQ: Provide 4 options, correctAnswer is index (0-3)
- For text questions: correctAnswer is a sample answer string
- Make questions age-appropriate and database-focused
- Include clear, educational questions
- Description should include instructions and overview

Return ONLY valid JSON, no additional text.`;

				const response = await generateJSON(prompt, {
					temperature: 0.7,
					maxTokens: 3000,
				});

				// Ensure response has required structure
				const formattedResponse = {
					title: response.title || `${courseTitle || 'Database'} Assessment`,
					description: response.description || `<h2>Assessment Overview</h2><p>This assessment tests your understanding of database systems concepts.</p>`,
					questions: Array.isArray(response.questions) ? response.questions.map((q, idx) => ({
						type: q.type || (idx % 2 === 0 ? 'mcq' : 'text'),
						question: q.question || `Question ${idx + 1}`,
						options: q.options || (q.type === 'mcq' ? ['Option A', 'Option B', 'Option C', 'Option D'] : undefined),
						correctAnswer: q.correctAnswer !== undefined ? q.correctAnswer : (q.type === 'mcq' ? 0 : 'Sample answer'),
						points: q.points || 1,
						rubric: q.rubric || '',
					})) : [],
				};

				return NextResponse.json(formattedResponse);
			} catch (err) {
				console.error('❌ Gemini AI Error (Assessment Generation):', err.message);
				console.error('📋 Full error:', err);
				// Fallback to stub if AI fails
				const resp = sampleGenerateAssessment(
					options.courseTitle || '', 
					options.courseDescription || '',
					options.type || 'quiz',
					options.numQuestions || 5
				);
				return NextResponse.json(resp);
			}
		}

		// UC011-02: Assignment Generation - Real Gemini AI
		if (action === 'generate_assignment') {
			try {
				const courseTitle = options.courseTitle || '';
				const courseDescription = options.courseDescription || '';

				const prompt = `You are an educational assignment generator for database systems courses designed for secondary school students (age 16-17).

Generate an assignment prompt based on the course information. Focus on database systems topics: SQL queries, table design, normalization, indexing, transactions, ACID properties, and database security.

Course Title: ${courseTitle || 'Database Systems'}
${courseDescription ? `Course Description: ${courseDescription}\n\n` : ''}Generate an assignment in ${language === 'bm' ? 'Bahasa Malaysia' : 'English'}.

Return a JSON object with this structure:
{
  "title": "Assignment title",
  "description": "HTML formatted description with overview, objectives, requirements, submission guidelines, and evaluation criteria"
}

Guidelines:
- Create a practical, hands-on assignment
- Include clear learning objectives
- Provide specific requirements and deliverables
- Include submission guidelines
- Add evaluation criteria/rubric
- Make it age-appropriate and database-focused
- Use HTML formatting with headings, lists, and emphasis

Return ONLY valid JSON, no additional text.`;

				const response = await generateJSON(prompt, {
					temperature: 0.8,
					maxTokens: 2500,
				});

				// Ensure response has required structure
				const formattedResponse = {
					title: response.title || `${courseTitle || 'Database'} Assignment`,
					description: response.description || `<h2>Assignment Overview</h2><p>Complete this assignment to demonstrate your understanding of database systems.</p>`,
				};

				return NextResponse.json(formattedResponse);
			} catch (err) {
				console.error('❌ Gemini AI Error (Assignment Generation):', err.message);
				console.error('📋 Full error:', err);
				// Fallback to stub if AI fails
				const resp = sampleGenerateAssignment(options.courseTitle || '', options.courseDescription || '');
				return NextResponse.json(resp);
			}
		}

		// Legacy: MCQ generation (uses assessment generation with MCQ type)
		if (action === 'generate_mcq') {
			// Use assessment generation logic with MCQ type
			try {
				const numQuestions = options.numQuestions || 5;
				const courseTitle = options.courseTitle || 'Database Systems';
				const courseDescription = options.courseDescription || '';

				const prompt = `You are an educational MCQ generator for database systems courses designed for secondary school students (age 16-17).

Generate ${numQuestions} multiple choice questions (MCQ) focused on database systems topics: SQL queries, table design, normalization, indexing, transactions, ACID properties, and database security.

Course: ${courseTitle}
${courseDescription ? `Description: ${courseDescription}\n\n` : ''}Generate questions in ${language === 'bm' ? 'Bahasa Malaysia' : 'English'}.

Return a JSON object:
{
  "questions": [
    {
      "question": "The question text",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": 0, // Index 0-3
      "explanation": "Why this answer is correct"
    }
  ]
}

Return ONLY valid JSON.`;

				const response = await generateJSON(prompt, {
					temperature: 0.7,
					maxTokens: 2000,
				});

				const questions = Array.isArray(response.questions) ? response.questions : [];
				return NextResponse.json({ questions });
			} catch (err) {
				console.error('❌ Gemini AI Error (MCQ Generation):', err.message);
				// Fallback to stub
				const resp = sampleGenerateMcq(options.numQuestions ?? 5);
				return NextResponse.json(resp);
			}
		}
		
		// US012-01: Coding Help - Using Firebase AI (database-focused)
		if (action === 'coding_help') {
			try {
				// Check if Firebase is properly configured
				const firebaseApiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
				if (!firebaseApiKey) {
					console.error('⚠️ Firebase AI not configured: NEXT_PUBLIC_FIREBASE_API_KEY is missing');
					console.error('💡 Solution: Create a .env.local file with Firebase credentials (see .env.example)');
					throw new Error('Firebase AI not configured. Missing environment variables.');
				}

				const history = (options.conversationHistory || []).map(msg => ({
					role: msg.role === 'user' ? 'user' : 'model',
					parts: [{ text: msg.content }]
				}));

				const prompt = `You are an educational coding tutor for secondary school students (age 16-17) learning **database systems** (SQL, relational databases, data modeling, transactions, indexing).

Your responses must be:
- **Database-focused**: Whenever possible, explain things in terms of databases (tables, rows, columns, queries, schemas, normalization, indexing, transactions, ACID).
- **Educational**: Focus on teaching concepts step-by-step, not just giving answers.
- **Short**: Keep responses concise (about 2–4 paragraphs plus bullet points).
- **Informational & accurate**: Use correct database terminology.
- **Clear**: Use simple language and avoid heavy jargon.

Respond in ${language === 'bm' ? 'Bahasa Malaysia' : 'English'}.

Student's question (may be about SQL, database design, or general CS/programming concepts):
${input}

${history.length > 0 ? 'Previous conversation context is provided above. Maintain context and build on previous explanations.' : ''}

When the question is more general programming (loops, functions, arrays, etc.), try to:
- Connect the explanation back to database work (e.g., how loops help process query results, how functions help build reusable queries, etc.).

Format your response using markdown:
- Use **bold** for key terms and concepts
- Use bullet points for lists
- Use \`code\` for inline code
- Use \`\`\`sql\n...\n\`\`\` for SQL examples and \`\`\`javascript\`\`\` or similar for other code
- Keep paragraphs short (2–3 sentences)

Provide:
1. A brief, accurate explanation (prioritise database concepts when relevant)
2. A simple SQL or database-related example if appropriate
3. Key takeaway points relating back to databases/real-world systems.

Be concise, database-oriented, and educational.`;

				const response = await generateWithHistory(prompt, history, {
					temperature: 0.7,
					maxTokens: 1000
				});

				return NextResponse.json({
					response,
					suggestions: [
						language === 'bm' ? 'Tunjukkan contoh kod' : 'Show code example',
						language === 'bm' ? 'Terangkan langkah demi langkah' : 'Explain step by step',
						language === 'bm' ? 'Bantu debug ralat' : 'Help debug error'
					]
				});
			} catch (err) {
				console.error('❌ Firebase AI Error (Coding Help):', err.message);
				console.error('📋 Full error:', err);
				console.error('💡 This means the app is using hardcoded fallback responses instead of real Gemini AI.');
				console.error('🔧 To fix: Ensure .env.local exists with all NEXT_PUBLIC_FIREBASE_* variables configured.');
				// Fallback to stub if AI fails
				const resp = sampleCodingHelp(input, options.conversationHistory || [], language);
				return NextResponse.json(resp);
			}
		}
		
		// US012-02: Concept Explanation - Using Firebase AI (database-first)
		// Phase 2: Contextual AI Assistant
		if (action === 'contextual_help') {
			try {
				const userQuery = input || '';
				const pageContext = options.pageContext || {};
				const pageType = options.pageType || 'general';
				const restrictions = options.restrictions || null;

				if (!userQuery.trim()) {
					return NextResponse.json({ error: 'Query is required' }, { status: 400 });
				}

				// Build context-aware prompt
				let prompt = `You are an educational AI assistant for database systems courses designed for secondary school students (age 16-17).

Current Context:
- Page Type: ${pageType}
${pageContext.lessonId ? `- Lesson ID: ${pageContext.lessonId}\n` : ''}${pageContext.courseId ? `- Course ID: ${pageContext.courseId}\n` : ''}${restrictions ? `- Restrictions: ${restrictions}\n` : ''}

User Question: ${userQuery}

${restrictions ? `IMPORTANT: ${restrictions}\n\n` : ''}Provide a helpful, educational response in ${language === 'bm' ? 'Bahasa Malaysia' : 'English'} that:
- Answers the user's question clearly and concisely
- Uses age-appropriate language (16-17 years old)
- Focuses on database systems concepts (SQL, normalization, indexing, transactions, etc.)
- Provides examples when helpful
${restrictions ? '- Follows the restrictions above (provide hints, not direct answers)' : '- Provides full explanations and guidance'}

Response:`;

				const response = await generateText(prompt, {
					temperature: 0.7,
					maxTokens: 1500,
				});

				return NextResponse.json({
					response: response,
					pageContext,
					pageType,
				});
			} catch (err) {
				console.error('❌ Gemini AI Error (Contextual Help):', err.message);
				return NextResponse.json({
					error: 'Failed to get AI response',
					message: language === 'bm' ? 'Ralat mendapatkan respons AI' : 'Error getting AI response',
				}, { status: 500 });
			}
		}

		// Phase 4: AI-Powered Analytics Explanations
		if (action === 'explain_analytics') {
			try {
				const inputData = JSON.parse(input || '{}');
				const { chartType, chartTitle, data } = inputData;

				const prompt = `You are an educational analytics interpreter for database systems courses designed for secondary school students (age 16-17).

Analyze the following chart/statistic and provide a concise, insightful explanation in ${language === 'bm' ? 'Bahasa Malaysia' : 'English'}.

Chart Type: ${chartType || 'Unknown'}
Chart Title: ${chartTitle || 'Performance Chart'}
Data: ${JSON.stringify(data)}

Provide a 2-3 sentence explanation that:
- Explains what the chart/statistic shows about the student's learning progress
- Highlights key trends, strengths, or areas for improvement
- Uses encouraging, age-appropriate language
- Focuses on actionable insights

Keep it concise and educational. Return ONLY the explanation text, no additional formatting.`;

				const response = await generateText(prompt, {
					temperature: 0.7,
					maxTokens: 300,
				});

				return NextResponse.json({
					insight: response.trim(),
					chartType,
					chartTitle,
				});
			} catch (err) {
				console.error('❌ Gemini AI Error (Analytics Explanation):', err.message);
				return NextResponse.json({
					insight: language === 'bm' 
						? 'Tidak dapat menganalisis data pada masa ini.' 
						: 'Unable to analyze data at this time.',
				});
			}
		}

		if (action === 'explain_concept') {
			try {
				// Check if Firebase is properly configured
				const firebaseApiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
				if (!firebaseApiKey) {
					console.error('⚠️ Firebase AI not configured: NEXT_PUBLIC_FIREBASE_API_KEY is missing');
					console.error('💡 Solution: Create a .env.local file with Firebase credentials (see .env.example)');
					throw new Error('Firebase AI not configured. Missing environment variables.');
				}

				const prompt = `You are explaining computer science concepts with a **strong focus on database systems** (SQL, relational databases, data modeling, indexing, transactions, ACID, security).

Explain the concept "${input}" in ${language === 'bm' ? 'Bahasa Malaysia' : 'English'} for secondary school students (age 16-17).

Provide:
1. Clear definition (prioritise the database interpretation if "${input}" is database-related, otherwise briefly explain how it connects back to databases).
2. Simple explanation with at least one example involving tables, queries, or real database scenarios (if relevant).
3. Real-world applications in database contexts (e.g., school system, e-commerce, banking, analytics).
4. Related database and CS concepts to explore next.

Keep it educational, easy to understand, and oriented around databases wherever possible. Use markdown formatting (headings, bullet points, and code blocks) to structure the explanation.`;

				const response = await generateText(prompt, {
					temperature: 0.8,
					maxTokens: 1500
				});

				// Parse response into structured format
				const explanation = {
					definition: response.split('\n\n')[0] || response.substring(0, 200),
					explanation: response,
					examples: response.match(/[Ee]xample[s]?:?\s*(.+?)(?:\n\n|$)/g) || [],
					relatedConcepts: []
				};

				return NextResponse.json(explanation);
			} catch (err) {
				console.error('❌ Firebase AI Error (Concept Explanation):', err.message);
				console.error('📋 Full error:', err);
				console.error('💡 This means the app is using hardcoded fallback responses instead of real Gemini AI.');
				console.error('🔧 To fix: Ensure .env.local exists with all NEXT_PUBLIC_FIREBASE_* variables configured.');
				// Fallback to stub if AI fails
				const resp = sampleExplainConcept(input, options.regenerate || false, language);
				return NextResponse.json(resp);
			}
		}

		return NextResponse.json({ error: 'Unsupported action' }, { status: 400 });
	} catch (err) {
		return NextResponse.json({ error: 'AI stub failed', details: String(err) }, { status: 500 });
	}
}

// TODO(LLM): Example Gemini prompt template (for future wiring):
// "You are an instructional design assistant. Input: {lesson_text}. Task: ..."


