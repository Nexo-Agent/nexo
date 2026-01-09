import React from 'react';
import Joyride, { CallBackProps, STATUS, ACTIONS, EVENTS } from 'react-joyride';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '@/app/store';
import { setStepIndex, stopTour, completeTour } from '../onboardingSlice';
import { ONBOARDING_STEPS } from '../config';
import {
  navigateToSettings,
  setSettingsSection,
  navigateToChat,
} from '@/features/ui/state/uiSlice';

const OnboardingGuide: React.FC = () => {
  const dispatch = useDispatch();
  const { isRunning, activeTour, stepIndex } = useSelector(
    (state: RootState) => state.onboarding
  );

  const steps = activeTour ? ONBOARDING_STEPS[activeTour] : [];

  // Define theme colors using CSS variables
  // Note: Joyride accepts inline styles object, so we use var() to hook into existing theme system
  const joyrideStyles = {
    options: {
      zIndex: 10000, // Maximize z-index to stay above all dialogs
      primaryColor: '#8b5cf6', // A purple accent fallback
      textColor: '#e5e7eb', // Text color fallback (dark mode friendly)
      backgroundColor: '#1f2937', // Background fallback
      arrowColor: '#1f2937',
      overlayColor: 'rgba(0, 0, 0, 0.5)',
    },
    tooltip: {
      borderRadius: '12px',
      fontFamily: 'inherit',
      backgroundColor: 'var(--color-bg-secondary, #1f2937)',
      color: 'var(--color-text-primary, #ffffff)',
      border: '1px solid var(--color-border-primary, #374151)',
      boxShadow:
        '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    },
    buttonNext: {
      backgroundColor: 'var(--color-primary-600, #7c3aed)',
      color: '#fff',
      borderRadius: '6px',
      outline: 'none',
      fontWeight: 500,
    },
    buttonBack: {
      color: 'var(--color-text-secondary, #9ca3af)',
      marginRight: '10px',
    },
    buttonSkip: {
      color: 'var(--color-text-tertiary, #6b7280)',
    },
    beacon: {
      // Customize beacon if needed
    },
  };

  const handleCallback = (data: CallBackProps) => {
    const { action, index, status, type } = data;

    if (type === EVENTS.STEP_AFTER) {
      const newIndex = index + (action === ACTIONS.PREV ? -1 : 1);

      // Handle custom actions defined in step data when moving forward
      if (action === ACTIONS.NEXT) {
        const currentStep = steps[index];
        const onNextAction = currentStep?.data?.onNextAction;

        if (onNextAction) {
          // Perform the UI action
          if (onNextAction === 'OPEN_SETTINGS') {
            dispatch(navigateToSettings());
          } else if (onNextAction === 'OPEN_LLM_TAB') {
            dispatch(setSettingsSection('llm'));
          } else if (onNextAction === 'CLOSE_SETTINGS') {
            dispatch(navigateToChat());
          } else if (onNextAction === 'CLICK_ADD_CONNECTION') {
            (
              document.querySelector(
                '[data-tour="llm-add-btn"]'
              ) as HTMLElement | null
            )?.click();
          } else if (onNextAction === 'CLICK_SAVE_CONNECTION') {
            (
              document.querySelector(
                '[data-tour="llm-save-btn"]'
              ) as HTMLElement | null
            )?.click();
          } else if (onNextAction === 'CLICK_WORKSPACE_ADD') {
            (
              document.querySelector(
                '[data-tour="workspace-add-btn"]'
              ) as HTMLElement | null
            )?.click();
          }

          // Delay the step transition to allow UI to render (Settings page transition)
          setTimeout(() => {
            if (onNextAction === 'CLICK_SAVE_CONNECTION') {
              dispatch(navigateToSettings());
            }
            dispatch(setStepIndex(newIndex));
          }, 1000);
          return; // Skip immediate transition
        }
      }

      // Default immediate transition
      if (action === ACTIONS.NEXT || action === ACTIONS.PREV) {
        dispatch(setStepIndex(newIndex));
      }
    }

    if (([STATUS.FINISHED, STATUS.SKIPPED] as string[]).includes(status)) {
      if (activeTour) dispatch(completeTour(activeTour));
    } else if (action === ACTIONS.CLOSE) {
      dispatch(stopTour());
    }
  };

  return (
    <Joyride
      steps={steps}
      run={isRunning}
      stepIndex={stepIndex}
      continuous
      showProgress
      showSkipButton
      callback={handleCallback}
      styles={joyrideStyles}
      floaterProps={{
        disableAnimation: true, // Sometimes helps with positioning
      }}
      locale={{
        back: 'Quay lại',
        close: 'Đóng',
        last: 'Hoàn tất',
        next: 'Tiếp tục',
        skip: 'Bỏ qua',
      }}
    />
  );
};

export default OnboardingGuide;
