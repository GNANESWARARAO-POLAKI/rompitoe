import React, { createContext, useState, useContext, ReactNode } from 'react';
import { 
  User, 
  ExamData, 
  QuestionState, 
  AnswersMap, 
  Section,
  Question
} from '../types';

interface ExamContextType {
  // User state
  user: User | null;
  setUser: (user: User | null) => void;
  // defaultProfilePicture?: "https://i.pinimg.com/736x/d6/64/b2/d664b27cca7eaf4d64c41622b5bb9b6c.jpg";
  // Exam data
  examData: ExamData | null;
  setExamData: (data: ExamData | null) => void;
  
  // Current section and question
  currentSectionId: number;
  setCurrentSectionId: (id: number) => void;
  currentQuestionId: number;
  setCurrentQuestionId: (id: number) => void;
  
  // Question states
  questionStates: QuestionState[];
  updateQuestionState: (questionId: number, status: QuestionState['status'], answer?: string) => void;
  
  // Navigation
  goToNextQuestion: () => void;
  goToPreviousQuestion: () => void;
  goToQuestion: (sectionId: number, questionId: number) => void;
  
  // Submission
  getAnswersMap: () => AnswersMap;
  
  // Helper methods
  getCurrentSection: () => Section | undefined;
  getCurrentQuestion: () => Question | undefined;
  getSectionQuestions: (sectionId: number) => Question[];
  getRemainingTime: () => number;
  // Reset exam start time to now (useful when starting fresh)
  resetExamStartTime: () => void;
}

const ExamContext = createContext<ExamContextType | undefined>(undefined);

