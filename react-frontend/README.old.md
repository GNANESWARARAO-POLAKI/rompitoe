# React Frontend for Rompit OE (Online Exam Platform)

This frontend provides the user interface for the Rompit OE online exam platform built with React and TypeScript.

## Setup Instructions

1. Install dependencies:
   ```
   npm install
   ```

2. Start the development server:
   ```
   npm start
   ```

The application will start on http://localhost:3000

## Project Structure

- `src/components/`: React components
  - `Login.tsx`: Login screen
  - `ExamLayout.tsx`: Main exam layout
  - `QuestionCard.tsx`: Question display
  - `SidePanelNavigator.tsx`: Navigation panel
- `src/services/`: API services
  - `api.ts`: API service for backend communication
- `src/types/`: TypeScript interfaces
  - `index.ts`: Type definitions
- `src/context/`: React Context for state management
  - `ExamContext.tsx`: Exam state management

## Features

- User login
- Multi-section exam with MCQ questions
- Question navigation
- Marking questions for review
- Exam submission

## Development

This project was bootstrapped with Create React App using the TypeScript template.