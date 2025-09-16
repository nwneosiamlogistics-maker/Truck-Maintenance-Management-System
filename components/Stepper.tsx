import React from 'react';

interface StepperProps {
  steps: string[];
  currentStep: number;
  onStepClick: (stepIndex: number) => void;
}

const Stepper: React.FC<StepperProps> = ({ steps, currentStep, onStepClick }) => {
  return (
    <div className="flex items-center justify-between w-full">
      {steps.map((step, index) => {
        const isCompleted = currentStep > index;
        const isCurrent = currentStep === index;
        
        return (
          <React.Fragment key={index}>
            <div className="flex items-center flex-col cursor-pointer" onClick={() => onStepClick(index)}>
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold transition-all duration-300
                  ${isCompleted ? 'bg-blue-600 text-white' : ''}
                  ${isCurrent ? 'border-2 border-blue-600 text-blue-600 bg-white' : ''}
                  ${!isCompleted && !isCurrent ? 'bg-gray-200 text-gray-500' : ''}
                `}
              >
                {isCompleted ? '✓' : index + 1}
              </div>
              <p className={`mt-2 text-sm text-center font-semibold transition-colors duration-300 ${isCurrent ? 'text-blue-600' : 'text-gray-600'}`}>
                {step}
              </p>
            </div>
            {index < steps.length - 1 && (
              <div className={`flex-1 h-1 mx-2 rounded transition-colors duration-300 ${isCompleted ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

export default Stepper;
