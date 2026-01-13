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
  const joyrideStyles = {
    options: {
      zIndex: 10000,
      primaryColor: 'var(--accent-primary)',
      textColor: 'var(--text-primary)',
      backgroundColor: 'var(--bg-elevated)',
      arrowColor: 'var(--bg-elevated)',
      overlayColor: 'rgba(0, 0, 0, 0.4)',
    },
    tooltip: {
      borderRadius: '8px',
      fontFamily: 'inherit',
      backgroundColor: 'var(--bg-elevated)',
      color: 'var(--text-primary)',
      border: '1px solid var(--border-subtle)',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
    },
    buttonNext: {
      backgroundColor: 'var(--accent-primary)',
      color: '#fff',
      borderRadius: '6px',
      outline: 'none',
      fontWeight: 500,
      padding: '8px 16px',
    },
    buttonBack: {
      color: 'var(--text-secondary)',
      marginRight: '10px',
      fontWeight: 400,
    },
    buttonSkip: {
      color: 'var(--text-muted)',
      fontWeight: 400,
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
