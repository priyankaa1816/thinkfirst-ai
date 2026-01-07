"use client";
import { useState, useCallback } from "react";
import { auth } from "../firebase"; 

export const useSandbox = (sessionId: string) => {
  const [isOpen, setIsOpen] = useState(false);

  const getDefaultCode = (lang: string) => {
    const defaults = {
      python: 'print("Hello World! This is a low-powered sandbox to try out simple commands")',
      javascript: 'console.log("Hello World! This is a low-powered js sandbox to try out simple commands");',
      java: 'class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello Java!");\n    }\n}',
      cpp: '#include <iostream>\nusing namespace std;\n\nint main() {\n    cout << "Hello C++! This is a low-powered sandbox to try out simple commands" << endl;\n    return 0;\n}',
      c: '#include <stdio.h>\n\nint main() {\n    printf("Hello C! This is a low-powered sandbox to try out simple commands\\n");\n    return 0;\n}'
    };
    return defaults[lang as keyof typeof defaults] || '';
  };
  
  const [code, setCode] = useState(getDefaultCode('python'));
  const [output, setOutput] = useState('');
  const [language, setLanguage] = useState('python');

  const getBackendUrl = () => {
    if (import.meta.env.DEV) {
      return 'http://localhost:8000/api/execute';
    }
    const backendUrl = import.meta.env.VITE_BACKEND_URL || 'https://thinkfirst-ai-backend.onrender.com';
    return `${backendUrl}/api/execute`;
  };

  const detectCodeQuestion = useCallback((question: string) => {
    const keywords = ['sandbox','Sandbox'];
    return keywords.some(k => question.toLowerCase().includes(k));
  }, []);

  const showEditor = () => setIsOpen(true);
  const hideEditor = () => setIsOpen(false);

  const runCode = async () => {
    setOutput('Running...');
    try {
      const user = auth.currentUser;
      if (!user) {
        setOutput('Error: Please log in to run code');
        return;
      }

      const token = await user.getIdToken();
      
      const backendUrl = getBackendUrl();
      console.log('Calling:', backendUrl); 
      
      const res = await fetch(backendUrl, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ code, language })
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || `HTTP ${res.status}`);
      }
      
      const result = await res.json();
      setOutput(result.output || result.error || 'No output');
    } catch (error: any) {
      setOutput(`Error: ${error.message}`);
      console.error('Code execution failed:', error);
    }
  };

  return {
    detectCodeQuestion,
    showEditor,
    hideEditor,
    runCode,
    isOpen,
    code,
    setCode,
    output,
    language,
    setLanguage
  };
};
