'use client';

import { useState, useEffect } from 'react';
import { Terminal, Database, Play } from 'lucide-react';

export default function CodePreview() {
    const [code, setCode] = useState('');
    const fullCode = `-- Find all diamond tier students
SELECT 
  username, 
  level, 
  xp_points 
FROM students 
WHERE 
  level >= 10 
  AND inventory LIKE '%diamond_pickaxe%'
ORDER BY xp_points DESC;

-- > Query executing...
-- > 14 rows returned.`;

    useEffect(() => {
        let index = 0;
        const interval = setInterval(() => {
            setCode(fullCode.substring(0, index));
            index++;
            if (index > fullCode.length) {
                clearInterval(interval);
            }
        }, 40);

        return () => clearInterval(interval);
    }, []);

    return (
        <div className="w-full max-w-lg mx-auto bg-stone-900 rounded-none border-4 border-black shadow-pixel-lg transform rotate-1 hover:rotate-0 transition-transform duration-300">
            {/* Retro Title Bar */}
            <div className="flex items-center justify-between px-3 py-3 bg-stone-300 border-b-4 border-black">
                <div className="flex items-center gap-4">
                    <Database className="w-5 h-5 text-stone-700 flex-shrink-0" />
                    <span className="font-pixel text-xl tracking-wide text-black whitespace-nowrap">SQL_COMMAND_BLOCK</span>
                </div>
                <div className="flex gap-1">
                    <div className="w-4 h-4 bg-red-500 border-2 border-black hover:bg-red-400" />
                    <div className="w-4 h-4 bg-yellow-500 border-2 border-black hover:bg-yellow-400" />
                </div>
            </div>

            {/* Code Editor Area */}
            <div className="p-5 bg-stone-800 font-pixel text-xl leading-relaxed min-h-[300px] relative">
                <div className="absolute top-0 left-0 w-full h-[2px] bg-black/20" />
                <pre className="whitespace-pre-wrap">
                    <code className="text-stone-300">
                        {code.split('\n').map((line, i) => (
                            <div key={i} className="flex">
                                {/* Line Numbers */}
                                <span className="select-none text-stone-600 mr-4 text-right w-6 border-r-2 border-stone-700 pr-2">{i + 1}</span>
                                <span>
                                    {line.split(' ').map((word, j) => {
                                        // SQL Syntax Highlighting
                                        if (['SELECT', 'FROM', 'WHERE', 'AND', 'LIKE', 'ORDER', 'BY', 'DESC', 'ASC', 'INSERT', 'INTO'].includes(word.toUpperCase()))
                                            return <span key={j} className="text-[#FAA41A]">{word} </span>; // Gold
                                        if (word.startsWith('--')) return <span key={j} className="text-stone-500">{word} </span>;
                                        if (line.trim().startsWith('--')) return <span key={j} className="text-stone-500">{word} </span>;
                                        if (word.startsWith("'")) return <span key={j} className="text-[#4BB543]">{word} </span>; // Green
                                        if (!isNaN(word)) return <span key={j} className="text-[#3C8D2F]">{word} </span>;
                                        return <span key={j}>{word} </span>;
                                    })}
                                </span>
                            </div>
                        ))}
                        <span className="inline-block w-3 h-5 bg-[#FAA41A] animate-pulse ml-1 align-bottom"></span>
                    </code>
                </pre>

                {/* Execute Button Overlay */}
                <div className="absolute bottom-4 right-4">
                    <div className="flex items-center gap-2 bg-stone-300 border-4 border-black px-3 py-1 shadow-pixel-sm cursor-pointer hover:bg-stone-200 active:translate-y-1 active:shadow-none transition-all">
                        <Play className="w-4 h-4 text-black fill-current" />
                        <span className="text-black font-bold tracking-wide">RUN</span>
                    </div>
                </div>
            </div>


        </div>
    );
}
