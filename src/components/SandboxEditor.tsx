import React, { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { ChatMessage } from '../types';

interface Props {
  messages: ChatMessage[];
  onClose: () => void;
}

export const SandboxEditor: React.FC<Props> = ({ messages, onClose }) => {
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState<'javascript'>('javascript'); // JS ONLY
  const [output, setOutput] = useState('');

  useEffect(() => {
    setCode(`// Write your code here
function solve(input) {
  console.log('Input:', input);
  return input;
}

console.log(solve([1, 2, 3]));`);
  }, []);

  const handleRun = () => {
    setOutput('Running...\n');
    try {
      const logs = [];
      const oldLog = console.log;
      console.log = (...args) => logs.push(args.map(arg => String(arg)).join(' '));
      new Function(code)();
      console.log = oldLog;
      setOutput(logs.length ? logs.map(l => `>>> ${l}`).join('\n') : 'Executed (no output)');
    } catch (e) {
      setOutput(`${String(e)}`);
    }
  };

  const handleSave = () => {
    const blob = new Blob([code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'solution.js';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
      <div className="bg-white w-full max-w-6xl h-[90vh] rounded-2xl shadow-2xl flex flex-col">
        <div className="p-6 border-b flex justify-between">
          <h2 className="text-2xl font-bold">🛠️ Code Editor (JavaScript)</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded">✕</button>
        </div>

        <div className="flex-1 grid grid-cols-2 min-h-0">
          <Editor
            height="100%"
            language="javascript"
            value={code}
            theme="vs-dark"
            options={{ minimap: { enabled: false }, fontSize: 14 }}
            onChange={setCode}
          />
          <div className="border-l bg-gray-900 p-4">
            <div className="text-white mb-3 font-bold">Console:</div>
            <pre className="h-full overflow-auto bg-gray-800 p-3 rounded text-green-400 font-mono text-sm">
              {output || 'Write JS → click Run'}
            </pre>
          </div>
        </div>

        <div className="p-6 border-t bg-gray-50 flex gap-4">
          <button 
            onClick={handleRun}
            className="flex-1 bg-green-500 hover:bg-green-600 text-white py-4 px-6 rounded-xl font-bold"
          >
            Run Code
          </button>
          <button 
            onClick={handleSave}
            className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-4 px-6 rounded-xl font-bold"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};