export const ExamProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // User state - initialize from localStorage if available
  const [user, setUser] = useState<User | null>(() => {
    const storedUser = localStorage.getItem('user');
    return storedUser ? JSON.parse(storedUser) : null;
  });
  
  // Exam data
  const [examData, setExamData] = useState<ExamData | null>(null);
  
  // Current section and question
  const [currentSectionId, setCurrentSectionId] = useState<number>(1);
  const [currentQuestionId, setCurrentQuestionId] = useState<number>(1);
  
  // Question states
  const [questionStates, setQuestionStates] = useState<QuestionState[]>(() => {
    // Try to load from localStorage first
    const savedStates = localStorage.getItem('questionStates');
    return savedStates ? JSON.parse(savedStates) : [];
  });
  
  // Time management
  // Exam duration (ms) - change if you want different duration
  const examDuration = 3 * 60 * 60 * 1000; // 3 hours in milliseconds

  // Initialize examStartTime. If there's a saved start time in localStorage and it
  // is still within the exam duration window, reuse it. Otherwise start a new timer.
  const [examStartTime, setExamStartTime] = useState<number>(() => {
    const saved = localStorage.getItem('examStartTime');
    const now = Date.now();
    if (saved) {
      const parsed = parseInt(saved, 10);
      if (!isNaN(parsed) && (now - parsed) < examDuration) {
        return parsed;
      }
    }
    // No valid saved start time or it expired -> use now
    try {
      localStorage.setItem('examStartTime', now.toString());
    } catch (e) {
      // ignore localStorage failures
    }
    return now;
  });

  // Keep localStorage in sync when examStartTime changes
  React.useEffect(() => {
    try {
      localStorage.setItem('examStartTime', examStartTime.toString());
    } catch (e) {
      // ignore localStorage failures
    }
  }, [examStartTime]);
  
  // Load exam data if user is already authenticated
  React.useEffect(() => {
    const loadExamData = async () => {
      if (user && !examData && localStorage.getItem('token')) {
        try {
          const data = await fetch('http://localhost:5000/questions', {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
          });
          
          if (data.ok) {
            const examData = await data.json();
            setExamData(examData);
          }
        } catch (error) {
          console.error('Failed to load exam data:', error);
        }
      }
    };
    
    loadExamData();
  }, [user, examData]);
  
  // Initialize question states when exam data is loaded
  React.useEffect(() => {
    if (examData) {
      // Check if we have saved states in localStorage
      const savedStates = localStorage.getItem('questionStates');
      
      if (savedStates && JSON.parse(savedStates).length > 0) {
        // If we have saved states, use them
        setQuestionStates(JSON.parse(savedStates));
      } else {
        // Otherwise, initialize new states
        const states: QuestionState[] = [];
        
        examData.sections.forEach(section => {
          section.questions.forEach(question => {
            states.push({
              id: question.id,
              status: 'not-visited'
            });
          });
        });
        
        setQuestionStates(states);
        localStorage.setItem('questionStates', JSON.stringify(states));
      }
      
      // Initialize current section and question if they're not already set
      if (currentSectionId === 1 && currentQuestionId === 1 && examData.sections.length > 0) {
        const firstSection = examData.sections[0];
        if (firstSection && firstSection.questions.length > 0) {
          setCurrentSectionId(firstSection.id);
          setCurrentQuestionId(firstSection.questions[0].question_id);
        }
      }

      // If the saved exam start time (in localStorage) is missing or expired for
      // this new exam data, reset it so the timer starts fresh and doesn't show 00:00:00.
      const now = Date.now();
      if ((now - examStartTime) >= examDuration) {
        setExamStartTime(now);
        try {
          localStorage.setItem('examStartTime', now.toString());
        } catch (e) {
          // ignore localStorage errors
        }
      }
    }
  }, [examData, currentSectionId, currentQuestionId, setCurrentSectionId, setCurrentQuestionId]);
  
  // Helper method to get current section
  const getCurrentSection = (): Section | undefined => {
    return examData?.sections.find(section => section.id === currentSectionId);
  };
  
  // Helper method to get current question
  const getCurrentQuestion = (): Question | undefined => {
    const section = getCurrentSection();
    return section?.questions.find(q => q.question_id === currentQuestionId);
  };
  
  // Helper method to get all questions in a section
  const getSectionQuestions = (sectionId: number): Question[] => {
    const section = examData?.sections.find(s => s.id === sectionId);
    return section?.questions || [];
  };
  
  // Update question state
  const updateQuestionState = (
    questionId: number, 
    status: QuestionState['status'], 
    answer?: string
  ) => {
    setQuestionStates(prevStates => {
      const newStates = [...prevStates];
      const index = newStates.findIndex(state => state.id === questionId);
      
      if (index !== -1) {
        // If answer is explicitly undefined, remove the answer field (clear it)
        // Otherwise, update with the new answer value
        if (answer === undefined) {
          const { answer: _, ...restState } = newStates[index];
          newStates[index] = {
            ...restState,
            status
          };
        } else {
          newStates[index] = {
            ...newStates[index],
            status,
            answer
          };
        }
      }
      
      // Save to localStorage
      localStorage.setItem('questionStates', JSON.stringify(newStates));
      
      return newStates;
    });
  };
  
  // Navigation methods
  const goToNextQuestion = () => {
    const currentSection = getCurrentSection();
    if (!currentSection) return;
    
    // Mark current question as not-answered if it's not answered yet
    const currentQuestion = getCurrentQuestion();
    if (currentQuestion) {
      const state = questionStates.find(s => s.id === currentQuestion.id);
      if (state && state.status === 'not-visited') {
        updateQuestionState(currentQuestion.id, 'not-answered');
      }
    }
    
    const sectionQuestions = currentSection.questions;
    const currentIndex = sectionQuestions.findIndex(q => q.question_id === currentQuestionId);
    
    if (currentIndex < sectionQuestions.length - 1) {
      // Go to next question in same section
      setCurrentQuestionId(sectionQuestions[currentIndex + 1].question_id);
    } else if (currentSectionId < (examData?.sections.length || 0)) {
      // Go to first question of next section
      const nextSectionId = currentSectionId + 1;
      setCurrentSectionId(nextSectionId);
      const nextSection = examData?.sections.find(s => s.id === nextSectionId);
      if (nextSection && nextSection.questions.length > 0) {
        setCurrentQuestionId(nextSection.questions[0].question_id);
      }
    }
  };
  
  const goToPreviousQuestion = () => {
    const currentSection = getCurrentSection();
    if (!currentSection) return;
    
    // Mark current question as not-answered if it's not answered yet
    const currentQuestion = getCurrentQuestion();
    if (currentQuestion) {
      const state = questionStates.find(s => s.id === currentQuestion.id);
      if (state && state.status === 'not-visited') {
        updateQuestionState(currentQuestion.id, 'not-answered');
      }
    }
    
    const sectionQuestions = currentSection.questions;
    const currentIndex = sectionQuestions.findIndex(q => q.question_id === currentQuestionId);
    
    if (currentIndex > 0) {
      // Go to previous question in same section
      setCurrentQuestionId(sectionQuestions[currentIndex - 1].question_id);
    } else if (currentSectionId > 1) {
      // Go to last question of previous section
      const prevSectionId = currentSectionId - 1;
      setCurrentSectionId(prevSectionId);
      const prevSection = examData?.sections.find(s => s.id === prevSectionId);
      if (prevSection && prevSection.questions.length > 0) {
        setCurrentQuestionId(prevSection.questions[prevSection.questions.length - 1].question_id);
      }
    }
    // If we're at the first question of the first section, do nothing
  };
  
  const goToQuestion = (sectionId: number, questionId: number) => {
    setCurrentSectionId(sectionId);
    setCurrentQuestionId(questionId);
    
    // Update status if not visited
    const currentQuestion = examData?.sections
      .find(s => s.id === sectionId)
      ?.questions.find(q => q.question_id === questionId);
      
    if (currentQuestion) {
      const state = questionStates.find(s => s.id === currentQuestion.id);
      if (state && state.status === 'not-visited') {
        updateQuestionState(currentQuestion.id, 'not-answered');
      }
    }
  };
  
  // Get answers map for submission
  const getAnswersMap = (): AnswersMap => {
    const answersMap: AnswersMap = {};
    
    questionStates.forEach(state => {
      if (state.answer) {
        answersMap[state.id.toString()] = state.answer;
      }
    });
    
    return answersMap;
  };
  
  // Get remaining time
  const getRemainingTime = (): number => {
    const elapsed = Date.now() - examStartTime;
    return Math.max(0, examDuration - elapsed);
  };

  const resetExamStartTime = () => {
    const now = Date.now();
    setExamStartTime(now);
    try {
      localStorage.setItem('examStartTime', now.toString());
    } catch (e) {
      // ignore
    }
  };
  
  const value: ExamContextType = {
    user,
    setUser,
    examData,
    setExamData,
    currentSectionId,
    setCurrentSectionId,
    currentQuestionId,
    setCurrentQuestionId,
    questionStates,
    updateQuestionState,
    goToNextQuestion,
    goToPreviousQuestion,
    goToQuestion,
    getAnswersMap,
    getCurrentSection,
    getCurrentQuestion,
    getSectionQuestions,
    getRemainingTime
    ,
    resetExamStartTime
  };
  
  return <ExamContext.Provider value={value}>{children}</ExamContext.Provider>;
};

export const useExam = (): ExamContextType => {
  const context = useContext(ExamContext);
  if (context === undefined) {
    throw new Error('useExam must be used within an ExamProvider');
  }
  return context;
};

export default ExamContext;